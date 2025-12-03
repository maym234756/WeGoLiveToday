// apps/web/app/admin/(protected)/reports/ReportControls.tsx
'use client'

import { useState } from 'react'

type ReportType =
  | 'revenue-by-creator'
  | 'daily-revenue'
  | 'token-utilization'
  | 'churn-cohort'

export default function ReportControls() {
  const [type, setType] = useState<ReportType>('revenue-by-creator')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // TODO: Wire this to a server action or router push with query params.
    // For now, just demo:
    alert(`Generate: ${type}\nFrom: ${from || '(not set)'}\nTo: ${to || '(not set)'}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Report filters"
      className="mb-4 flex flex-wrap items-end gap-2"
    >
      <div className="flex flex-col">
        <label htmlFor="report-type" className="text-sm text-zinc-300">
          Report type
        </label>
        <select
          id="report-type"
          value={type}
          onChange={(e) => setType(e.target.value as ReportType)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200"
        >
          <option value="revenue-by-creator">Revenue by creator</option>
          <option value="daily-revenue">Daily revenue</option>
          <option value="token-utilization">Token utilization</option>
          <option value="churn-cohort">Churn cohort</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="from-date" className="text-sm text-zinc-300">
          From
        </label>
        <input
          id="from-date"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200"
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="to-date" className="text-sm text-zinc-300">
          To
        </label>
        <input
          id="to-date"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
      >
        Generate
      </button>
    </form>
  )
}
