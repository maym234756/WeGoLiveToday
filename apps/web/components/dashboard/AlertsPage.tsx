// components/dashboard/AlertsPage.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiBell, FiFilter, FiSearch, FiCheck, FiX, FiTrash2, FiClock,
  FiAlertCircle, FiShield, FiDollarSign, FiMessageSquare, FiInfo, FiStar
} from 'react-icons/fi';

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 1) TYPES                                                                   │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
type AlertType = 'system' | 'monetization' | 'chat' | 'moderation' | 'update';
type Severity = 'info' | 'warning' | 'error' | 'success';

type Alert = {
  id: string;
  type: AlertType;
  severity: Severity;
  title: string;
  body: string;
  createdAt: number; // epoch ms
  read: boolean;
  pinned?: boolean;
  link?: string;
};

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 2) SMALL UTILITIES                                                         │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function timeAgo(ms: number) {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function groupByDay(alerts: Alert[]) {
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const map = new Map<string, Alert[]>();
  alerts.forEach(a => {
    const k = fmt(new Date(a.createdAt));
    const arr = map.get(k) ?? [];
    arr.push(a);
    map.set(k, arr);
  });
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 3) LOCAL PERSISTENCE HOOK (TINY, ROBUST)                                   │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 4) DATA (MOCKED FOR NOW)                                                   │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
const seedAlerts: Alert[] = [
  {
    id: 'a1',
    type: 'system',
    severity: 'info',
    title: 'New feature rollout',
    body: 'We just shipped Stream Keys v2 with rotation support.',
    createdAt: Date.now() - 1000 * 60 * 12,
    read: false,
    link: '#',
  },
  {
    id: 'a2',
    type: 'monetization',
    severity: 'success',
    title: 'Payout processed',
    body: 'Your monthly payout has been sent to your bank.',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    read: false,
  },
  {
    id: 'a3',
    type: 'chat',
    severity: 'warning',
    title: 'Chat rate limit bumped',
    body: 'We temporarily raised slow mode due to high activity.',
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    read: true,
  },
  {
    id: 'a4',
    type: 'moderation',
    severity: 'error',
    title: 'Flagged content removed',
    body: 'An unsafe link was removed from your VOD comments.',
    createdAt: Date.now() - 1000 * 60 * 60 * 28,
    read: false,
  },
  {
    id: 'a5',
    type: 'update',
    severity: 'info',
    title: 'Studio layout tips',
    body: 'Try the “Studio” preset for multi-pane production.',
    createdAt: Date.now() - 1000 * 60 * 60 * 53,
    read: true,
  },
];

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 5) UI PRIMITIVES                                                           │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function PillButton({
  children, onClick, tone = 'zinc', icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'zinc' | 'emerald' | 'rose';
  icon?: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    zinc: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white',
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm transition ${styles[tone]}`}
    >
      {icon}{children}
    </button>
  );
}

function Tag({ tone = 'zinc', children }: { tone?: 'zinc' | 'emerald' | 'amber' | 'rose'; children: React.ReactNode }) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-800 text-zinc-200',
    emerald: 'bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-500/30',
    amber: 'bg-amber-600/20 text-amber-300 ring-1 ring-amber-500/30',
    rose: 'bg-rose-600/20 text-rose-300 ring-1 ring-rose-500/30',
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${map[tone]}`}>{children}</span>;
}

