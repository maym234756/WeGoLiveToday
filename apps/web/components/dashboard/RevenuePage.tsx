// apps/web/components/dashboard/RevenuePage.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiArrowDownRight,
  FiArrowUpRight,
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiDownload,
  FiFilter,
  FiInfo,
  FiLock,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi';

type Money = {
  gross: number; // before fees/refunds
  fees: number; // platform/processor fees
  net: number; // after fees/refunds
};

type RevenueType = 'subscription' | 'tip' | 'ads' | 'sponsorship' | 'store' | 'refund' | 'chargeback';

type RevenueStatus = 'paid' | 'pending' | 'failed' | 'refunded';

type RevenueEvent = {
  id: string;
  at: number; // epoch ms
  type: RevenueType;
  status: RevenueStatus;
  title: string;
  source?: string; // e.g. “Stripe”, “iOS”, “PayPal”
  viewer?: {
    handle: string;
    displayName: string;
    country?: string;
    vip?: boolean;
  };
  amount: Money;
  notes?: string;
  risk?: 'low' | 'med' | 'high';
};

type Payout = {
  id: string;
  scheduledFor: number;
  status: 'scheduled' | 'processing' | 'paid' | 'failed';
  method: 'bank' | 'card';
  amountNet: number;
  reference?: string;
};

type RangePreset = '7d' | '30d' | '90d' | 'ytd' | 'all';

const now = Date.now();
const DAY = 1000 * 60 * 60 * 24;

// ---- Mock data (replace with API later) ----
const SEED_EVENTS: RevenueEvent[] = [
  {
    id: 'e1',
    at: now - DAY * 1.2,
    type: 'subscription',
    status: 'paid',
    title: 'New Subscription',
    source: 'Stripe',
    viewer: { handle: '@orbitjay', displayName: 'OrbitJay', country: 'US', vip: true },
    amount: { gross: 4.99, fees: 0.49, net: 4.5 },
    risk: 'low',
  },
  {
    id: 'e2',
    at: now - DAY * 1.0,
    type: 'tip',
    status: 'paid',
    title: 'Tip',
    source: 'Stripe',
    viewer: { handle: '@mika', displayName: 'Mika', country: 'CA' },
    amount: { gross: 10.0, fees: 0.82, net: 9.18 },
    notes: '“Keep it up!”',
    risk: 'low',
  },
  {
    id: 'e3',
    at: now - DAY * 2.5,
    type: 'ads',
    status: 'pending',
    title: 'Ad Revenue (Daily)',
    source: 'WeGoLive Ads',
    amount: { gross: 6.2, fees: 0.0, net: 6.2 },
    risk: 'low',
  },
  {
    id: 'e4',
    at: now - DAY * 5.8,
    type: 'store',
    status: 'paid',
    title: 'Store Purchase',
    source: 'Stripe',
    viewer: { handle: '@han', displayName: 'Han', country: 'GB' },
    amount: { gross: 14.0, fees: 1.02, net: 12.98 },
    notes: 'Digital Pack: “Neon Alerts”',
    risk: 'low',
  },
  {
    id: 'e5',
    at: now - DAY * 9.1,
    type: 'sponsorship',
    status: 'paid',
    title: 'Sponsor Payout',
    source: 'Invoice',
    amount: { gross: 75.0, fees: 0.0, net: 75.0 },
    notes: 'Brand: “Kitsune Snacks”',
    risk: 'low',
  },
  {
    id: 'e6',
    at: now - DAY * 10.3,
    type: 'refund',
    status: 'refunded',
    title: 'Refund',
    source: 'Stripe',
    viewer: { handle: '@orbitjay', displayName: 'OrbitJay', country: 'US', vip: true },
    amount: { gross: -4.99, fees: 0.0, net: -4.99 },
    notes: 'Subscription cancelled within grace window.',
    risk: 'low',
  },
  {
    id: 'e7',
    at: now - DAY * 16.2,
    type: 'chargeback',
    status: 'pending',
    title: 'Chargeback Opened',
    source: 'Stripe',
    viewer: { handle: '@unknown', displayName: 'Unknown' },
    amount: { gross: -10.0, fees: -0.0, net: -10.0 },
    notes: 'Awaiting evidence. Auto-pack prepared.',
    risk: 'high',
  },
];

