'use client';

// apps/web/components/dashboard/DashboardBrowse.tsx

import Link from 'next/link';
import { useMemo, useState, useTransition, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { LiveCard } from '@/app/dashboard/page';
import StreamCard from '@/components/dashboard/StreamCard';
import CategoryStrip from '@/components/dashboard/CategoryStrip';
import Controls, { type SortKey } from '@/components/dashboard/Controls';

const CATEGORIES = ['Featured', 'IRL', 'Coding', 'Music', 'Gaming', 'Art'] as const;
type Category = (typeof CATEGORIES)[number];

export type DashboardBrowseProps = {
  /**
   * List of stream objects to display. This may be undefined on initial
   * render if the caller has not yet fetched streams. We treat an
   * undefined value as an empty list to avoid runtime errors.
   */
  initialStreams?: LiveCard[];
};

export default function DashboardBrowse({ initialStreams }: DashboardBrowseProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const initialCat = (sp.get('cat') as Category) || 'Featured';
  const initialQuery = sp.get('q') ?? '';
  const initialSort = (sp.get('sort') as SortKey) || 'top';
  const initialSfw = sp.get('sfw') === '1';

  const [category, setCategory] = useState<Category>(initialCat);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [sfwOnly, setSfwOnly] = useState<boolean>(initialSfw);
  const [limit, setLimit] = useState<number>(12);
  const [isPending, startTransition] = useTransition();

  // Keep URL query params in sync with UI state
  useEffect(() => {
    const params = new URLSearchParams(sp.toString());
    params.set('cat', category);
    params.set('sort', sort);

    sfwOnly ? params.set('sfw', '1') : params.delete('sfw');
    query ? params.set('q', query) : params.delete('q');

    const next = `${pathname}?${params.toString()}`;
    const current = `${pathname}?${sp.toString()}`;

    if (next !== current) {
      startTransition(() => router.replace(next, { scroll: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort, sfwOnly, query]);

  const safeInitialStreams: LiveCard[] = useMemo(
    () => (Array.isArray(initialStreams) ? initialStreams : []),
    [initialStreams]
  );

  const filtered = useMemo(() => {
    let items =
      category === 'Featured'
        ? [...safeInitialStreams].sort((a, b) => b.viewers - a.viewers)
        : safeInitialStreams.filter((s) => s.tag === category);

    if (sfwOnly) {
      items = items.filter((s) =>
        ['IRL', 'Art', 'Coding', 'Music', 'Gaming', 'Featured'].includes(s.tag)
      );
    }

    const trimmed = query.trim();
    if (trimmed) {
      const qLower = trimmed.toLowerCase();
      items = items.filter(
        (s) =>
          s.title.toLowerCase().includes(qLower) ||
          s.host.toLowerCase().includes(qLower) ||
          s.tag.toLowerCase().includes(qLower)
      );
    }

    // Apply sorting
    const out = items.slice();
    if (sort === 'top') out.sort((a, b) => b.viewers - a.viewers);
    if (sort === 'trending') out.sort((a, b) => (b.viewers % 100) - (a.viewers % 100));
    if (sort === 'new') out.sort((a, b) => (a.id < b.id ? 1 : -1));

    return out;
  }, [safeInitialStreams, category, sfwOnly, query, sort]);

  const visible = filtered.slice(0, limit);
  const canLoadMore = visible.length < filtered.length;

  const suggestions = useMemo(() => {
    const sorted = [...safeInitialStreams].sort((a, b) => b.viewers - a.viewers);
    return sorted.slice(0, 4);
  }, [safeInitialStreams]);

  const rows = chunkArray(visible, 4);

  const hasFilters =
    category !== 'Featured' || sort !== 'top' || sfwOnly || query.trim().length > 0;

  return (
    <div className="space-y-4">
      <CategoryStrip
        categories={[...CATEGORIES]}
        active={category}
        onSelect={(c) => {
          setCategory(c as Category);
          setLimit(12);
        }}
      />

      <Controls
        sort={sort}
        onSort={(s) => {
          setSort(s);
          setLimit(12);
        }}
        sfwOnly={sfwOnly}
        onToggleSfw={() => {
          setSfwOnly((v) => !v);
          setLimit(12);
        }}
        query={query}
        onQueryChange={(q) => {
          setQuery(q);
          setLimit(12);
        }}
      />

      {hasFilters && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setCategory('Featured');
              setSort('top');
              setSfwOnly(false);
              setQuery('');
              setLimit(12);
            }}
            className="text-sm text-emerald-500 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {isPending ? (
        <SkeletonGrid />
      ) : visible.length ? (
        <>
          <div className="flex flex-col gap-6">
            {rows.map((group, index) => (
              <div key={index} className="relative border border-zinc-700 rounded-lg p-4">
                <div className="absolute top-2 left-4 text-sm font-medium text-blue-400 hover:underline">
                  <Link href={`/section/${index + 1}`}>Section {index + 1}</Link>
                </div>
                <div className="absolute top-2 right-4 text-sm text-zinc-400">
                  Top Row {index + 1}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-8">
                  {group.map((s) => (
                    <StreamCard key={s.id} s={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {canLoadMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setLimit((n) => n + 12)}
                className="btn btn-ghost border border-zinc-800 bg-zinc-900 px-4 hover:bg-zinc-800/70"
              >
                Load more
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <EmptyState />
          {suggestions.length > 0 && (
            <div className="space-y-2 border border-zinc-800 rounded-lg p-4 bg-zinc-950">
              <h3 className="text-sm font-semibold text-zinc-300">Recommended for you</h3>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {suggestions.map((s) => (
                  <StreamCard key={s.id} s={s} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function chunkArray<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/40">
          <div className="aspect-video w-full animate-pulse rounded-md bg-zinc-800" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-lg border border-zinc-800 bg-zinc-950 py-16 text-center">
      <div className="space-y-2">
        <p className="text-white">No results</p>
        <p className="text-sm text-zinc-400">
          Try a different category, search term, or remove filters.
        </p>
      </div>
    </div>
  );
}
