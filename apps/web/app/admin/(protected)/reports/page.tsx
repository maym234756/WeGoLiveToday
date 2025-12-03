// apps/web/app/admin/(protected)/reports/page.tsx
import type { Metadata } from 'next'
import { Section } from '@/app/admin/_components/Section'
import ReportControls from './ReportControls'

export const metadata: Metadata = {
  title: 'Reports · Admin — WeGoLive',
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <Section title="Reports">
        {/* Client-side filters / generator */}
        <ReportControls />

        {/* Results container */}
        <div
          className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4"
          role="region"
          aria-labelledby="report-results-heading"
        >
          <h2 id="report-results-heading" className="mb-3 text-sm font-semibold text-zinc-300">
            Results
          </h2>

          {/* Placeholder “no data” state */}
          <div
            className="flex h-56 items-center justify-center rounded-md border border-dashed border-zinc-800 bg-zinc-900/40 text-zinc-400"
            aria-live="polite"
          >
            Your generated report will render here (table / chart / download).
          </div>

          {/*
          // Example scaffold for a table result (uncomment when you have data)
          <div className="mt-4 overflow-auto">
            <table className="min-w-[760px] w-full text-sm" aria-label="Generated report table">
              <caption className="sr-only">Generated report</caption>
              <thead className="text-left text-zinc-400">
                <tr className="border-b border-zinc-800">
                  <th scope="col" className="py-2 pr-3">Creator</th>
                  <th scope="col" className="py-2 pr-3">Date</th>
                  <th scope="col" className="py-2 pr-3">Tokens</th>
                  <th scope="col" className="py-2 pr-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="hover:bg-zinc-900/40">
                    <th scope="row" className="py-2 pr-3 font-medium text-zinc-200">creator{i + 1}</th>
                    <td className="py-2 pr-3">2025-11-01</td>
                    <td className="py-2 pr-3">12,340</td>
                    <td className="py-2 pr-3">$1,230</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          // Example scaffold for a chart result (uncomment when you have data)
          <div className="mt-4 h-56 w-full text-emerald-400" role="img" aria-label="Report chart">
            <svg viewBox="0 0 400 160" className="h-full w-full" aria-hidden="true">
              <polyline fill="none" stroke="currentColor" strokeWidth="3"
                points="0,120 40,100 80,135 120,80 160,75 200,95 240,60 280,110 320,94 360,130 400,98"
              />
            </svg>
          </div>
          */}
        </div>
      </Section>
    </div>
  )
}
