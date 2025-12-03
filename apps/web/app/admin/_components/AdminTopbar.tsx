'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminTopbar() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h')

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    // Example search routing (adapt as needed)
    if (q.trim()) router.push(`/admin/streams?query=${encodeURIComponent(q.trim())}`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <form onSubmit={onSearch} className="flex min-w-0 flex-1 items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search streams, creators, ids…"
            className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500"
            aria-label="Date range"
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
          <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            Viewer dashboard
          </Link>
          <form action="/api/admin/logout" method="post">
            <button className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
