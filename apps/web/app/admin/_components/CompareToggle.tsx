'use client'
import { useState } from 'react'

export default function CompareToggle({ onChange }:{ onChange:(enabled:boolean)=>void }) {
  const [on, setOn] = useState(false)
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
      <input
        type="checkbox"
        checked={on}
        onChange={(e)=>{ setOn(e.target.checked); onChange(e.target.checked) }}
        className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500"
      />
      Compare to previous period
    </label>
  )
}
