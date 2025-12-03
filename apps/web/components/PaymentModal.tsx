'use client'

import { useEffect, useState } from 'react'
import {
  PaymentRequestButtonElement,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

import { Dialog } from '@headlessui/react'
import { Bundle } from '../types/bundle'
import { countries } from '../lib/countries'

export default function PaymentModal({
  bundle,
  onClose,
}: {
  bundle: Bundle
  onClose: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('United States')
  const [zip, setZip] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [paymentRequest, setPaymentRequest] = useState<any>(null)
  const [canUseApplePay, setCanUseApplePay] = useState(false)

  // Apply styling to Stripe elements
  const elementStyle = {
    style: {
      base: {
        fontSize: '14px',
        color: '#fff',
        fontFamily: 'inherit',
        '::placeholder': { color: '#9ca3af' },
      },
      invalid: { color: '#f87171' },
    },
  }

  // ------------------------------------------------------------
  // 🍎 Set up Apple Pay / Google Pay (Payment Request Button)
  // ------------------------------------------------------------
  useEffect(() => {
    if (!stripe) return

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: `${bundle.name} Bundle`,
        amount: Math.round(bundle.price * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    })

    pr.canMakePayment().then((result) => {
      if (result) {
        setCanUseApplePay(true)
        setPaymentRequest(pr)
      }
    })
  }, [stripe, bundle])

  // ------------------------------------------------------------
  // 💳 Handle regular card checkout
  // ------------------------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!stripe || !elements) {
      setError('Stripe is not loaded.')
      setLoading(false)
      return
    }

    const card = elements.getElement(CardNumberElement)
    if (!card) {
      setError('Card element not found.')
      setLoading(false)
      return
    }

    const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
      type: 'card',
      card,
      billing_details: {
        name: `${firstName} ${lastName}`,
        email,
        address: {
          country,
          postal_code: zip,
        },
      },
    })

    if (pmError || !paymentMethod) {
      setError(pmError?.message || 'Payment method creation failed.')
      setLoading(false)
      return
    }

    // Send to backend
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id,
        bundleId: bundle.id,
        email,
      }),
    })

    const { success, message } = await res.json()

    if (success) {
      onClose()
      alert(`🎉 Successfully purchased ${bundle.tokens.toLocaleString()} tokens!`)
    } else {
      setError(message || 'Payment failed. Try again.')
    }

    setLoading(false)
  }

  return (
    <Dialog open onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-lg bg-zinc-900 p-6 text-white shadow-2xl">
          
          {/* Header */}
          <Dialog.Title className="text-xl font-semibold mb-6">
            Complete Your Purchase
          </Dialog.Title>

          {/* Summary */}
          <div className="mb-6 rounded border border-zinc-800 bg-zinc-950 p-4 text-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-zinc-300 font-medium">{bundle.name} Bundle</p>
                <p className="text-zinc-500 text-xs mt-1">
                  {bundle.tokens.toLocaleString()} tokens
                  {bundle.bonus ? ` + ${bundle.bonus} bonus` : ''}
                </p>
              </div>
              <p className="text-indigo-400 font-semibold text-base">
                ${bundle.price.toFixed(2)}
              </p>
            </div>
          </div>

          {/* 🍎 Express Checkout */}
          {canUseApplePay && paymentRequest && (
            <section className="mb-8">
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">
                Express Checkout
              </h3>
              <PaymentRequestButtonElement
                options={{ paymentRequest }}
                className="w-full rounded overflow-hidden"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Supports Apple Pay, Google Pay & Link.
              </p>
            </section>
          )}

          {/* Email */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">Contact Email</h3>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            />
          </section>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-8 text-sm">

            {/* Billing */}
            <section>
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">Billing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                />

                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                />

                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>

                <input
                  required
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="ZIP / Postal Code"
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                />
              </div>
            </section>

            {/* Card Info */}
            <section>
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">Card Information</h3>

              <div className="space-y-4">

                <div className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
                  <CardNumberElement options={elementStyle} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
                    <CardExpiryElement options={elementStyle} />
                  </div>
                  <div className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
                    <CardCvcElement options={elementStyle} />
                  </div>
                </div>

              </div>
            </section>

            {/* Error */}
            {error && <p className="text-sm text-red-400">{error}</p>}

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-semibold rounded text-white disabled:opacity-50"
              >
                {loading ? 'Processing…' : `Pay $${bundle.price.toFixed(2)}`}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
