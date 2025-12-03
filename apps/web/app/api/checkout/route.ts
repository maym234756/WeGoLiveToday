import { NextResponse } from 'next/server'

/**
 * Maps bundleId from frontend to Stripe Price IDs.
 * Define these in Stripe Dashboard → Products.
 */
const PRICE_MAP: Record<string, string> = {
  starter:   'price_123', // Replace with actual Stripe Price IDs
  bronze:    'price_456',
  silver:    'price_789',
  gold:      'price_abc',
  platinum:  'price_def',
}

export async function POST(req: Request) {
  try {
    const { bundleId, email } = await req.json()

    // Validate bundle
    const priceId = PRICE_MAP[bundleId]
    if (!priceId) {
      return NextResponse.json({ error: 'Unknown bundle selected.' }, { status: 400 })
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY in environment.' }, { status: 500 })
    }

    // Create Checkout Session via Stripe REST API
    const params = new URLSearchParams({
      mode: 'payment',
      success_url: `${BASE_URL}/tokens/success?bundle=${bundleId}`,
      cancel_url: `${BASE_URL}/tokens/cancel`,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
    })

    if (email) {
      params.set('customer_email', email) // pre-fills email in checkout
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    if (!stripeRes.ok) {
      const text = await stripeRes.text()
      return NextResponse.json({ error: text }, { status: 500 })
    }

    const session = await stripeRes.json() as { url?: string }

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[Stripe Checkout Error]', err)
    return NextResponse.json(
      { error: err?.message || 'Unexpected error occurred.' },
      { status: 500 }
    )
  }
}
