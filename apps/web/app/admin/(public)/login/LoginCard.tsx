// apps/web/app/admin/(public)/login/LoginCard.tsx
'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginCard() {
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp?.get('next') ?? '/admin/(protected)/'

  const [pw, setPw] = React.useState('')
  const [show, setShow] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })

      if (!res.ok) {
        const msg = (await res.text()) || 'Invalid password'
        throw new Error(msg)
      }

      // success – take the user to the requested page
      router.replace(next)
      router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? 'Sign-in failed')
      setLoading(false)
    }
  }

  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
      <div className="mb-4">
        <div className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-lg font-semibold tracking-tight text-white">WeGoLive</span>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-white">Admin sign-in</h1>
        <p className="mt-1 text-sm text-zinc-400">Restricted area — authorized personnel only.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="admin-password" className="text-sm text-zinc-300">
            Admin password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              name="password"
              type={show ? 'text' : 'password'}
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 pr-10 text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-0 px-3 text-zinc-400 hover:text-zinc-200 focus:outline-none"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3.53 2.47a.75.75 0 011.06 0l12.94 12.94a.75.75 0 11-1.06 1.06l-2.16-2.16A9.9 9.9 0 0110 16.5C5.52 16.5 2 13.36.86 10.76a1.7 1.7 0 010-1.52c.53-1.13 1.44-2.32 2.64-3.3L3.53 2.47zm6.91 6.91l-3.82-3.82A3.5 3.5 0 0110 6.5c1.93 0 3.5 1.57 3.5 3.5 0 .5-.1.98-.29 1.38l-2.77-2.77z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 3.5c4.48 0 8 3.14 9.14 5.74.24.51.24 1.1 0 1.52C18 13.36 14.48 16.5 10 16.5S2 13.36.86 10.76a1.7 1.7 0 010-1.52C2 6.64 5.52 3.5 10 3.5zm0 3A3.5 3.5 0 1010 13a3.5 3.5 0 000-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {err && (
          <p className="text-sm text-red-400" role="alert">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || pw.length === 0}
          className="btn btn-primary w-full disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-xs text-zinc-500">
          Tip: this form posts to <code className="text-zinc-400"></code> and
          sets a secure session cookie.
        </p>
      </form>
    </div>
  )
}
