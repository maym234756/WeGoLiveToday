// apps/web/components/dashboard/FollowersPage.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBookmark,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiEdit3,
  FiFilter,
  FiMail,
  FiMessageCircle,
  FiPlus,
  FiSearch,
  FiShield,
  FiStar,
  FiTrash2,
  FiUser,
  FiUserCheck,
  FiUserPlus,
  FiX,
} from 'react-icons/fi';

/* ──────────────────────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────────────────────── */
type FollowerTag =
  | 'VIP'
  | 'New'
  | 'Subscriber'
  | 'Moderator'
  | 'Verified'
  | 'Muted'
  | 'Potential Spam'
  | 'Top Chatter';

type EngagementLevel = 'Low' | 'Medium' | 'High';

type Follower = {
  id: string;
  displayName: string;
  handle: string; // @name
  avatar?: string;
  followedAt: number; // epoch ms
  lastSeenAt: number; // epoch ms
  country?: string;
  engagement: {
    score: number; // 0-100
    level: EngagementLevel;
    chatMessages30d: number;
    watchHours30d: number;
  };
  lifetime: {
    tipsUsd: number;
    subsCount: number;
  };
  tags: FollowerTag[];
  notes?: string;
};

type SortKey = 'newest' | 'oldest' | 'engagement' | 'tips' | 'alpha';

