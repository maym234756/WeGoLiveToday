'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
type View = { name: string; url: string }

export default function SavedViews() {
  const path = usePathname()
  const sp = useSearchParams()
  const [views, setViews] = useState<View[]>([])
  const [name, setName] = useState('')

  const url = `${path}?${sp.toString()}`
  useEffect(() => {
    const key = `views:${path}`
    const raw = localStorage.getItem(key)
    setViews(raw ? JSON.parse(raw) : [])
  }, [path])

  const add = () => {
    if (!name.trim()) return
    const key = `views:${path}`
    const next = [...views, { name: name.trim(), url }]
    setViews(next)
    localStorage.setItem(key, JSON.stringify(next))
    setName('')
  }
  const remove = (i: number) => {
    const key = `views:${path}`
    const next = views.slice(); next.splice(i,1)
    setViews(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        placeholder="Save current filters as…"
        value={name}
        onChange={e => setName(e.target.value)}
        className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none"
      />
      <button type="button" onClick={add} className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500">Save view</button>

      {views.length > 0 && <span className="mx-2 text-xs text-zinc-500">Saved:</span>}
      {views.map((v, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          <a className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm hover:bg-zinc-800" href={v.url}>{v.name}</a>
          <button aria-label={`Delete ${v.name}`} onClick={() => remove(i)} className="text-zinc-500 hover:text-zinc-300">×</button>
        </span>
      ))}
    </div>
  )
}