function Card({
  title, icon, right, children, className = '',
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden ${className}`}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-300">{icon}{title}</div>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 6) ALERT ROW                                                               │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function TypeIcon({ type }: { type: AlertType }) {
  switch (type) {
    case 'system':       return <FiAlertCircle className="text-emerald-400" />;
    case 'monetization': return <FiDollarSign   className="text-emerald-400" />;
    case 'chat':         return <FiMessageSquare className="text-emerald-400" />;
    case 'moderation':   return <FiShield      className="text-emerald-400" />;
    case 'update':       return <FiInfo        className="text-emerald-400" />;
  }
}

function severityTone(sev: Severity) {
  switch (sev) {
    case 'info':    return 'border-l-emerald-500';
    case 'warning': return 'border-l-amber-500';
    case 'error':   return 'border-l-rose-500';
    case 'success': return 'border-l-emerald-400';
  }
}

function AlertRow({
  a, onToggleRead, onTogglePin, onDismiss,
}: {
  a: Alert;
  onToggleRead: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <li
      role="listitem"
      className={`relative rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 flex gap-3 items-start ${a.read ? 'opacity-90' : ''} ${a.pinned ? 'ring-1 ring-emerald-500/30' : ''} ${severityTone(a.severity)} border-l-4`}
    >
      <div className="pt-0.5"><TypeIcon type={a.type} /></div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {!a.read && <Tag tone="emerald">unread</Tag>}
          {a.pinned && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
              <FiStar className="fill-emerald-300 text-emerald-300" /> pinned
            </span>
          )}
          <span className="text-zinc-100 font-medium truncate">{a.title}</span>
        </div>
        <p className="text-sm text-zinc-400 mt-1">{a.body}</p>
        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-2">
          <span className="inline-flex items-center gap-1"><FiClock /> {timeAgo(a.createdAt)}</span>
          {a.link && (
            <a
              href={a.link}
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
              target="_blank" rel="noreferrer"
            >
              View details
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          title={a.read ? 'Mark as unread' : 'Mark as read'}
          onClick={() => onToggleRead(a.id)}
          className="rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-2 py-1 text-xs"
        >
          {a.read ? 'Unread' : 'Read'}
        </button>
        <button
          title={a.pinned ? 'Unpin' : 'Pin'}
          onClick={() => onTogglePin(a.id)}
          className="rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-2 py-1 text-xs"
        >
          {a.pinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          title="Dismiss"
          onClick={() => onDismiss(a.id)}
          className="rounded-md bg-zinc-800 hover:bg-rose-600/20 text-zinc-100 px-2 py-1 text-xs"
        >
          <FiTrash2 />
        </button>
      </div>
    </li>
  );
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 7) MAIN PAGE                                                               │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
const TABS: Array<{ key: AlertType | 'all'; label: string }> = [
  { key: 'all',            label: 'All' },
  { key: 'system',         label: 'System' },
  { key: 'monetization',   label: 'Monetization' },
  { key: 'chat',           label: 'Chat' },
  { key: 'moderation',     label: 'Moderation' },
  { key: 'update',         label: 'Updates' },
];

export default function AlertsPage() {
  // Persist alerts and UI prefs locally
  const [alerts, setAlerts] = useLocalStorage<Alert[]>('alerts.items', seedAlerts);
  const [tab, setTab] = useLocalStorage<(AlertType | 'all')>('alerts.tab', 'all');
  const [query, setQuery] = useLocalStorage('alerts.search', '');
  const [unreadOnly, setUnreadOnly] = useLocalStorage('alerts.unreadOnly', false);
  const [sortNewest, setSortNewest] = useLocalStorage('alerts.sortNewest', true);

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  const filtered = useMemo(() => {
    let out = alerts.slice();
    if (tab !== 'all') out = out.filter((a) => a.type === tab);
    if (unreadOnly) out = out.filter((a) => !a.read);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter(
        (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
      );
    }
    out.sort((a, b) => (sortNewest ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
    // Pinned first
    out.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
    return out;
  }, [alerts, tab, query, unreadOnly, sortNewest]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  // Handlers
  const toggleRead = (id: string) =>
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: !a.read } : a)));

  const togglePin = (id: string) =>
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)));

  const dismiss = (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id));

  const markAllRead = () => setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));

  const clearAll = () => setAlerts((prev) => prev.filter((a) => a.pinned)); // keep pinned by default

  return (
    <main className="min-h-screen bg-black text-white w-full max-w-none overflow-x-hidden">
      {/* ✅ Phone-safe page container */}
      <div className="w-full min-w-0 px-2 sm:px-4 lg:px-6 py-6 sm:py-8">
        {/* ✅ Header stacks on mobile */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <h1 className="text-2xl font-bold text-emerald-400 inline-flex items-center gap-2">
              <FiBell /> Alerts
            </h1>
            {unreadCount > 0 && <Tag tone="emerald">{unreadCount} unread</Tag>}
          </div>

          {/* ✅ Buttons wrap on mobile */}
          <div className="flex flex-wrap items-center gap-2">
            <PillButton tone="zinc" icon={<FiCheck />} onClick={markAllRead}>
              Mark all read
            </PillButton>
            <PillButton tone="rose" icon={<FiX />} onClick={clearAll}>
              Clear non-pinned
            </PillButton>
          </div>
        </div>

        {/* Controls */}
        <Card
          title="Inbox"
          icon={<FiFilter className="text-emerald-400" />}
          right={
            // ✅ Stack controls on mobile, inline on sm+
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-w-0">
              <label className="text-sm text-zinc-300 flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-emerald-500"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                />
                Unread only
              </label>

              <select
                value={sortNewest ? 'new' : 'old'}
                onChange={(e) => setSortNewest(e.target.value === 'new')}
                className="bg-zinc-900 border border-zinc-700 rounded-md text-sm px-2 py-2 sm:py-1 w-full sm:w-auto"
              >
                <option value="new">Newest first</option>
                <option value="old">Oldest first</option>
              </select>
            </div>
          }
        >
          {/* ✅ Tabs: wrap OR scroll (this is scrollable, which feels better on phone) */}
          <div className="-mx-1 mb-3 overflow-x-auto">
            <div className="px-1 flex w-max min-w-full items-center gap-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-md text-sm border transition ${
                    tab === t.key
                      ? 'bg-zinc-800 border-zinc-700'
                      : 'border-zinc-800 hover:bg-zinc-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4 min-w-0">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search alerts by title or message…"
              className="w-full min-w-0 rounded-md bg-zinc-950 border border-zinc-800 pl-10 pr-3 py-2 outline-none focus:border-emerald-600"
            />
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div role="list" className="space-y-5 min-w-0">
              {groups.map(({ label, items }) => (
                <section key={label} className="min-w-0">
                  <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
                    <span className="h-px w-4 bg-zinc-800" /> {label}
                  </div>
                  <ul className="space-y-2 min-w-0">
                    {items.map((a) => (
                      <AlertRow
                        key={a.id}
                        a={a}
                        onToggleRead={toggleRead}
                        onTogglePin={togglePin}
                        onDismiss={dismiss}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>

        {/* Footer hint */}
        <p className="text-sm text-zinc-500 mt-6">
          Pro tip: Pinned alerts are never removed by “Clear non-pinned”.
        </p>
      </div>
    </main>
  );
}


/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 8) EMPTY STATE                                                             │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function EmptyState() {
  return (
    <div className="grid place-items-center py-16 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 mb-3">
        <FiBell className="text-emerald-400" />
      </div>
      <h3 className="text-zinc-200 font-semibold">You’re all caught up</h3>
      <p className="text-zinc-400 text-sm mt-1 max-w-md">
        No alerts match your filters. New system notifications, monetization events,
        chat highlights, and moderation updates will appear here.
      </p>
    </div>
  );
}
