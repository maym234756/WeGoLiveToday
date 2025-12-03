'use client';

export type SortKey = 'top' | 'trending' | 'new';

export default function Controls({
  sort,
  onSort,
  sfwOnly,
  onToggleSfw,
  query,
  onQueryChange,
}: {
  sort: SortKey;
  onSort: (s: SortKey) => void;
  sfwOnly: boolean;
  onToggleSfw: () => void;
  query: string;
  onQueryChange: (q: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <label className="text-sm text-zinc-400">Sort:</label>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500"
        >
          <option value="top">Top</option>
          <option value="trending">Trending</option>
          <option value="new">New</option>
        </select>

        <label className="ml-4 inline-flex select-none items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={sfwOnly}
            onChange={onToggleSfw}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
          />
          SFW only
        </label>
      </div>

      <div className="relative w-full sm:w-80">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search streams, creators…"
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          aria-label="Search streams"
        />
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
          width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden
        >
          <path d="M21 21l-4.35-4.35M10 18a8 8 0 110-16 8 8 0 010 16z" />
        </svg>
      </div>
    </div>
  );
}
