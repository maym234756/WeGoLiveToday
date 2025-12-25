'use client';

// apps/web/components/dashboard/DashboardBrowse.tsx

import Link from 'next/link';
import { useMemo, useState, useTransition, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { LiveCard } from '@/app/dashboard/page';
import StreamCard from '@/components/dashboard/StreamCard';
import CategoryStrip from '@/components/dashboard/CategoryStrip';
import Controls, { type SortKey } from '@/components/dashboard/Controls';
import { supabase } from '@/lib/supabase';

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

/* ──────────────────────────────────────────────────────────────────────────────
  Helpers
────────────────────────────────────────────────────────────────────────────── */
function fmtViewers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function cx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(' ');
}

export default function DashboardBrowse({ initialStreams }: DashboardBrowseProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  /* ──────────────────────────────────────────────────────────────────────────
    State derived from URL
  ─────────────────────────────────────────────────────────────────────────── */
  const initialCat = (sp?.get('cat') as Category) || 'Featured';
  const initialQuery = sp?.get('q') ?? '';
  const initialSort = (sp?.get('sort') as SortKey) || 'top';
  const initialSfw = sp?.get('sfw') === '1';

  const [category, setCategory] = useState<Category>(initialCat);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [sfwOnly, setSfwOnly] = useState<boolean>(initialSfw);
  const [limit, setLimit] = useState<number>(18); // slightly higher for “YouTube feel”
  const [isPending, startTransition] = useTransition();

  /* ──────────────────────────────────────────────────────────────────────────
    Logout
  ─────────────────────────────────────────────────────────────────────────── */
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function onLogout() {
    if (loggingOut) return;
    setLogoutError(null);
    setLoggingOut(true);

    try {
      // End Supabase session
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Route back to login/page.tsx (Next route: /login)
      router.replace('/login');
      router.refresh();
    } catch (e: any) {
      setLogoutError(e?.message || 'Failed to log out.');
    } finally {
      setLoggingOut(false);
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
    Keep URL params synced (shareable browse state)
  ─────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const params = new URLSearchParams(sp?.toString() ?? '');
    params.set('cat', category);
    params.set('sort', sort);

    sfwOnly ? params.set('sfw', '1') : params.delete('sfw');
    query ? params.set('q', query) : params.delete('q');

    const next = `${pathname}?${params.toString()}`;
    const current = `${pathname}?${sp?.toString() ?? ''}`;

    if (next !== current) {
      startTransition(() => router.replace(next, { scroll: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort, sfwOnly, query, pathname]);

  /* ──────────────────────────────────────────────────────────────────────────
    Normalize input data
  ─────────────────────────────────────────────────────────────────────────── */
  const safeInitialStreams: LiveCard[] = useMemo(
    () => (Array.isArray(initialStreams) ? initialStreams : []),
    [initialStreams],
  );

  /* ──────────────────────────────────────────────────────────────────────────
    Filtering + sorting
  ─────────────────────────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let items =
      category === 'Featured'
        ? [...safeInitialStreams].sort((a, b) => b.viewers - a.viewers)
        : safeInitialStreams.filter((s) => s.tag === category);

    if (sfwOnly) {
      items = items.filter((s) => ['IRL', 'Art', 'Coding', 'Music', 'Gaming', 'Featured', 'Podcast', ''].includes(s.tag));
    }

    const trimmed = query.trim();
    if (trimmed) {
      const qLower = trimmed.toLowerCase();
      items = items.filter(
        (s) =>
          s.title.toLowerCase().includes(qLower) ||
          s.host.toLowerCase().includes(qLower) ||
          s.tag.toLowerCase().includes(qLower),
      );
    }

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
    return sorted.slice(0, 8);
  }, [safeInitialStreams]);

  const hasFilters = category !== 'Featured' || sort !== 'top' || sfwOnly || query.trim().length > 0;

  /* ──────────────────────────────────────────────────────────────────────────
    “YouTube/Twitch-inspired” structure
  ─────────────────────────────────────────────────────────────────────────── */
  const showHero =
    category === 'Featured' && !query.trim() && !sfwOnly && sort === 'top' && filtered.length > 0;

  const hero = showHero ? filtered[0] : null;
  const upNext = showHero ? filtered.slice(1, 5) : [];
  const gridItems = showHero ? visible.slice(5) : visible;

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* ────────────────────────────────────────────────────────────────────
        Sticky “Browse Bar”
      ───────────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-2 sm:-mx-3 lg:mx-0">
        <div className="bg-black/70 backdrop-blur border-b border-zinc-900 px-2 sm:px-3 lg:px-0 py-3">
          <div className="space-y-3">
            {/* Top row (adds Logout) */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-200 truncate">Browse</div>
                <div className="text-xs text-zinc-500 truncate">Find live streams fast</div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                disabled={loggingOut}
                className={cx(
                  'shrink-0 rounded-lg border px-3 py-2 text-sm transition',
                  'border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:bg-zinc-800/50',
                  loggingOut && 'opacity-60 cursor-not-allowed',
                )}
                aria-label="Log out"
                title="Log out"
              >
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>

            {logoutError && (
              <div className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
                {logoutError}
              </div>
            )}

            <CategoryStrip
              categories={[...CATEGORIES]}
              active={category}
              onSelect={(c) => {
                setCategory(c as Category);
                setLimit(18);
              }}
            />

            <Controls
              sort={sort}
              onSort={(s) => {
                setSort(s);
                setLimit(18);
              }}
              sfwOnly={sfwOnly}
              onToggleSfw={() => {
                setSfwOnly((v) => !v);
                setLimit(18);
              }}
              query={query}
              onQueryChange={(q) => {
                setQuery(q);
                setLimit(18);
              }}
            />

            {/* Active filters row */}
            {hasFilters && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className="text-zinc-500">Showing:</span>
                  <FilterChip label={category} />
                  <FilterChip label={sortLabel(sort)} />
                  {sfwOnly && <FilterChip label="SFW" />}
                  {query.trim() && <FilterChip label={`Search: “${query.trim()}”`} />}
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400">{filtered.length} results</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCategory('Featured');
                    setSort('top');
                    setSfwOnly(false);
                    setQuery('');
                    setLimit(18);
                  }}
                  className="text-sm text-emerald-500 hover:underline self-start sm:self-auto"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
        Content
      ───────────────────────────────────────────────────────────────────── */}
      {isPending ? (
        <BrowseSkeleton />
      ) : filtered.length ? (
        <div className="space-y-5">
          {/* Featured Hero */}
          {showHero && hero && (
            <section className="w-full min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zinc-200">Featured</div>
                  <div className="text-xs text-zinc-500">Top live stream right now</div>
                </div>
                <div className="text-xs text-zinc-400 shrink-0">
                  Live now • <span className="text-zinc-200">{fmtViewers(hero.viewers)}</span> viewers
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
                  {/* Big featured card */}
                  <div className="lg:col-span-8 min-w-0">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-2">
                      <StreamCard s={hero} />
                    </div>
                  </div>

                  {/* Up next stack */}
                  <div className="lg:col-span-4 min-w-0">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-zinc-200">Up next</div>
                        <div className="text-xs text-zinc-500">{upNext.length} streams</div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 min-w-0">
                        {upNext.map((s) => (
                          <div key={s.id} className="min-w-0">
                            <StreamCard s={s} />
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 text-xs text-zinc-500">
                        Tip: Use search + filters to match your vibe faster.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Main grid */}
          <section className="w-full min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-zinc-200 truncate">
                  {category === 'Featured' ? 'Live right now' : `${category} live`}
                </h2>
                <p className="text-xs text-zinc-500">
                  {filtered.length} streams • Sorted by {sortLabel(sort)}
                </p>
              </div>

              <Link href={pathname || '/'} className="text-sm text-emerald-400 hover:text-emerald-300">
                  Refresh
                </Link>
            </div>

            <div className="mt-3 grid min-w-0 gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {gridItems.map((s) => (
                <div key={s.id} className="min-w-0">
                  <StreamCard s={s} />
                </div>
              ))}
            </div>

            {canLoadMore && (
              <div className="mt-5 flex justify-center">
                <button
                  onClick={() => setLimit((n) => n + 18)}
                  className="w-full sm:w-auto rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800/70"
                >
                  Load more
                </button>
              </div>
            )}
          </section>
        </div>
      ) : (
        <>
          <EmptyState />
          {suggestions.length > 0 && (
            <section className="w-full min-w-0 space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-300">Recommended for you</h3>
                <span className="text-xs text-zinc-500">Top picks</span>
              </div>

              <div className="grid min-w-0 gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {suggestions.map((s) => (
                  <div key={s.id} className="min-w-0">
                    <StreamCard s={s} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
  Small UI bits (kept local to this file for organization)
────────────────────────────────────────────────────────────────────────────── */
function sortLabel(sort: SortKey) {
  if (sort === 'top') return 'Top';
  if (sort === 'trending') return 'Trending';
  if (sort === 'new') return 'New';
  return 'Top';
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-zinc-300">
      {label}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
  Skeleton + Empty
────────────────────────────────────────────────────────────────────────────── */
function BrowseSkeleton() {
  return (
    <div className="space-y-4">
      {/* Hero skeleton */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
        <div className="h-14 border-b border-zinc-800 bg-zinc-900/40" />
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 rounded-xl border border-zinc-800 bg-zinc-900/30">
              <div className="aspect-video w-full animate-pulse rounded-xl bg-zinc-800" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-800" />
              </div>
            </div>
            <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 space-y-3">
              <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-800" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/40">
                    <div className="aspect-video w-full animate-pulse rounded-md bg-zinc-800" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid min-w-0 gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="aspect-video w-full animate-pulse rounded-md bg-zinc-800" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-2xl border border-zinc-800 bg-zinc-950/40 py-16 text-center">
      <div className="space-y-2 max-w-md px-6">
        <p className="text-white font-medium">No results</p>
        <p className="text-sm text-zinc-400">Try a different category, search term, or remove filters.</p>
      </div>
    </div>
  );
}
