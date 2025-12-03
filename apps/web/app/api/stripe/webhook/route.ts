import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ✅ Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});


// ✅ Initialize Supabase with service role key (required for updating auth.users)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🔁 Required for Next.js API route to disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

// ✅ Helper to get raw body from readable stream
async function getRawBody(readable: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

// ✅ Main handler
export async function POST(req: Request) {
  const sig = headers().get('stripe-signature')!;
  const body = await getRawBody(req.body!);

  let event: Stripe.Event;

  // 🚫 Verify Stripe signature
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('❌ Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // ✅ Handle checkout success
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.user_id;
    const customerEmail = session.customer_email;

    if (!userId || !customerEmail) {
      console.error('❌ Missing user_id or customer_email in Stripe session metadata');
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    try {
      // ✅ 1. Update custom "User Signup List" table
      const { error: tableError } = await supabase
        .from('User Signup List')
        .update({
          is_pro: true,
          upgraded_at: new Date().toISOString(),
        })
        .eq('uuid', userId);

      if (tableError) {
        console.error('❌ Failed to update User Signup List:', tableError.message);
        return NextResponse.json({ error: tableError.message }, { status: 500 });
      }

      // ✅ 2. Update auth.users metadata
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { pro: true },
      });

      if (authError) {
        console.error('❌ Failed to update user metadata:', authError.message);
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }

      console.log(`✅ User ${userId} successfully upgraded (table + metadata)`);
    } catch (err: any) {
      console.error('🔥 Unexpected error handling webhook:', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ✅ Respond to Stripe
  return NextResponse.json({ received: true });
}
