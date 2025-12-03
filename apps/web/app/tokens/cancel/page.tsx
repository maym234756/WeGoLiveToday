import Link from 'next/link'

export const metadata = { title: 'Checkout canceled · WeGoLive' }

export default function Cancel() {
  return (
    <div className="page-pad mx-auto max-w-lg py-10">
      <h1 className="text-2xl font-semibold text-white">Checkout canceled</h1>
      <p className="mt-2 text-zinc-300">No worries—choose another bundle when you’re ready.</p>

      <div className="mt-6 flex gap-3">
        <Link href="/tokens" className="btn btn-primary">Back to bundles</Link>
        <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
      </div>
    </div>
  )
}
