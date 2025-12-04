// apps/web/app/api/stripe/webhook/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ✅ App Router segment config (recommended)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Init Stripe (server-side)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

// Service role client (server-only)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // <- use the correct name
)



export async function POST(req: Request) {
  const sig = headers().get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  // ⚠️ Important: use raw text (no JSON parsing) for Stripe verification
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

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.user_id;
    const customerEmail = session.customer_email;

    if (!userId || !customerEmail) {
      console.error('❌ Missing user_id or customer_email in metadata.');
      return NextResponse.json({ error: 'Missing required metadata' }, { status: 400 });
    }

    try {
      // Update your public user table
      const { error: tableError } = await supabase
        .from('User Signup List')
        .update({
          is_pro: true,
          upgraded_at: new Date().toISOString(),
        })
        .eq('uuid', userId);

      if (tableError) {
        console.error('❌ Failed to update table:', tableError.message);
        return NextResponse.json({ error: tableError.message }, { status: 500 });
      }

      // Also update Auth user metadata (requires service-role key)
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { pro: true },
      });

      if (authError) {
        console.error('❌ Failed to update auth metadata:', authError.message);
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }

      console.log(`✅ User ${userId} upgraded (DB + Auth).`);
    } catch (err: any) {
      console.error('🔥 Webhook processing error:', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
