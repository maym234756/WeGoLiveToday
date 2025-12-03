// apps/web/app/admin/(protected)/streams/page.tsx
import { Section } from '@/app/admin/_components/Section'
import ExportButton from '@/app/admin/_components/ExportButton'


type Search = {
  q?: string
  status?: 'any' | 'live' | 'vod'
  category?: 'any' | 'IRL' | 'Gaming' | 'Music' | 'Coding'
}

export default function StreamsPage({
  searchParams,
}: {
  searchParams: Search
}) {
  const q = searchParams.q ?? ''
  const status = (searchParams.status ?? 'any') as NonNullable<Search['status']>
  const category = (searchParams.category ?? 'any') as NonNullable<Search['category']>
  
  // (Fake) results — later, query your DB/analytics using the search params above
  const rows = Array.from({ length: 12 }).map((_, i) => ({
    id: i + 1,
    title: `Stream #${i + 1}`,
    creator: `creator${i + 1}`,
    category: ['IRL', 'Gaming', 'Music', 'Coding'][i % 4],
    viewers: Math.floor(40 + Math.random() * 950),
    tokens: Math.floor(50 + Math.random() * 500),
    started: 'now',
    live: i % 3 !== 0,
  }))
  .filter(r => (q ? `${r.title} ${r.creator}`.toLowerCase().includes(q.toLowerCase()) : true))
  .filter(r => (status === 'any' ? true : status === 'live' ? r.live : !r.live))
  .filter(r => (category === 'any' ? true : r.category === category))

  return (
    <div className="space-y-6">
      <Section title="Streams">
        {/* Server-safe GET form, no onSubmit handler needed */}
        <form
          method="GET"
          role="search"
          aria-label="Filter streams"
          className="mb-3 flex flex-wrap items-center gap-2"
        >
          <div className="relative">
            <label htmlFor="q" className="sr-only">Search streams</label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Search streams…"
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="relative">
            <label htmlFor="category" className="sr-only">Category</label>
            <select
              id="category"
              name="category"
              defaultValue={category}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200"
            >
              <option value="any">Any category</option>
              <option value="IRL">IRL</option>
              <option value="Gaming">Gaming</option>
              <option value="Music">Music</option>
              <option value="Coding">Coding</option>
            </select>
          </div>

          <div className="relative">
            <label htmlFor="status" className="sr-only">Status</label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200"
            >
              <option value="any">Status: Live & VOD</option>
              <option value="live">Live only</option>
              <option value="vod">VOD only</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            title="Apply filters"
          >
            Search
          </button>
        </form>

        <div className="overflow-auto">
          <table className="min-w-[760px] w-full text-sm">
            <caption className="sr-only">Streams results</caption>
            <thead className="text-left text-zinc-400">
              <tr className="border-b border-zinc-800">
                <th scope="col" className="py-2 pr-3">Stream</th>
                <th scope="col" className="py-2 pr-3">Creator</th>
                <th scope="col" className="py-2 pr-3">Category</th>
                <th scope="col" className="py-2 pr-3">Viewers</th>
                <th scope="col" className="py-2 pr-3">Tokens</th>
                <th scope="col" className="py-2 pr-3">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-900/40">
                  <td className="py-2 pr-3">{r.title}</td>
                  <td className="py-2 pr-3">{r.creator}</td>
                  <td className="py-2 pr-3">{r.category}</td>
                  <td className="py-2 pr-3">{r.viewers.toLocaleString()}</td>
                  <td className="py-2 pr-3">{r.tokens.toLocaleString()}</td>
                  <td className="py-2 pr-3">{r.started}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-zinc-400">
                    No streams match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
