// app/api/stripe/checkout/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { stripe } from '@/lib/stripe-server';

export async function POST() {
  console.log("📩 Stripe checkout request received...");

  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("❌ User not authenticated:", error?.message);
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  console.log("👤 Authenticated User:", {
    id: user.id,
    email: user.email,
  });

  console.log("🌐 NEXT_PUBLIC_SITE_URL =", process.env.NEXT_PUBLIC_SITE_URL);
  console.log("💵 Using Stripe Price ID =", process.env.STRIPE_PRO_PRICE_ID);

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    console.error("❌ Missing NEXT_PUBLIC_SITE_URL in environment.");
  }

  if (!process.env.STRIPE_PRO_PRICE_ID) {
    console.error("❌ Missing STRIPE_PRO_PRICE_ID in environment.");
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/${user.id}?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/${user.id}`,
    });

    console.log("✅ Stripe checkout session created:", session.id);
    console.log("➡️ Redirect URL:", session.url);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("🔥 Stripe checkout ERROR ------------------");
    console.error("Error Type:", err?.type);
    console.error("Message:", err?.message);
    console.error("Param:", err?.param);
    console.error("Request ID:", err?.requestId);
    console.error("Full Error:", err);
    console.error("------------------------------------------------");

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