const SEED_PAYOUTS: Payout[] = [
  {
    id: 'p1',
    scheduledFor: now + DAY * 1.2,
    status: 'scheduled',
    method: 'bank',
    amountNet: 128.42,
    reference: 'WGL-PO-1042',
  },
  {
    id: 'p2',
    scheduledFor: now - DAY * 13,
    status: 'paid',
    method: 'bank',
    amountNet: 243.0,
    reference: 'WGL-PO-0991',
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function formatMoney(n: number) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toFixed(2)}`;
}
function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
function startOfYear(ts: number) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), 0, 1).getTime();
}
function withinRange(ts: number, from: number, to: number) {
  return ts >= from && ts <= to;
}

function typeLabel(t: RevenueType) {
  switch (t) {
    case 'subscription':
      return 'Subscription';
    case 'tip':
      return 'Tip';
    case 'ads':
      return 'Ads';
    case 'sponsorship':
      return 'Sponsorship';
    case 'store':
      return 'Store';
    case 'refund':
      return 'Refund';
    case 'chargeback':
      return 'Chargeback';
  }
}

function statusChip(s: RevenueStatus) {
  switch (s) {
    case 'paid':
      return { tone: 'emerald' as const, text: 'Paid' };
    case 'pending':
      return { tone: 'zinc' as const, text: 'Pending' };
    case 'failed':
      return { tone: 'rose' as const, text: 'Failed' };
    case 'refunded':
      return { tone: 'amber' as const, text: 'Refunded' };
  }
}

function riskChip(r?: RevenueEvent['risk']) {
  if (!r) return { tone: 'zinc' as const, text: '—' };
  if (r === 'low') return { tone: 'emerald' as const, text: 'Low risk' };
  if (r === 'med') return { tone: 'amber' as const, text: 'Med risk' };
  return { tone: 'rose' as const, text: 'High risk' };
}

/* ──────────────────────────────────────────────────────────────────────────────
   Lightweight UI primitives (local, drop-in friendly)
────────────────────────────────────────────────────────────────────────────── */
function Card({
  title,
  icon,
  right,
  children,
  className = '',
  bodyClass = '',
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`rounded-xl border border-zinc-800 bg-zinc-900 ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 text-zinc-200">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate font-semibold">{title}</span>
        </div>
        {right}
      </header>
      <div className={`p-4 ${bodyClass}`}>{children}</div>
    </section>
  );
}

