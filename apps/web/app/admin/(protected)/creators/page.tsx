// apps/web/app/admin/(protected)/creators/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creators · Admin — WeGoLive',
};

type Creator = {
  id: string;
  name: string;
  streams: number;
  followers: number;
  tokens: number;
  status: 'live' | 'offline' | 'banned';
};

const DATA: Creator[] = [
  { id: 'creator1', name: 'creator1', streams: 112, followers: 15420, tokens: 83421, status: 'live' },
  { id: 'creator2', name: 'creator2', streams: 98, followers: 10432, tokens: 50110, status: 'offline' },
  { id: 'creator3', name: 'creator3', streams: 65, followers: 8801, tokens: 31820, status: 'offline' },
  { id: 'creator4', name: 'creator4', streams: 141, followers: 22045, tokens: 120544, status: 'live' },
  { id: 'creator5', name: 'creator5', streams: 12, followers: 965, tokens: 1540, status: 'banned' },
];

export default function CreatorsPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Creators</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage creator accounts, view performance, and take action.
          </p>
        </div>
      </header>

      {/* Toolbar / filters */}
      <section
        aria-labelledby="creator-filters-heading"
        className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
      >
        <h2 id="creator-filters-heading" className="sr-only">
          Creator filters
        </h2>
        <form
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
          aria-label="Filter creators"
        >
          {/* Search */}
          <div className="flex flex-col">
            <label htmlFor="creator-search" className="text-sm text-zinc-300">
              Search creators
            </label>
            <input
              id="creator-search"
              name="q"
              type="search"
              placeholder="Search creators…"
              aria-label="Search creators"
              title="Search creators"
              className="mt-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {/* Sort */}
          <div className="flex flex-col">
            <label htmlFor="creator-sort" className="text-sm text-zinc-300">
              Sort by
            </label>
            <select
              id="creator-sort"
              name="sort"
              defaultValue="newest"
              aria-label="Sort creators"
              title="Sort creators"
              className="mt-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="newest">Newest</option>
              <option value="top">Top creators</option>
              <option value="active">Most active</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col">
            <label htmlFor="creator-status" className="text-sm text-zinc-300">
              Status
            </label>
            <select
              id="creator-status"
              name="status"
              defaultValue="any"
              aria-label="Filter by status"
              title="Filter by status"
              className="mt-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="any">Any</option>
              <option value="live">Live</option>
              <option value="offline">Offline</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          {/* Category (example taxonomy) */}
          <div className="flex flex-col">
            <label htmlFor="creator-category" className="text-sm text-zinc-300">
              Category
            </label>
            <select
              id="creator-category"
              name="cat"
              defaultValue="all"
              aria-label="Filter by category"
              title="Filter by category"
              className="mt-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="all">All</option>
              <option value="irl">IRL</option>
              <option value="music">Music</option>
              <option value="gaming">Gaming</option>
              <option value="coding">Coding</option>
            </select>
          </div>
        </form>
      </section>

      {/* Results */}
      <section
        aria-labelledby="creator-results-heading"
        className="rounded-lg border border-zinc-800 bg-zinc-950"
      >
        <h2 id="creator-results-heading" className="sr-only">
          Creator results
        </h2>

        <div className="overflow-x-auto">
          <table
            className="min-w-full divide-y divide-zinc-800"
            aria-label="Creators table"
          >
            <caption className="sr-only">List of creators</caption>
            <thead className="bg-zinc-900/40">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400"
                >
                  Creator
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400"
                >
                  Streams
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400"
                >
                  Followers
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400"
                >
                  Tokens (lifetime)
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400"
                >
                  Status
                </th>
                <th scope="col" className="px-4 py-3" aria-hidden />
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {DATA.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-900/40">
                  <th
                    scope="row"
                    className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-200"
                  >
                    {c.name}
                  </th>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                    {c.streams.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                    {c.followers.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-300">
                    {c.tokens.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {c.status === 'live' && (
                      <span className="inline-flex items-center gap-2 text-emerald-400">
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 rounded-full bg-emerald-500"
                        />
                        Live
                      </span>
                    )}
                    {c.status === 'offline' && (
                      <span className="inline-flex items-center gap-2 text-zinc-400">
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 rounded-full bg-zinc-500"
                        />
                        Offline
                      </span>
                    )}
                    {c.status === 'banned' && (
                      <span className="inline-flex items-center gap-2 text-red-400">
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 rounded-full bg-red-500"
                        />
                        Banned
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        href={`/admin/creators/${c.id}`}
                        className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        title={`View ${c.name}`}
                        aria-label={`View ${c.name}`}
                      >
                        View
                      </a>
                      <a
                        href={`/admin/creators/${c.id}/edit`}
                        className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        title={`Edit ${c.name}`}
                        aria-label={`Edit ${c.name}`}
                      >
                        Edit
                      </a>
                      <button
                        type="button"
                        className="rounded-md border border-red-700/60 bg-red-800/20 px-3 py-1.5 text-sm text-red-300 hover:bg-red-800/30 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        title={`Suspend ${c.name}`}
                        aria-label={`Suspend ${c.name}`}
                      >
                        Suspend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
