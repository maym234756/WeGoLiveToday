import Link from 'next/link'

export const metadata = { title: 'Payment successful · WeGoLive' }

export default function Success() {
  return (
    <div className="page-pad mx-auto max-w-lg py-10">
      <h1 className="text-2xl font-semibold text-white">Thank you!</h1>
      <p className="mt-2 text-zinc-300">Your tokens will be available shortly.</p>

      <div className="mt-6 flex gap-3">
        <Link href="/dashboard" className="btn btn-primary">Go to dashboard</Link>
        <Link href="/tokens" className="btn btn-ghost">Back to bundles</Link>
      </div>
    </div>
  )
}