/* ──────────────────────────────────────────────────────────────────────────────
   Small UI primitives (kept local so this file is drop-in ready)
────────────────────────────────────────────────────────────────────────────── */
function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function Card({
  title,
  icon,
  right,
  children,
  className = '',
  bodyClassName = '',
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-zinc-800 bg-zinc-900', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 text-zinc-200">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="font-medium truncate">{title}</span>
        </div>
        {right}
      </header>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

function Chip({
  tone = 'zinc',
  icon,
  children,
  className = '',
}: {
  tone?: 'zinc' | 'emerald' | 'sky' | 'rose' | 'amber';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-800 text-zinc-200 ring-zinc-700/60',
    emerald: 'bg-emerald-600/20 text-emerald-200 ring-emerald-500/30',
    sky: 'bg-sky-600/20 text-sky-200 ring-sky-500/30',
    rose: 'bg-rose-600/20 text-rose-200 ring-rose-500/30',
    amber: 'bg-amber-600/20 text-amber-200 ring-amber-500/30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 whitespace-nowrap',
        map[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function Button({
  tone = 'zinc',
  icon,
  children,
  onClick,
  className = '',
  disabled,
  type = 'button',
}: {
  tone?: 'zinc' | 'emerald' | 'rose';
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/40',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition disabled:opacity-60 disabled:hover:bg-inherit',
        map[tone],
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  right,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="relative w-full min-w-0">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 pr-10 text-sm text-zinc-100 outline-none focus:border-emerald-600"
      />
      {right ? (
        <div className="absolute inset-y-0 right-2 flex items-center text-zinc-400">{right}</div>
      ) : null}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300">
      <span className="hidden sm:block text-zinc-400">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 pr-8 text-sm text-zinc-100 outline-none focus:border-emerald-600"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400" />
      </div>
    </label>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-zinc-700 bg-zinc-950 text-sm font-semibold text-zinc-200">
      {initials || <FiUser />}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Page
────────────────────────────────────────────────────────────────────────────── */
export default function FollowersPage() {
  const [loading, setLoading] = useState(true);

  // Data
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // UI state
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [segment, setSegment] = useState<'all' | 'new' | 'vip' | 'subs' | 'risk' | 'mods'>('all');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [hideMuted, setHideMuted] = useState(true);

  // “Notes” editor
  const [noteDraft, setNoteDraft] = useState('');

  // Simulate load (replace with Supabase/API later)
  useEffect(() => {
    const t = setTimeout(() => {
      const seeded = seedFollowers();
      setFollowers(seeded);
      setSelectedId(seeded[0]?.id ?? null);
      setLoading(false);
    }, 450);
    return () => clearTimeout(t);
  }, []);

  const selected = useMemo(
    () => followers.find((f) => f.id === selectedId) ?? null,
    [followers, selectedId]
  );

  // Keep noteDraft in sync with selection
  useEffect(() => {
    setNoteDraft(selected?.notes ?? '');
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const segments = useMemo(() => {
    const counts = {
      all: followers.length,
      new: followers.filter((f) => f.tags.includes('New')).length,
      vip: followers.filter((f) => f.tags.includes('VIP')).length,
      subs: followers.filter((f) => f.tags.includes('Subscriber')).length,
      risk: followers.filter((f) => f.tags.includes('Potential Spam')).length,
      mods: followers.filter((f) => f.tags.includes('Moderator')).length,
    };
    return counts;
  }, [followers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let out = followers.slice();

    // segment filter
    if (segment === 'new') out = out.filter((f) => f.tags.includes('New'));
    if (segment === 'vip') out = out.filter((f) => f.tags.includes('VIP'));
    if (segment === 'subs') out = out.filter((f) => f.tags.includes('Subscriber'));
    if (segment === 'risk') out = out.filter((f) => f.tags.includes('Potential Spam'));
    if (segment === 'mods') out = out.filter((f) => f.tags.includes('Moderator'));

    if (onlyVerified) out = out.filter((f) => f.tags.includes('Verified'));
    if (hideMuted) out = out.filter((f) => !f.tags.includes('Muted'));

    if (q) {
      out = out.filter((f) => {
        const hay = `${f.displayName} ${f.handle} ${f.country ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // sort
    out.sort((a, b) => {
      if (sort === 'newest') return b.followedAt - a.followedAt;
      if (sort === 'oldest') return a.followedAt - b.followedAt;
      if (sort === 'engagement') return b.engagement.score - a.engagement.score;
      if (sort === 'tips') return b.lifetime.tipsUsd - a.lifetime.tipsUsd;
      if (sort === 'alpha') return a.displayName.localeCompare(b.displayName);
      return 0;
    });

    return out;
  }, [followers, query, sort, segment, onlyVerified, hideMuted]);

  const stats = useMemo(() => summarizeFollowers(followers), [followers]);

  const clearFilters = () => {
    setQuery('');
    setSort('newest');
    setSegment('all');
    setOnlyVerified(false);
    setHideMuted(true);
  };

  const saveNote = () => {
    if (!selected) return;
    setFollowers((prev) =>
      prev.map((f) => (f.id === selected.id ? { ...f, notes: noteDraft } : f))
    );
  };

  const toggleTag = (id: string, tag: FollowerTag) => {
    setFollowers((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const has = f.tags.includes(tag);
        return { ...f, tags: has ? f.tags.filter((t) => t !== tag) : [...f.tags, tag] };
      })
    );
  };

  return (
    <div className="w-full min-w-0">
      {/* Top header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl sm:text-2xl font-bold text-emerald-400 truncate">Followers</span>
            <Chip tone="zinc" icon={<FiUserCheck />}>
              {stats.total.toLocaleString()}
            </Chip>
            <Chip tone="sky" icon={<FiActivity />}>
              +{stats.new7d} / 7d
            </Chip>
          </div>
          <div className="mt-1 text-sm text-zinc-400 break-words">
            Search, segment, and engage your community — with safety-first tools built in.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button tone="zinc" icon={<FiDownload />} onClick={() => {}}>
            Export
          </Button>
          <Button tone="zinc" icon={<FiMail />} onClick={() => {}}>
            Message
          </Button>
          <Button tone="emerald" icon={<FiUserPlus />} onClick={() => {}}>
            Invite
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-12 gap-3">
        <StatCard
          title="New followers (7d)"
          value={stats.new7d}
          hint="Momentum"
          icon={<FiUserPlus className="text-emerald-300" />}
          tone="emerald"
          className="col-span-12 sm:col-span-6 xl:col-span-3"
        />
        <StatCard
          title="Engaged (30d)"
          value={stats.engaged30d}
          hint="Score ≥ 60"
          icon={<FiActivity className="text-sky-300" />}
          tone="sky"
          className="col-span-12 sm:col-span-6 xl:col-span-3"
        />
        <StatCard
          title="Tips (30d)"
          value={`$${stats.tips30d.toFixed(2)}`}
          hint="From this list"
          icon={<FiStar className="text-amber-300" />}
          tone="amber"
          className="col-span-12 sm:col-span-6 xl:col-span-3"
        />
        <StatCard
          title="Safety flags"
          value={stats.riskCount}
          hint="Potential spam"
          icon={<FiShield className="text-rose-300" />}
          tone="rose"
          className="col-span-12 sm:col-span-6 xl:col-span-3"
        />
      </div>

      {/* Main layout */}
      <div className="mt-4 grid grid-cols-12 gap-4 min-w-0">
        {/* Left: list */}
        <div className="col-span-12 xl:col-span-8 min-w-0">
          <Card
            title="Audience"
            icon={<FiUsersIcon />}
            right={
              <div className="flex items-center gap-2">
                <Button tone="zinc" icon={<FiFilter />} onClick={clearFilters} className="hidden sm:inline-flex">
                  Reset
                </Button>
              </div>
            }
            bodyClassName="space-y-3"
          >
            {/* Controls */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
              <Input
                value={query}
                onChange={setQuery}
                placeholder="Search by name, handle, country…"
                right={<FiSearch />}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  label="Segment"
                  value={segment}
                  onChange={(v) => setSegment(v as any)}
                  options={[
                    { value: 'all', label: `All (${segments.all})` },
                    { value: 'new', label: `New (${segments.new})` },
                    { value: 'vip', label: `VIP (${segments.vip})` },
                    { value: 'subs', label: `Subs (${segments.subs})` },
                    { value: 'mods', label: `Mods (${segments.mods})` },
                    { value: 'risk', label: `Risk (${segments.risk})` },
                  ]}
                />
                <Select
                  label="Sort"
                  value={sort}
                  onChange={(v) => setSort(v as SortKey)}
                  options={[
                    { value: 'newest', label: 'Newest' },
                    { value: 'oldest', label: 'Oldest' },
                    { value: 'engagement', label: 'Engagement' },
                    { value: 'tips', label: 'Tips' },
                    { value: 'alpha', label: 'A → Z' },
                  ]}
                />

                <TogglePill
                  on={onlyVerified}
                  setOn={setOnlyVerified}
                  label="Verified"
                  icon={<FiCheck />}
                />
                <TogglePill
                  on={hideMuted}
                  setOn={setHideMuted}
                  label="Hide muted"
                  icon={<FiX />}
                />
              </div>
            </div>

            {/* List */}
            {loading ? (
              <SkeletonList />
            ) : filtered.length === 0 ? (
              <EmptyState onReset={clearFilters} />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[760px] border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-xs text-zinc-400">
                        <th className="pb-2 pr-3">Follower</th>
                        <th className="pb-2 pr-3">Engagement</th>
                        <th className="pb-2 pr-3">Last seen</th>
                        <th className="pb-2 pr-3">Followed</th>
                        <th className="pb-2 pr-3">Value</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((f) => (
                        <tr
                          key={f.id}
                          onClick={() => setSelectedId(f.id)}
                          className={cn(
                            'cursor-pointer rounded-lg',
                            selectedId === f.id ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/40'
                          )}
                        >
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar name={f.displayName} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="font-medium text-zinc-100 truncate">{f.displayName}</div>
                                  {f.tags.includes('Verified') ? (
                                    <Chip tone="sky" icon={<FiUserCheck />}>
                                      Verified
                                    </Chip>
                                  ) : null}
                                  {f.tags.includes('Potential Spam') ? (
                                    <Chip tone="rose" icon={<FiAlertTriangle />}>
                                      Risk
                                    </Chip>
                                  ) : null}
                                </div>
                                <div className="text-xs text-zinc-400 truncate">{f.handle}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 pr-3">
                            <div className="min-w-[180px]">
                              <div className="flex items-center justify-between text-xs text-zinc-400">
                                <span>{f.engagement.level}</span>
                                <span>{f.engagement.score}</span>
                              </div>
                              <div className="mt-1 h-2 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full',
                                    f.engagement.score >= 70
                                      ? 'bg-emerald-600'
                                      : f.engagement.score >= 40
                                      ? 'bg-sky-600'
                                      : 'bg-zinc-700'
                                  )}
                                  style={{ width: `${clamp(f.engagement.score, 0, 100)}%` }}
                                />
                              </div>
                              <div className="mt-1 flex gap-2 text-[11px] text-zinc-500">
                                <span>{f.engagement.chatMessages30d} msgs</span>
                                <span>•</span>
                                <span>{f.engagement.watchHours30d.toFixed(1)} hrs</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 pr-3 text-sm text-zinc-300">
                            {formatRelative(f.lastSeenAt)}
                            <div className="text-xs text-zinc-500">{f.country ?? '—'}</div>
                          </td>

                          <td className="py-3 pr-3 text-sm text-zinc-300">
                            {formatDateShort(f.followedAt)}
                            <div className="text-xs text-zinc-500">{formatRelative(f.followedAt)}</div>
                          </td>

                          <td className="py-3 pr-3 text-sm text-zinc-300">
                            <div className="flex flex-wrap gap-1">
                              {f.lifetime.subsCount > 0 ? (
                                <Chip tone="emerald">Subs {f.lifetime.subsCount}</Chip>
                              ) : null}
                              {f.lifetime.tipsUsd > 0 ? (
                                <Chip tone="amber">${f.lifetime.tipsUsd.toFixed(2)}</Chip>
                              ) : (
                                <Chip tone="zinc">$0</Chip>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {f.tags
                                .filter((t) => t !== 'Verified' && t !== 'Potential Spam')
                                .slice(0, 3)
                                .map((t) => (
                                  <Chip key={t} tone={tagTone(t)}>
                                    {t}
                                  </Chip>
                                ))}
                            </div>
                          </td>

                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2 pr-2">
                              <IconButton label="Message" icon={<FiMessageCircle />} onClick={(e) => e.stopPropagation()} />
                              <IconButton label="Add note" icon={<FiEdit3 />} onClick={(e) => e.stopPropagation()} />
                              <IconButton label="Tag" icon={<FiBookmark />} onClick={(e) => e.stopPropagation()} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {filtered.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedId(f.id)}
                      className={cn(
                        'w-full text-left rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 hover:bg-zinc-900 transition',
                        selectedId === f.id && 'border-emerald-700/50 bg-zinc-900'
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <Avatar name={f.displayName} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="font-semibold text-zinc-100 truncate">{f.displayName}</div>
                            {f.tags.includes('Verified') ? (
                              <Chip tone="sky" icon={<FiUserCheck />}>
                                Verified
                              </Chip>
                            ) : null}
                            {f.tags.includes('Potential Spam') ? (
                              <Chip tone="rose" icon={<FiAlertTriangle />}>
                                Risk
                              </Chip>
                            ) : null}
                          </div>
                          <div className="text-xs text-zinc-400 truncate">{f.handle}</div>

                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-zinc-400">
                              <span>Engagement</span>
                              <span>{f.engagement.score}</span>
                            </div>
                            <div className="mt-1 h-2 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full',
                                  f.engagement.score >= 70
                                    ? 'bg-emerald-600'
                                    : f.engagement.score >= 40
                                    ? 'bg-sky-600'
                                    : 'bg-zinc-700'
                                )}
                                style={{ width: `${clamp(f.engagement.score, 0, 100)}%` }}
                              />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {f.tags
                                .filter((t) => t !== 'Verified' && t !== 'Potential Spam')
                                .slice(0, 4)
                                .map((t) => (
                                  <Chip key={t} tone={tagTone(t)}>
                                    {t}
                                  </Chip>
                                ))}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
                              <span>Last seen: {formatRelative(f.lastSeenAt)}</span>
                              <span>•</span>
                              <span>Followed: {formatDateShort(f.followedAt)}</span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <Chip tone="zinc">Msgs 30d: {f.engagement.chatMessages30d}</Chip>
                              <Chip tone="zinc">Hrs 30d: {f.engagement.watchHours30d.toFixed(1)}</Chip>
                              <Chip tone={f.lifetime.tipsUsd > 0 ? 'amber' : 'zinc'}>
                                Tips: ${f.lifetime.tipsUsd.toFixed(2)}
                              </Chip>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Right: details */}
        <div className="col-span-12 xl:col-span-4 min-w-0">
          <Card
            title="Follower profile"
            icon={<FiUser className="text-emerald-300" />}
            right={
              selected ? (
                <Chip tone={selected.tags.includes('Potential Spam') ? 'rose' : 'emerald'}>
                  {selected.tags.includes('Potential Spam') ? 'Watchlist' : 'Active'}
                </Chip>
              ) : null
            }
            bodyClassName="space-y-4"
          >
            {!selected ? (
              <div className="text-sm text-zinc-400">Select a follower to view details.</div>
            ) : (
              <>
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar name={selected.displayName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-lg font-semibold text-zinc-100 truncate">
                        {selected.displayName}
                      </div>
                      {selected.tags.includes('Verified') ? (
                        <Chip tone="sky" icon={<FiUserCheck />}>
                          Verified
                        </Chip>
                      ) : null}
                    </div>
                    <div className="text-sm text-zinc-400 truncate">{selected.handle}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Followed {formatDateLong(selected.followedAt)} • Last seen{' '}
                      {formatRelative(selected.lastSeenAt)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <MiniStat label="Engagement" value={`${selected.engagement.score}/100`} />
                  <MiniStat label="Level" value={selected.engagement.level} />
                  <MiniStat label="Msgs (30d)" value={selected.engagement.chatMessages30d} />
                  <MiniStat label="Watch (30d)" value={`${selected.engagement.watchHours30d.toFixed(1)}h`} />
                  <MiniStat label="Tips" value={`$${selected.lifetime.tipsUsd.toFixed(2)}`} />
                  <MiniStat label="Subs" value={selected.lifetime.subsCount} />
                </div>

                <div className="flex flex-wrap gap-1">
                  {selected.tags.map((t) => (
                    <Chip key={t} tone={tagTone(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-medium text-zinc-200">Quick actions</div>
                    <Chip tone="zinc" icon={<FiShield />}>
                      Safety-first
                    </Chip>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button tone="zinc" icon={<FiMessageCircle />} onClick={() => {}}>
                      Message
                    </Button>
                    <Button
                      tone="zinc"
                      icon={<FiBookmark />}
                      onClick={() => toggleTag(selected.id, 'VIP')}
                    >
                      Toggle VIP
                    </Button>
                    <Button
                      tone="zinc"
                      icon={<FiAlertTriangle />}
                      onClick={() => toggleTag(selected.id, 'Potential Spam')}
                    >
                      Toggle Risk
                    </Button>
                    <Button
                      tone="zinc"
                      icon={<FiX />}
                      onClick={() => toggleTag(selected.id, 'Muted')}
                    >
                      Toggle Mute
                    </Button>
                  </div>

                  <div className="mt-2 text-xs text-zinc-500">
                    Tip: keep moderation actions transparent and reversible to reduce liability risk.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-zinc-200">Notes</div>
                    <div className="flex items-center gap-2">
                      <Button tone="zinc" icon={<FiTrash2 />} onClick={() => setNoteDraft('')}>
                        Clear
                      </Button>
                      <Button tone="emerald" icon={<FiCheck />} onClick={saveNote}>
                        Save
                      </Button>
                    </div>
                  </div>

                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add private notes (ex: brand-safe, VIP perks, collab interest, moderation context)…"
                    className="w-full min-w-0 resize-y rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
                    rows={5}
                  />
                  <div className="text-xs text-zinc-500">
                    Notes stay private to the creator/team. Don’t store sensitive personal data.
                  </div>
                </div>
              </>
            )}
          </Card>

          <div className="mt-4">
            <Card
              title="Smart segments"
              icon={<FiPlus className="text-sky-300" />}
              right={<Chip tone="zinc">Coming next</Chip>}
              bodyClassName="space-y-2"
            >
              <SegmentRow
                title="Onboarding"
                desc="Auto-thank new followers + suggest rules for first-time chatters."
                badge="Free"
              />
              <SegmentRow
                title="High-value"
                desc="Detect repeat supporters (subs/tips) and offer perks."
                badge="Pro"
              />
              <SegmentRow
                title="Safety"
                desc="Flag suspicious patterns before they become a problem."
                badge="Free"
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Components (small)
────────────────────────────────────────────────────────────────────────────── */
function StatCard({
  title,
  value,
  hint,
  icon,
  tone,
  className,
}: {
  title: string;
  value: React.ReactNode;
  hint: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'sky' | 'amber' | 'rose';
  className?: string;
}) {
  const toneRing =
    tone === 'emerald'
      ? 'ring-emerald-600/20'
      : tone === 'sky'
      ? 'ring-sky-600/20'
      : tone === 'amber'
      ? 'ring-amber-600/20'
      : 'ring-rose-600/20';

  return (
    <div className={cn('col-span-12 rounded-xl border border-zinc-800 bg-zinc-900 p-4 ring-1', toneRing, className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-zinc-400">{title}</div>
        <div className="text-zinc-300">{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 min-w-0">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-100 truncate">{value}</div>
    </div>
  );
}

function TogglePill({
  on,
  setOn,
  label,
  icon,
}: {
  on: boolean;
  setOn: (v: boolean) => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
        on
          ? 'border-emerald-700/50 bg-emerald-600/15 text-emerald-100'
          : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function IconButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-zinc-300 hover:bg-zinc-900 hover:text-white"
    >
      {icon}
    </button>
  );
}

function SegmentRow({ title, desc, badge }: { title: string; desc: string; badge: 'Free' | 'Pro' }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-100">{title}</div>
        <Chip tone={badge === 'Free' ? 'emerald' : 'sky'}>{badge}</Chip>
      </div>
      <div className="mt-1 text-sm text-zinc-400 break-words">{desc}</div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[68px] rounded-xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center">
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-200">
        <FiSearch />
      </div>
      <div className="text-zinc-200 font-semibold">No followers match your filters</div>
      <div className="mt-1 text-sm text-zinc-400">Try clearing filters or searching a different term.</div>
      <div className="mt-4 flex justify-center">
        <Button tone="zinc" icon={<FiFilter />} onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}

function FiUsersIcon() {
  return <FiUserCheck className="text-emerald-300" />;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────────────────────── */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDateShort(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatDateLong(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
}

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return `just now`;
}

function tagTone(t: FollowerTag): 'zinc' | 'emerald' | 'sky' | 'rose' | 'amber' {
  if (t === 'VIP') return 'amber';
  if (t === 'New') return 'emerald';
  if (t === 'Subscriber') return 'sky';
  if (t === 'Moderator') return 'zinc';
  if (t === 'Verified') return 'sky';
  if (t === 'Muted') return 'zinc';
  if (t === 'Potential Spam') return 'rose';
  if (t === 'Top Chatter') return 'emerald';
  return 'zinc';
}

function summarizeFollowers(list: Follower[]) {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  const total = list.length;
  const new7d = list.filter((f) => now - f.followedAt <= sevenDays).length;
  const engaged30d = list.filter((f) => f.engagement.score >= 60).length;
  const tips30d = list
    .filter((f) => now - f.lastSeenAt <= thirtyDays) // simple proxy for “recently active”
    .reduce((sum, f) => sum + f.lifetime.tipsUsd * 0.15, 0); // demo-ish “last 30d portion”

  const riskCount = list.filter((f) => f.tags.includes('Potential Spam')).length;

  return { total, new7d, engaged30d, tips30d, riskCount };
}

/* ──────────────────────────────────────────────────────────────────────────────
   Mock data (replace with API later)
────────────────────────────────────────────────────────────────────────────── */
function seedFollowers(): Follower[] {
  const now = Date.now();
  const days = (n: number) => n * 24 * 60 * 60 * 1000;

  const base: Array<Pick<Follower, 'displayName' | 'handle' | 'country' | 'tags'>> = [
    { displayName: 'Ava Jensen', handle: '@avaj', country: 'US', tags: ['Verified', 'Top Chatter'] },
    { displayName: 'Niko Park', handle: '@nikop', country: 'CA', tags: ['New'] },
    { displayName: 'Mina Soto', handle: '@minas', country: 'MX', tags: ['Subscriber'] },
    { displayName: 'Tariq Ali', handle: '@tariq', country: 'US', tags: ['VIP', 'Subscriber'] },
    { displayName: 'Sloane K', handle: '@sloane', country: 'UK', tags: ['Potential Spam'] },
    { displayName: 'Jules R', handle: '@jules', country: 'AU', tags: ['Moderator', 'Verified'] },
    { displayName: 'Kaito Mori', handle: '@kaito', country: 'JP', tags: ['Top Chatter'] },
    { displayName: 'Nova Lane', handle: '@noval', country: 'US', tags: ['New', 'Verified'] },
    { displayName: 'Priya S', handle: '@priya', country: 'IN', tags: ['Subscriber', 'Top Chatter'] },
    { displayName: 'Ben H', handle: '@benh', country: 'US', tags: ['Muted'] },
    { displayName: 'Chloe M', handle: '@chloem', country: 'FR', tags: ['VIP'] },
    { displayName: 'Rafa C', handle: '@rafac', country: 'BR', tags: ['New'] },
  ];

  // expand to a nicer list size
  const expanded = Array.from({ length: 24 }).map((_, i) => {
    const b = base[i % base.length];
    const followedAt = now - days((i % 12) + 1) - (i * 13_000_00);
    const lastSeenAt = now - days((i % 7)) - (i * 210_000);

    const score = clamp(92 - (i % 10) * 7 + (i % 3) * 5, 8, 98);
    const level: EngagementLevel = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';

    const chatMessages30d = clamp(Math.floor(score * 2.2), 0, 220);
    const watchHours30d = clamp(score / 10 + (i % 4) * 0.7, 0.2, 35);

    const tipsUsd = clamp((score - 30) * 0.35 + (i % 5) * 1.4, 0, 120);
    const subsCount = b.tags.includes('Subscriber') ? 1 + (i % 3) : 0;

    return {
      id: `f_${i + 1}`,
      displayName: b.displayName + (i >= base.length ? ` ${i - base.length + 2}` : ''),
      handle: b.handle + (i >= base.length ? `${i - base.length + 2}` : ''),
      country: b.country,
      followedAt,
      lastSeenAt,
      engagement: { score, level, chatMessages30d, watchHours30d },
      lifetime: { tipsUsd: Math.round(tipsUsd * 100) / 100, subsCount },
      tags: uniqTags(b.tags),
      notes: i % 6 === 0 ? 'Seems brand-safe. Engages with polls + Q&A.' : '',
    } satisfies Follower;
  });

  // pick a couple “VIPs” and “Risk” to feel real
  expanded[3].tags = uniqTags([...expanded[3].tags, 'VIP', 'Verified']);
  expanded[4].tags = uniqTags([...expanded[4].tags, 'Potential Spam']);
  expanded[9].tags = uniqTags([...expanded[9].tags, 'Muted']);

  return expanded;
}

function uniqTags(tags: FollowerTag[]) {
  return Array.from(new Set(tags));
}
