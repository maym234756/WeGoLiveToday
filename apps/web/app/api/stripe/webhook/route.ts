// apps/web/app/api/stripe/webhook/route.ts

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const sig = headers().get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // ✅ Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.user_id;
    const customerEmail = session.customer_email;

    if (!userId || !customerEmail) {
      console.error('❌ Missing user_id or customer_email in metadata.');
      return NextResponse.json({ error: 'Missing required metadata' }, { status: 400 });
    }

    try {
      // ✅ Update your user table
      const { error: tableError } = await supabase
        .from('User Signup List') // Your main table
        .update({
          is_pro: true,
          upgraded_at: new Date().toISOString(),
        })
        .eq('uuid', userId);

      if (tableError) {
        console.error('❌ Failed to update User Signup List:', tableError.message);
        return NextResponse.json({ error: tableError.message }, { status: 500 });
      }

      // ✅ Optional: update subscriptions table if you created one
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('stripe_session_id', session.id);

      if (subError) {
        console.error('⚠️ Failed to update subscriptions table:', subError.message);
        // Don’t block the response if this fails — log it
      }

      // ✅ Update Auth metadata (for RBAC or nav locking logic)
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { pro: true },
      });

      if (authError) {
        console.error('❌ Failed to update Auth metadata:', authError.message);
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }

      console.log(`✅ [Stripe Webhook] User ${userId} upgraded to PRO.`);
    } catch (err: any) {
      console.error('🔥 Webhook processing error:', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