function Chip({
  children,
  tone = 'zinc',
  title,
}: {
  children: React.ReactNode;
  tone?: 'zinc' | 'emerald' | 'amber' | 'rose' | 'sky';
  title?: string;
}) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-700/30 text-zinc-200 ring-zinc-500/30',
    emerald: 'bg-emerald-600/20 text-emerald-300 ring-emerald-500/30',
    amber: 'bg-amber-600/20 text-amber-200 ring-amber-500/30',
    rose: 'bg-rose-600/20 text-rose-200 ring-rose-500/30',
    sky: 'bg-sky-600/20 text-sky-200 ring-sky-500/30',
  };
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${map[tone]}`}>
      {children}
    </span>
  );
}

function Pill({
  children,
  tone = 'zinc',
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  tone?: 'zinc' | 'emerald' | 'rose' | 'sky';
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const styles: Record<string, string> = {
    zinc: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white',
    sky: 'bg-sky-600 hover:bg-sky-500 text-white',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition disabled:opacity-60 ${styles[tone]}`}
    >
      {icon}
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs text-zinc-400">{label}</div>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  leftIcon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  leftIcon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {leftIcon && <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">{leftIcon}</div>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-600 ${
          leftIcon ? 'pl-9' : ''
        }`}
      />
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-600"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 140;
  const h = 36;
  const pad = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const d = points
    .map((p, i) => {
      const x = pad + (i * (w - pad * 2)) / (points.length - 1);
      const y = pad + (h - pad * 2) * (1 - (p - min) / range);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-[140px]">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400" />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Revenue Page
────────────────────────────────────────────────────────────────────────────── */
export default function RevenuePage() {
  // Range + filters
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [from, setFrom] = useState<string>(''); // yyyy-mm-dd
  const [to, setTo] = useState<string>(''); // yyyy-mm-dd

  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | RevenueType>('all');
  const [status, setStatus] = useState<'all' | RevenueStatus>('all');
  const [hideRefunds, setHideRefunds] = useState(true);

  // tiny toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const events = useMemo(() => [...SEED_EVENTS].sort((a, b) => b.at - a.at), []);
  const payouts = useMemo(() => [...SEED_PAYOUTS].sort((a, b) => b.scheduledFor - a.scheduledFor), []);

  const computedRange = useMemo(() => {
    const end = now;
    if (preset === '7d') return { from: end - DAY * 7, to: end };
    if (preset === '30d') return { from: end - DAY * 30, to: end };
    if (preset === '90d') return { from: end - DAY * 90, to: end };
    if (preset === 'ytd') return { from: startOfYear(end), to: end };
    if (preset === 'all') return { from: 0, to: end };

    return { from: end - DAY * 30, to: end };
  }, [preset]);

  // When preset changes, clear custom inputs (keeps UX predictable)
  useEffect(() => {
    setFrom('');
    setTo('');
  }, [preset]);

  const activeRange = useMemo(() => {
    // If user typed custom dates, use them
    if (from && to) {
      const f = new Date(from).getTime();
      const t = new Date(to).getTime() + (DAY - 1);
      if (Number.isFinite(f) && Number.isFinite(t) && f <= t) return { from: f, to: t };
    }
    return computedRange;
  }, [from, to, computedRange]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events
      .filter((e) => withinRange(e.at, activeRange.from, activeRange.to))
      .filter((e) => (type === 'all' ? true : e.type === type))
      .filter((e) => (status === 'all' ? true : e.status === status))
      .filter((e) => (hideRefunds ? e.type !== 'refund' : true))
      .filter((e) => {
        if (!q) return true;
        const hay = [
          e.title,
          e.source ?? '',
          e.viewer?.displayName ?? '',
          e.viewer?.handle ?? '',
          e.notes ?? '',
          typeLabel(e.type),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
  }, [events, activeRange, type, status, hideRefunds, search]);

  const totals = useMemo(() => {
    const sum: Money = { gross: 0, fees: 0, net: 0 };
    for (const e of filtered) {
      sum.gross += e.amount.gross;
      sum.fees += e.amount.fees;
      sum.net += e.amount.net;
    }
    return sum;
  }, [filtered]);

  const breakdown = useMemo(() => {
    const by: Record<RevenueType, Money> = {
      subscription: { gross: 0, fees: 0, net: 0 },
      tip: { gross: 0, fees: 0, net: 0 },
      ads: { gross: 0, fees: 0, net: 0 },
      sponsorship: { gross: 0, fees: 0, net: 0 },
      store: { gross: 0, fees: 0, net: 0 },
      refund: { gross: 0, fees: 0, net: 0 },
      chargeback: { gross: 0, fees: 0, net: 0 },
    };
    for (const e of filtered) {
      by[e.type].gross += e.amount.gross;
      by[e.type].fees += e.amount.fees;
      by[e.type].net += e.amount.net;
    }
    return by;
  }, [filtered]);

  const insight = useMemo(() => {
    // Basic “health” score: favors net growth and low disputes
    const net = totals.net;
    const disputes = (breakdown.chargeback.net < 0 ? Math.abs(breakdown.chargeback.net) : 0) + (breakdown.refund.net < 0 ? Math.abs(breakdown.refund.net) : 0);
    const feeRate = totals.gross !== 0 ? Math.abs(totals.fees) / Math.max(1, Math.abs(totals.gross)) : 0;
    const scoreRaw = 85 + clamp(net, -200, 200) / 10 - clamp(disputes, 0, 200) / 4 - clamp(feeRate * 100, 0, 10);
    const score = clamp(Math.round(scoreRaw), 0, 100);

    // Simple trend sparkline from last 14 days net
    const points: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = now - DAY * i;
      const dayEnd = dayStart + DAY - 1;
      const dayNet = events
        .filter((e) => withinRange(e.at, dayStart, dayEnd))
        .reduce((acc, e) => acc + e.amount.net, 0);
      points.push(dayNet);
    }

    const best = Math.max(...points);
    const worst = Math.min(...points);

    return { score, feeRate, disputes, points, best, worst };
  }, [totals, breakdown, events]);

  const nextPayout = useMemo(() => {
    const upcoming = payouts.find((p) => p.status === 'scheduled' || p.status === 'processing');
    return upcoming ?? null;
  }, [payouts]);

  function pushToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }

  function exportCsv() {
    const rows = [
      ['Date', 'Time', 'Type', 'Status', 'Title', 'Viewer', 'Gross', 'Fees', 'Net', 'Source', 'Notes'],
      ...filtered.map((e) => [
        formatDate(e.at),
        formatTime(e.at),
        typeLabel(e.type),
        e.status,
        e.title,
        e.viewer ? `${e.viewer.displayName} (${e.viewer.handle})` : '',
        e.amount.gross.toFixed(2),
        e.amount.fees.toFixed(2),
        e.amount.net.toFixed(2),
        e.source ?? '',
        e.notes ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_${new Date(activeRange.from).toISOString().slice(0, 10)}_to_${new Date(activeRange.to).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    pushToast('Exported CSV');
  }

  const breakdownRows = useMemo(() => {
    const rows: { key: RevenueType; label: string; net: number; gross: number; fees: number }[] = [
      { key: 'subscription' as RevenueType, label: 'Subscriptions', ...breakdown.subscription },
      { key: 'tip' as RevenueType, label: 'Tips', ...breakdown.tip },
      { key: 'ads' as RevenueType, label: 'Ads', ...breakdown.ads },
      { key: 'sponsorship' as RevenueType, label: 'Sponsorships', ...breakdown.sponsorship },
      { key: 'store' as RevenueType, label: 'Store', ...breakdown.store },
      { key: 'refund' as RevenueType, label: 'Refunds', ...breakdown.refund },
      { key: 'chargeback' as RevenueType, label: 'Chargebacks', ...breakdown.chargeback },
    ]
      .map((r) => ({
        key: r.key,
        label: r.label,
        net: r.net,
        gross: r.gross,
        fees: r.fees,
      }))
      .filter((r) => Math.abs(r.net) > 0.001 || r.key === 'refund' || r.key === 'chargeback');

    const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.net)));
    return rows.map((r) => ({ ...r, pct: Math.round((Math.abs(r.net) / maxAbs) * 100) }));
  }, [breakdown]);

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[70] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold text-emerald-400">💰 Revenue</h1>
            <Chip tone="zinc" title="Mock data for now — wire to your billing API later">Live preview</Chip>
            <Chip tone={insight.score >= 80 ? 'emerald' : insight.score >= 60 ? 'amber' : 'rose'} title="Revenue Health blends net, disputes, and fee-rate">
              Health: {insight.score}/100
            </Chip>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            A creator-first revenue hub: fast audits, exportable ledgers, dispute safety, and mobile-safe layout.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="zinc" icon={<FiRefreshCw />} onClick={() => pushToast('Refreshed (mock)')}>
            Refresh
          </Pill>
          <Pill tone="zinc" icon={<FiDownload />} onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </Pill>
        </div>
      </div>

      {/* Filters */}
      <Card
        title="Filters"
        icon={<FiFilter className="text-emerald-400" />}
        right={
          <div className="flex items-center gap-2">
            <Chip tone="zinc" title="Range applied to all widgets below">
              {formatDate(activeRange.from)} → {formatDate(activeRange.to)}
            </Chip>
          </div>
        }
        bodyClass="space-y-3"
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Field label="Search">
              <Input value={search} onChange={setSearch} placeholder="Search transactions, viewers, notes…" leftIcon={<FiSearch />} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-span-4">
            <Field label="Type">
              <Select
                value={type}
                onChange={(v) => setType(v as any)}
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Subscriptions', value: 'subscription' },
                  { label: 'Tips', value: 'tip' },
                  { label: 'Ads', value: 'ads' },
                  { label: 'Sponsorships', value: 'sponsorship' },
                  { label: 'Store', value: 'store' },
                  { label: 'Refunds', value: 'refund' },
                  { label: 'Chargebacks', value: 'chargeback' },
                ]}
              />
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onChange={(v) => setStatus(v as any)}
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Paid', value: 'paid' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Refunded', value: 'refunded' },
                  { label: 'Failed', value: 'failed' },
                ]}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-span-4">
            <Field label="Preset range">
              <Select
                value={preset}
                onChange={(v) => setPreset(v as RangePreset)}
                options={[
                  { label: 'Last 7 days', value: '7d' },
                  { label: 'Last 30 days', value: '30d' },
                  { label: 'Last 90 days', value: '90d' },
                  { label: 'Year to date', value: 'ytd' },
                  { label: 'All time', value: 'all' },
                ]}
              />
            </Field>

            <Field label="Hide refunds">
              <button
                type="button"
                onClick={() => setHideRefunds((v) => !v)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm ${
                  hideRefunds ? 'border-emerald-600 bg-emerald-600/10 text-emerald-200' : 'border-zinc-800 bg-zinc-950 text-zinc-200'
                }`}
              >
                <span>{hideRefunds ? 'On' : 'Off'}</span>
                <span className="text-xs text-zinc-400">(toggle)</span>
              </button>
            </Field>
          </div>
        </div>

        {/* Custom range (optional) */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <Field label="Custom from (optional)">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-600"
                  />
                </div>
                <FiCalendar className="text-zinc-500" />
              </div>
            </Field>
          </div>
          <div className="md:col-span-4">
            <Field label="Custom to (optional)">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-600"
                  />
                </div>
                <FiCalendar className="text-zinc-500" />
              </div>
            </Field>
          </div>

          <div className="md:col-span-4">
            <Field label="Quick actions">
              <div className="flex flex-wrap gap-2">
                <Pill
                  tone="zinc"
                  icon={<FiShield />}
                  onClick={() => pushToast('Dispute pack ready (mock)')}
                >
                  Generate dispute pack
                </Pill>
                <Pill
                  tone="zinc"
                  icon={<FiLock />}
                  onClick={() => pushToast('Payout lock enabled (mock)')}
                >
                  Payout lock
                </Pill>
              </div>
            </Field>
          </div>
        </div>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Gross"
          icon={<FiTrendingUp className="text-emerald-400" />}
          right={<Sparkline points={insight.points} />}
          bodyClass="space-y-1"
        >
          <div className="text-3xl font-bold text-white">{formatMoney(totals.gross)}</div>
          <div className="text-sm text-zinc-400">Before fees and refunds</div>
        </Card>

        <Card
          title="Fees"
          icon={<FiArrowDownRight className="text-amber-300" />}
          right={<Chip tone="zinc" title="Fee rate is computed from the filtered set (estimate).">{Math.round(insight.feeRate * 100)}% rate</Chip>}
          bodyClass="space-y-1"
        >
          <div className="text-3xl font-bold text-white">{formatMoney(totals.fees)}</div>
          <div className="text-sm text-zinc-400">Processor/platform fees (estimate)</div>
        </Card>

        <Card
          title="Net"
          icon={<FiArrowUpRight className="text-emerald-400" />}
          right={<Chip tone={totals.net >= 0 ? 'emerald' : 'rose'}>{totals.net >= 0 ? 'Positive' : 'Negative'}</Chip>}
          bodyClass="space-y-1"
        >
          <div className="text-3xl font-bold text-white">{formatMoney(totals.net)}</div>
          <div className="text-sm text-zinc-400">After fees and refunds</div>
        </Card>

        <Card
          title="Next Payout"
          icon={<FiCreditCard className="text-sky-300" />}
          right={
            nextPayout ? (
              <Chip tone="sky" title={nextPayout.reference}>
                {nextPayout.status.toUpperCase()}
              </Chip>
            ) : (
              <Chip tone="zinc">None</Chip>
            )
          }
          bodyClass="space-y-1"
        >
          {nextPayout ? (
            <>
              <div className="text-3xl font-bold text-white">{formatMoney(nextPayout.amountNet)}</div>
              <div className="text-sm text-zinc-400">
                {formatDate(nextPayout.scheduledFor)} • {nextPayout.method === 'bank' ? 'Bank' : 'Card'}
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-white">$0.00</div>
              <div className="text-sm text-zinc-400">No payout scheduled</div>
            </>
          )}
        </Card>
      </div>

      {/* Breakdown + Payouts */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card
            title="Revenue Mix"
            icon={<FiInfo className="text-emerald-400" />}
            right={<Chip tone="zinc">By net</Chip>}
            bodyClass="space-y-3"
          >
            <div className="space-y-2">
              {breakdownRows.map((r) => (
                <div key={r.key} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-200">{r.label}</span>
                      <Chip tone={r.net >= 0 ? 'emerald' : 'rose'} title="Net">
                        {formatMoney(r.net)}
                      </Chip>
                      <span className="text-xs text-zinc-500">
                        gross {formatMoney(r.gross)} • fees {formatMoney(r.fees)}
                      </span>
                    </div>
                    <Chip tone="zinc" title="Relative share (by absolute net)">
                      {r.pct}%
                    </Chip>
                  </div>
                  <div className="mt-2 h-2 w-full rounded bg-zinc-900">
                    <div
                      className={`h-2 rounded ${r.net >= 0 ? 'bg-emerald-500/60' : 'bg-rose-500/60'}`}
                      style={{ width: `${clamp(r.pct, 2, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">Revenue Health</span>
                <Chip tone={insight.score >= 80 ? 'emerald' : insight.score >= 60 ? 'amber' : 'rose'}>
                  {insight.score}/100
                </Chip>
              </div>
              <div className="mt-2 h-2 w-full rounded bg-zinc-900">
                <div
                  className={`h-2 rounded ${
                    insight.score >= 80 ? 'bg-emerald-500/70' : insight.score >= 60 ? 'bg-amber-500/70' : 'bg-rose-500/70'
                  }`}
                  style={{ width: `${clamp(insight.score, 2, 100)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                Disputes impact: {formatMoney(-insight.disputes)} • Fee-rate: {Math.round(insight.feeRate * 100)}% • Best day: {formatMoney(insight.best)} • Worst day:{' '}
                {formatMoney(insight.worst)}
              </div>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card title="Payouts & Compliance" icon={<FiCheckCircle className="text-emerald-400" />} bodyClass="space-y-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-zinc-200">Payout method</div>
                <Chip tone="emerald">Verified</Chip>
              </div>
              <div className="mt-1 text-xs text-zinc-400">Bank • Instant payouts disabled (recommended for fewer disputes)</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone="zinc" icon={<FiCreditCard />} onClick={() => pushToast('Open payout settings (mock)')}>
                  Manage method
                </Pill>
                <Pill tone="zinc" icon={<FiShield />} onClick={() => pushToast('Risk rules updated (mock)')}>
                  Risk rules
                </Pill>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-zinc-200">Tax & Documents</div>
                <Chip tone="zinc">Safe mode</Chip>
              </div>
              <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-zinc-400">Monthly statement</span>
                  <button className="text-emerald-400 hover:underline" onClick={() => pushToast('Downloaded statement (mock)')}>
                    Download
                  </button>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-zinc-400">Chargeback evidence pack</span>
                  <button className="text-emerald-400 hover:underline" onClick={() => pushToast('Generated evidence pack (mock)')}>
                    Generate
                  </button>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-zinc-400">Payout ledger</span>
                  <button className="text-emerald-400 hover:underline" onClick={exportCsv}>
                    Export CSV
                  </button>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-sm font-medium text-zinc-200">Recent payouts</div>
              <div className="mt-2 space-y-2">
                {payouts.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-zinc-200">{formatMoney(p.amountNet)}</div>
                      <div className="text-xs text-zinc-500">
                        {formatDate(p.scheduledFor)} • {p.method}
                      </div>
                    </div>
                    <Chip tone={p.status === 'paid' ? 'emerald' : p.status === 'failed' ? 'rose' : 'zinc'}>{p.status}</Chip>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Transactions */}
      <Card
        title="Transactions"
        icon={<FiInfo className="text-emerald-400" />}
        right={<Chip tone="zinc">{filtered.length} results</Chip>}
      >
        <div className="overflow-x-auto">
          {/* desktop / tablet: keep original table */}
          <div className="hidden md:block">
            <table className="min-w-[860px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs text-zinc-400">
                  <th className="sticky left-0 z-[1] bg-zinc-900 px-3 py-2">When</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Viewer / Source</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">Fees</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? (
                  filtered.map((e) => {
                    const s = statusChip(e.status);
                    const r = riskChip(e.risk);
                    return (
                      <tr key={e.id} className="text-sm text-zinc-200">
                        <td className="sticky left-0 z-[1] border-t border-zinc-800 bg-zinc-950 px-3 py-3 align-top">
                          <div className="text-zinc-200">{formatDate(e.at)}</div>
                          <div className="text-xs text-zinc-500">{formatTime(e.at)}</div>
                        </td>

                        <td className="border-t border-zinc-800 px-3 py-3 align-top">
                          <div className="font-medium">{typeLabel(e.type)}</div>
                          <div className="text-xs text-zinc-500">{e.title}</div>
                        </td>

                        <td className="border-t border-zinc-800 px-3 py-3 align-top">
                          <Chip tone={s.tone}>{s.text}</Chip>
                        </td>

                        <td className="border-t border-zinc-800 px-3 py-3 align-top">
                          {e.viewer ? (
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{e.viewer.displayName}</span>
                                <span className="text-xs text-zinc-500">{e.viewer.handle}</span>
                                {e.viewer.vip && <Chip tone="sky">VIP</Chip>}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {e.source ?? '—'}
                                {e.viewer.country ? ` • ${e.viewer.country}` : ''}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-zinc-400">{e.source ?? '—'}</div>
                          )}
                        </td>

                        <td className="border-t border-zinc-800 px-3 py-3 align-top">
                          <div className="text-zinc-300">{e.notes ?? '—'}</div>
                        </td>

                        <td className="border-t border-zinc-800 px-3 py-3 text-right align-top tabular-nums">
                          {formatMoney(e.amount.gross)}
                        </td>
                        <td className="border-t border-zinc-800 px-3 py-3 text-right align-top tabular-nums text-zinc-400">
                          {formatMoney(e.amount.fees)}
                        </td>
                        <td className="border-t border-zinc-800 px-3 py-3 text-right align-top tabular-nums">
                          <span className={e.amount.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatMoney(e.amount.net)}</span>
                        </td>

                        <td className="border-t border-zinc-800 px-3 py-3 align-top">
                          <Chip tone={r.tone} title="Risk is a policy output (mock).">{r.text}</Chip>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="border-t border-zinc-800 px-3 py-10 text-center text-sm text-zinc-400">
                      No transactions match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* mobile: stacked cards */}
          <div className="md:hidden space-y-3">
            {filtered.length ? (
              filtered.map((e) => <TransactionMobileItem key={e.id} e={e} />)
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-center text-sm text-zinc-400">
                No transactions match your filters.
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-zinc-500">
            Tip: keep “Hide refunds” enabled while streaming to reduce noise; toggle off when reconciling ledgers.
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="zinc" icon={<FiInfo />} onClick={() => pushToast('Audit view opened (mock)')}>
              Audit view
            </Pill>
            <Pill tone="zinc" icon={<FiShield />} onClick={() => pushToast('Policy report exported (mock)')}>
              Export policy report
            </Pill>
          </div>
        </div>
      </Card>
    </div>
  );
}

// add: mobile transaction item (place above the `return` in the file)
function TransactionMobileItem({ e }: { e: RevenueEvent }) {
  const s = statusChip(e.status);
  const r = riskChip(e.risk);
  return (
    <div className="md:hidden rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-200">{typeLabel(e.type)}</div>
          <div className="text-xs text-zinc-500 truncate">{e.title}</div>
          <div className="text-xs text-zinc-400 mt-1">{e.viewer ? `${e.viewer.displayName} ${e.viewer.handle ? `(${e.viewer.handle})` : ''}` : e.source ?? '—'}</div>
        </div>
        <div className="text-right tabular-nums">
          <div className={e.amount.net >= 0 ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>{formatMoney(e.amount.net)}</div>
          <div className="text-xs text-zinc-400">{formatMoney(e.amount.gross)} • {formatMoney(e.amount.fees)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div>{formatDate(e.at)} • {formatTime(e.at)}</div>
        <div className="flex items-center gap-2">
          <Chip tone={s.tone}>{s.text}</Chip>
          <Chip tone={r.tone}>{r.text}</Chip>
        </div>
      </div>

      <div className="text-sm text-zinc-300">{e.notes ?? '—'}</div>
    </div>
  );
}
