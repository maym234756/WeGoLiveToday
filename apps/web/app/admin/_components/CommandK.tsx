'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

export default function CommandK() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const items = useMemo(() => ([
    { label: 'Overview', href: '/admin' },
    { label: 'Streams', href: '/admin/streams' },
    { label: 'Creators', href: '/admin/creators' },
    { label: 'Tokens', href: '/admin/tokens' },
    { label: 'Reports', href: '/admin/reports' },
    { label: 'Settings', href: '/admin/settings' },
  ].filter(i => i.label.toLowerCase().includes(q.toLowerCase()))), [q])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] bg-black/50" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-24 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl" onClick={(e)=>e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Type a command…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-md bg-zinc-900 px-3 py-2 text-zinc-200 outline-none border border-zinc-800"
        />
        <ul className="max-h-64 overflow-auto pt-2">
          {items.length === 0 && <li className="px-3 py-2 text-sm text-zinc-500">No matches</li>}
          {items.map(i => (
            <li key={i.href}>
              <Link href={i.href} className="block rounded-md px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="px-3 pb-2 pt-1 text-[11px] text-zinc-500">Press Esc to close</div>
      </div>
    </div>
  )
}
