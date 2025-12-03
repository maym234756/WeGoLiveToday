import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Application received · WeGoLive',
}

export default function ApplySuccess() {
  return (
    <main className="min-h-[calc(100vh-0px)] px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-emerald-600/10 p-2">
          <svg viewBox="0 0 24 24" className="h-full w-full text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white">Application received</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Thanks for applying! Our team will review your submission within 24–48 hours and follow up via email.
        </p>

        <div className="mt-6 space-y-2">
          <Link href="/studio" className="btn btn-primary block">
            Go to Studio Dashboard
          </Link>
          <p className="text-sm text-zinc-400">
            Have questions? <Link href="/support" className="text-emerald-400 hover:text-emerald-300">Contact support</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
