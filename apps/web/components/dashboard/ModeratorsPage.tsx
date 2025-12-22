// apps/web/components/dashboard/ModeratorsPage.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiAward,
  FiBell,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiFilter,
  FiLock,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSlash,
  FiTag,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';

/* ──────────────────────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────────────────────── */
type ModStatus = 'active' | 'paused' | 'suspended';
type TrustLevel = 'new' | 'trusted' | 'senior';

type Permission =
  | 'chat:read'
  | 'chat:timeout'
  | 'chat:ban'
  | 'chat:purge'
  | 'chat:slowmode'
  | 'chat:links'
  | 'chat:keywords'
  | 'appeals:review'
  | 'safety:raidmode';

type RoleTemplate = {
  id: string;
  name: string;
  tone: Tone;
  permissions: Permission[];
  description: string;
};

type Mod = {
  id: string;
  name: string;
  handle: string;
  roleId: string;
  status: ModStatus;
  trust: TrustLevel;
  addedAt: number; // epoch ms
  lastActiveAt: number; // epoch ms
  stats: {
    actionsTotal: number; // all actions (timeouts, bans, purges, etc.)
    reversals: number; // actions undone by admin / other mod
    appealsReviewed: number;
    appealsOverturned: number; // mod decision overturned or action deemed wrong
    notesWritten: number;
  };
};

type AppealStatus = 'open' | 'approved' | 'denied';

type Appeal = {
  id: string;
  user: { name: string; handle: string };
  action: { type: 'timeout' | 'ban' | 'purge'; duration?: string };
  byModId: string;
  createdAt: number;
  reason: string;
  status: AppealStatus;
  internalNote?: string;
};

type RaidPresetId = 'shield' | 'lockdown' | 'followers-only';

type RaidConfig = {
  enabled: boolean;
  presetId?: RaidPresetId;
  slowModeSeconds: number;
  followersOnly: boolean;
  minAccountAgeDays: number;
  linkFiltering: 'off' | 'strict' | 'trusted-only';
  capsFilter: boolean;
  keywordLock: boolean;
  autoTimeoutNewAccounts: boolean;
  autoTimeoutSeconds: number;
};

/* ──────────────────────────────────────────────────────────────────────────────
   UI Primitives
────────────────────────────────────────────────────────────────────────────── */
type Tone = 'zinc' | 'emerald' | 'amber' | 'rose' | 'sky';

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
    <section className={`w-full min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 ${className}`}>
      <header className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-zinc-200">
            {icon}
            <h2 className="truncate text-sm font-semibold">{title}</h2>
          </div>
        </div>
        {right}
      </header>
      <div className={`w-full min-w-0 px-4 py-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

function Chip({ children, tone = 'zinc' }: { children: React.ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    zinc: 'bg-zinc-800 text-zinc-200 ring-zinc-700',
    emerald: 'bg-emerald-600/15 text-emerald-300 ring-emerald-600/30',
    amber: 'bg-amber-600/15 text-amber-300 ring-amber-600/30',
    rose: 'bg-rose-600/15 text-rose-300 ring-rose-600/30',
    sky: 'bg-sky-600/15 text-sky-300 ring-sky-600/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Button({
  children,
  onClick,
  tone = 'zinc',
  icon,
  disabled,
  className = '',
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: Tone;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const tones: Record<Tone, string> = {
    zinc: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600',
    amber: 'bg-amber-600 hover:bg-amber-500 text-white border-amber-600',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-600',
    sky: 'bg-sky-600 hover:bg-sky-500 text-white border-sky-600',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`}
    >
      {icon}
      <span className="truncate">{children}</span>
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
        className="w-full min-w-0 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 pr-10 text-sm text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-emerald-600"
      />
      {right ? <div className="absolute inset-y-0 right-2 flex items-center text-zinc-400">{right}</div> : null}
    </div>
  );
}

function Toggle({
  on,
  onToggle,
  label,
  description,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full min-w-0 items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-left hover:border-zinc-700"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-zinc-200">{label}</div>
        {description ? <div className="mt-1 text-xs text-zinc-500">{description}</div> : null}
      </div>
      <span
        className={`mt-0.5 inline-flex h-6 w-11 flex-none items-center rounded-full border transition ${
          on ? 'bg-emerald-600/30 border-emerald-600/40' : 'bg-zinc-800 border-zinc-700'
        }`}
      >
        <span
          className={`ml-1 h-4 w-4 rounded-full transition ${
            on ? 'translate-x-5 bg-emerald-400' : 'translate-x-0 bg-zinc-400'
          }`}
        />
      </span>
    </button>
  );
}

function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const tone =
    v >= 85 ? 'bg-emerald-500' : v >= 70 ? 'bg-sky-500' : v >= 55 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="h-2 w-full rounded-full bg-zinc-800">
      <div className={`h-2 rounded-full ${tone}`} style={{ width: `${v}%` }} />
    </div>
  );
}

function fmtRelative(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ──────────────────────────────────────────────────────────────────────────────
   Mock Data (swap to Supabase/API later)
────────────────────────────────────────────────────────────────────────────── */
const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'chat-mod',
    name: 'Chat Mod',
    tone: 'sky',
    description: 'Everyday chat tools: timeouts, basic cleanup, link filters.',
    permissions: ['chat:read', 'chat:timeout', 'chat:links'],
  },
  {
    id: 'safety-mod',
    name: 'Safety Mod',
    tone: 'amber',
    description: 'High-signal safety tools + raid response + keyword locks.',
    permissions: ['chat:read', 'chat:timeout', 'chat:ban', 'chat:slowmode', 'chat:keywords', 'safety:raidmode'],
  },
  {
    id: 'events-mod',
    name: 'Events Mod',
    tone: 'emerald',
    description: 'Engagement-heavy sessions: chat flow + slowmode + highlights.',
    permissions: ['chat:read', 'chat:timeout', 'chat:slowmode', 'chat:links'],
  },
  {
    id: 'senior-mod',
    name: 'Senior Mod',
    tone: 'rose',
    description: 'Full control + appeals review + escalation authority.',
    permissions: [
      'chat:read',
      'chat:timeout',
      'chat:ban',
      'chat:purge',
      'chat:slowmode',
      'chat:links',
      'chat:keywords',
      'appeals:review',
      'safety:raidmode',
    ],
  },
];

const SEED_MODS: Mod[] = [
  {
    id: 'm1',
    name: 'Alyx Nguyen',
    handle: '@alyx',
    roleId: 'senior-mod',
    status: 'active',
    trust: 'senior',
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 210,
    lastActiveAt: Date.now() - 1000 * 60 * 16,
    stats: { actionsTotal: 4821, reversals: 22, appealsReviewed: 188, appealsOverturned: 9, notesWritten: 96 },
  },
  {
    id: 'm2',
    name: 'Jordan Price',
    handle: '@jprice',
    roleId: 'safety-mod',
    status: 'active',
    trust: 'trusted',
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 90,
    lastActiveAt: Date.now() - 1000 * 60 * 60 * 3,
    stats: { actionsTotal: 2110, reversals: 14, appealsReviewed: 44, appealsOverturned: 6, notesWritten: 31 },
  },
  {
    id: 'm3',
    name: 'Mina Carter',
    handle: '@mina',
    roleId: 'events-mod',
    status: 'paused',
    trust: 'trusted',
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    lastActiveAt: Date.now() - 1000 * 60 * 60 * 40,
    stats: { actionsTotal: 980, reversals: 7, appealsReviewed: 12, appealsOverturned: 3, notesWritten: 12 },
  },
  {
    id: 'm4',
    name: 'Sam Rivera',
    handle: '@samr',
    roleId: 'chat-mod',
    status: 'active',
    trust: 'new',
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    lastActiveAt: Date.now() - 1000 * 60 * 5,
    stats: { actionsTotal: 210, reversals: 2, appealsReviewed: 0, appealsOverturned: 0, notesWritten: 4 },
  },
  {
    id: 'm5',
    name: 'Casey Lin',
    handle: '@casey',
    roleId: 'chat-mod',
    status: 'suspended',
    trust: 'new',
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
    lastActiveAt: Date.now() - 1000 * 60 * 60 * 72,
    stats: { actionsTotal: 134, reversals: 9, appealsReviewed: 0, appealsOverturned: 0, notesWritten: 1 },
  },
];

const SEED_APPEALS: Appeal[] = [
  {
    id: 'ap1',
    user: { name: 'Nova', handle: '@nova' },
    action: { type: 'timeout', duration: '10m' },
    byModId: 'm2',
    createdAt: Date.now() - 1000 * 60 * 18,
    reason: 'I was quoting chat, not spamming. Please review context.',
    status: 'open',
  },
  {
    id: 'ap2',
    user: { name: 'Kyo', handle: '@kyo' },
    action: { type: 'ban' },
    byModId: 'm1',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    reason: 'Ban feels unfair — I linked a meme, not malware.',
    status: 'open',
  },
  {
    id: 'ap3',
    user: { name: 'Lia', handle: '@lia' },
    action: { type: 'purge' },
    byModId: 'm3',
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    reason: 'My message got deleted but it wasn’t hate. Can you restore?',
    status: 'approved',
    internalNote: 'Restored, user warned; false positive keyword match.',
  },
];

/* ──────────────────────────────────────────────────────────────────────────────
   Reputation Scoring (simple + explainable)
   - Starts at 85
   - Penalize reversal rate & appeal overturns
   - Reward tenure & volume (capped)
────────────────────────────────────────────────────────────────────────────── */
function computeReputation(mod: Mod) {
  const base = 85;

  const actions = Math.max(1, mod.stats.actionsTotal);
  const reversalRate = mod.stats.reversals / actions; // 0..1
  const appealVolume = Math.max(1, mod.stats.appealsReviewed);
  const overturnRate = mod.stats.appealsOverturned / appealVolume;

  const daysTenure = Math.max(0, Math.floor((Date.now() - mod.addedAt) / (1000 * 60 * 60 * 24)));

  const tenureBonus = clamp(daysTenure / 30, 0, 10); // up to +10
  const volumeBonus = clamp(Math.log10(actions + 1) * 6, 0, 10); // up to +10

  const reversalPenalty = clamp(reversalRate * 60, 0, 30); // up to -30
  const overturnPenalty = clamp(overturnRate * 45, 0, 25); // up to -25

  const statusPenalty = mod.status === 'suspended' ? 20 : mod.status === 'paused' ? 6 : 0;

  const trustBonus = mod.trust === 'senior' ? 4 : mod.trust === 'trusted' ? 2 : 0;

  const score = base + tenureBonus + volumeBonus + trustBonus - reversalPenalty - overturnPenalty - statusPenalty;
  return clamp(Math.round(score), 0, 100);
}

/* ──────────────────────────────────────────────────────────────────────────────
   Page
────────────────────────────────────────────────────────────────────────────── */
type TabKey = 'mods' | 'appeals' | 'raid';

export default function ModeratorsPage() {
  const [tab, setTab] = useState<TabKey>('mods');

  const [mods, setMods] = useState<Mod[]>(SEED_MODS);
  const [appeals, setAppeals] = useState<Appeal[]>(SEED_APPEALS);

  // Filters
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ModStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<'reputation' | 'actions' | 'recent'>('reputation');

  // Drawer
  const [selectedModId, setSelectedModId] = useState<string | null>(null);

  // Raid Mode
  const [raidConfig, setRaidConfig] = useState<RaidConfig>({
    enabled: false,
    presetId: undefined,
    slowModeSeconds: 10,
    followersOnly: false,
    minAccountAgeDays: 0,
    linkFiltering: 'off',
    capsFilter: false,
    keywordLock: false,
    autoTimeoutNewAccounts: false,
    autoTimeoutSeconds: 30,
  });

  // Close drawer on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedModId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const roleById = useMemo(() => {
    const map = new Map<string, RoleTemplate>();
    ROLE_TEMPLATES.forEach((r) => map.set(r.id, r));
    return map;
  }, []);

  const modsWithReputation = useMemo(() => {
    return mods.map((m) => ({ ...m, reputation: computeReputation(m) }));
  }, [mods]);

  const filteredMods = useMemo(() => {
    const q = query.trim().toLowerCase();

    let out = modsWithReputation.filter((m) => {
      const role = roleById.get(m.roleId);
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.handle.toLowerCase().includes(q) ||
        role?.name.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'all' ? true : m.roleId === roleFilter;
      const matchesStatus = statusFilter === 'all' ? true : m.status === statusFilter;

      return matchesQuery && matchesRole && matchesStatus;
    });

    if (sortKey === 'reputation') out.sort((a, b) => b.reputation - a.reputation);
    if (sortKey === 'actions') out.sort((a, b) => b.stats.actionsTotal - a.stats.actionsTotal);
    if (sortKey === 'recent') out.sort((a, b) => b.lastActiveAt - a.lastActiveAt);

    return out;
  }, [modsWithReputation, query, roleFilter, statusFilter, sortKey, roleById]);

  const selectedMod = useMemo(() => {
    if (!selectedModId) return null;
    return modsWithReputation.find((m) => m.id === selectedModId) ?? null;
  }, [selectedModId, modsWithReputation]);

  const openAppeals = useMemo(() => appeals.filter((a) => a.status === 'open'), [appeals]);
  const appealsApproved = useMemo(() => appeals.filter((a) => a.status === 'approved'), [appeals]);
  const appealsDenied = useMemo(() => appeals.filter((a) => a.status === 'denied'), [appeals]);

  // Actions (demo)
  const toggleModStatus = (id: string, next: ModStatus) => {
    setMods((prev) => prev.map((m) => (m.id === id ? { ...m, status: next } : m)));
  };

  const applyRaidPreset = (presetId: RaidPresetId) => {
    if (presetId === 'shield') {
      setRaidConfig((c) => ({
        ...c,
        enabled: true,
        presetId,
        slowModeSeconds: 15,
        followersOnly: false,
        minAccountAgeDays: 7,
        linkFiltering: 'trusted-only',
        capsFilter: true,
        keywordLock: false,
        autoTimeoutNewAccounts: true,
        autoTimeoutSeconds: 30,
      }));
    }
    if (presetId === 'followers-only') {
      setRaidConfig((c) => ({
        ...c,
        enabled: true,
        presetId,
        slowModeSeconds: 10,
        followersOnly: true,
        minAccountAgeDays: 3,
        linkFiltering: 'strict',
        capsFilter: true,
        keywordLock: false,
        autoTimeoutNewAccounts: true,
        autoTimeoutSeconds: 45,
      }));
    }
    if (presetId === 'lockdown') {
      setRaidConfig((c) => ({
        ...c,
        enabled: true,
        presetId,
        slowModeSeconds: 30,
        followersOnly: true,
        minAccountAgeDays: 14,
        linkFiltering: 'strict',
        capsFilter: true,
        keywordLock: true,
        autoTimeoutNewAccounts: true,
        autoTimeoutSeconds: 60,
      }));
    }
  };

  const resolveAppeal = (id: string, status: AppealStatus, internalNote?: string) => {
    setAppeals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status, internalNote: internalNote ?? a.internalNote } : a))
    );
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Top header */}
      <div className="flex w-full min-w-0 flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-bold text-zinc-100">🛡️ Moderation Team</h1>
            <Chip tone="emerald">
              <FiUsers />
              {mods.length} moderators
            </Chip>
            <Chip tone="sky">
              <FiBell />
              {openAppeals.length} open appeals
            </Chip>
            <Chip tone="amber">
              <FiShield />
              Raid Mode: {raidConfig.enabled ? 'On' : 'Off'}
            </Chip>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Reputation scoring, appeals queue, and raid presets — designed for safer teams and fewer mistakes.
          </p>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-72">
            <Input value={query} onChange={setQuery} placeholder="Search mods by name, handle, role…" right={<FiSearch />} />
          </div>

          <Button
            tone="zinc"
            icon={<FiPlus />}
            onClick={() => {
              // demo placeholder
              alert('Add Moderator (wire to invite flow later)');
            }}
          >
            Add mod
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-full min-w-0 flex-wrap gap-2">
        <TabButton active={tab === 'mods'} onClick={() => setTab('mods')} icon={<FiUsers />}>
          Moderators
        </TabButton>
        <TabButton active={tab === 'appeals'} onClick={() => setTab('appeals')} icon={<FiAlertTriangle />}>
          Appeals Queue
          {openAppeals.length ? (
            <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white">{openAppeals.length}</span>
          ) : null}
        </TabButton>
        <TabButton active={tab === 'raid'} onClick={() => setTab('raid')} icon={<FiZap />}>
          Raid Mode
        </TabButton>
      </div>

      {/* Content */}
      {tab === 'mods' ? (
        <div className="grid w-full min-w-0 grid-cols-12 gap-4">
          {/* Left: list */}
          <div className="col-span-12 xl:col-span-8">
            <Card
              title="Moderator Roster"
              icon={<FiUsers className="text-emerald-400" />}
              right={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
                    <FiFilter />
                    Filters
                  </span>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-600"
                  >
                    <option value="all">All roles</option>
                    {ROLE_TEMPLATES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-600"
                  >
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="suspended">Suspended</option>
                  </select>

                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as any)}
                    className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-600"
                  >
                    <option value="reputation">Sort: Reputation</option>
                    <option value="actions">Sort: Actions</option>
                    <option value="recent">Sort: Recent</option>
                  </select>
                </div>
              }
            >
              <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                {filteredMods.map((m) => {
                  const role = roleById.get(m.roleId);
                  const rep = (m as any).reputation as number;

                  const statusTone: Tone =
                    m.status === 'active' ? 'emerald' : m.status === 'paused' ? 'amber' : 'rose';
                  const trustTone: Tone = m.trust === 'senior' ? 'rose' : m.trust === 'trusted' ? 'sky' : 'zinc';

                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModId(m.id)}
                      className="w-full min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left hover:border-zinc-700"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Avatar name={m.name} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-zinc-100">{m.name}</div>
                              <div className="truncate text-xs text-zinc-500">{m.handle}</div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Chip tone={role?.tone ?? 'zinc'}>
                              <FiTag />
                              {role?.name ?? 'Role'}
                            </Chip>
                            <Chip tone={statusTone}>{m.status}</Chip>
                            <Chip tone={trustTone}>
                              <FiAward />
                              {m.trust}
                            </Chip>
                          </div>
                        </div>

                        <div className="flex flex-none items-center gap-2">
                          <Chip tone={rep >= 85 ? 'emerald' : rep >= 70 ? 'sky' : rep >= 55 ? 'amber' : 'rose'}>
                            Rep {rep}
                          </Chip>
                          <FiChevronRight className="text-zinc-500" />
                        </div>
                      </div>

                      <div className="mt-3">
                        <Progress value={rep} />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                          <span className="inline-flex items-center gap-1">
                            <FiClock /> Active {fmtRelative(m.lastActiveAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FiSlash /> Reversals {m.stats.reversals}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FiShield /> Actions {m.stats.actionsTotal}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!filteredMods.length ? (
                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-10 text-center text-sm text-zinc-500">
                  No moderators match those filters.
                </div>
              ) : null}
            </Card>
          </div>

          {/* Right: role templates + scoring explainer */}
          <div className="col-span-12 xl:col-span-4 space-y-4">
            <Card
              title="Role Templates (fast + safe)"
              icon={<FiShield className="text-sky-400" />}
              right={
                <Button tone="zinc" icon={<FiRefreshCw />} onClick={() => alert('Sync templates (wire later)')}>
                  Sync
                </Button>
              }
            >
              <div className="space-y-3">
                {ROLE_TEMPLATES.map((r) => (
                  <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Chip tone={r.tone}>{r.name}</Chip>
                      <span className="text-xs text-zinc-500">{r.permissions.length} perms</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">{r.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.permissions.slice(0, 6).map((p) => (
                        <Chip key={p} tone="zinc">
                          {p}
                        </Chip>
                      ))}
                      {r.permissions.length > 6 ? <Chip tone="zinc">+{r.permissions.length - 6} more</Chip> : null}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Reputation Score (explainable)" icon={<FiAward className="text-emerald-400" />}>
              <div className="space-y-2 text-sm text-zinc-300">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className="font-medium text-zinc-200">Why it’s better</div>
                  <p className="mt-1 text-zinc-400">
                    Most platforms don’t quantify moderation quality. Here we score performance using a few signals:
                    reversals, appeals overturns, tenure, and action volume — capped and easy to audit.
                  </p>
                </div>
                <ul className="space-y-2 text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-400">
                      <FiCheck />
                    </span>
                    Lower reversal & overturn rates improve score.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-400">
                      <FiCheck />
                    </span>
                    Tenure + volume bonuses are capped (no “farm actions”).
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-400">
                      <FiCheck />
                    </span>
                    Status penalties (paused/suspended) prevent false confidence.
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'appeals' ? (
        <div className="grid w-full min-w-0 grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-8">
            <Card
              title="Appeals Queue (fast resolution)"
              icon={<FiAlertTriangle className="text-amber-300" />}
              right={
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="rose">{openAppeals.length} open</Chip>
                  <Chip tone="emerald">{appealsApproved.length} approved</Chip>
                  <Chip tone="zinc">{appealsDenied.length} denied</Chip>
                </div>
              }
            >
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {appeals.map((a) => {
                  const mod = modsWithReputation.find((m) => m.id === a.byModId);
                  return (
                    <div key={a.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-zinc-100">
                            {a.user.name}{' '}
                            <span className="text-xs font-normal text-zinc-500">{a.user.handle}</span>
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            Action: <span className="text-zinc-300">{a.action.type}</span>{' '}
                            {a.action.duration ? <span className="text-zinc-400">({a.action.duration})</span> : null}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            By: <span className="text-zinc-300">{mod?.name ?? 'Unknown mod'}</span> • {fmtRelative(a.createdAt)}
                          </div>
                        </div>
                        <Chip tone={a.status === 'open' ? 'rose' : a.status === 'approved' ? 'emerald' : 'zinc'}>
                          {a.status}
                        </Chip>
                      </div>

                      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 text-sm text-zinc-300">
                        {a.reason}
                      </div>

                      {a.status === 'open' ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            tone="emerald"
                            icon={<FiCheck />}
                            onClick={() => resolveAppeal(a.id, 'approved', 'Approved (demo)')}
                            className="flex-1"
                          >
                            Approve
                          </Button>
                          <Button
                            tone="rose"
                            icon={<FiX />}
                            onClick={() => resolveAppeal(a.id, 'denied', 'Denied (demo)')}
                            className="flex-1"
                          >
                            Deny
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-zinc-500">
                          Internal note: <span className="text-zinc-300">{a.internalNote ?? '—'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="w-full overflow-x-auto">
                  <table className="min-w-[820px] w-full text-left text-sm">
                    <thead className="text-xs text-zinc-500">
                      <tr className="border-b border-zinc-800">
                        <th className="px-2 py-2">User</th>
                        <th className="px-2 py-2">Action</th>
                        <th className="px-2 py-2">By</th>
                        <th className="px-2 py-2">Created</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appeals.map((a) => {
                        const mod = modsWithReputation.find((m) => m.id === a.byModId);
                        return (
                          <tr key={a.id} className="border-b border-zinc-800/60">
                            <td className="px-2 py-3">
                              <div className="text-zinc-100">{a.user.name}</div>
                              <div className="text-xs text-zinc-500">{a.user.handle}</div>
                            </td>
                            <td className="px-2 py-3 text-zinc-300">
                              {a.action.type} {a.action.duration ? <span className="text-zinc-500">({a.action.duration})</span> : null}
                            </td>
                            <td className="px-2 py-3 text-zinc-300">{mod?.name ?? 'Unknown'}</td>
                            <td className="px-2 py-3 text-zinc-500">{fmtRelative(a.createdAt)}</td>
                            <td className="px-2 py-3">
                              <Chip tone={a.status === 'open' ? 'rose' : a.status === 'approved' ? 'emerald' : 'zinc'}>{a.status}</Chip>
                            </td>
                            <td className="px-2 py-3">
                              {a.status === 'open' ? (
                                <div className="flex flex-wrap gap-2">
                                  <Button tone="emerald" icon={<FiCheck />} onClick={() => resolveAppeal(a.id, 'approved', 'Approved (demo)')}>
                                    Approve
                                  </Button>
                                  <Button tone="rose" icon={<FiX />} onClick={() => resolveAppeal(a.id, 'denied', 'Denied (demo)')}>
                                    Deny
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-500">{a.internalNote ?? '—'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>

          <div className="col-span-12 xl:col-span-4 space-y-4">
            <Card title="What’s different vs most platforms" icon={<FiShield className="text-emerald-400" />}>
              <div className="space-y-2 text-sm text-zinc-400">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className="text-zinc-200 font-medium">Appeals are first-class</div>
                  <p className="mt-1">
                    Instead of scattered DMs, you get a queue with decisions, notes, and a clean audit trail — safer for you and your mods.
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className="text-zinc-200 font-medium">Less liability</div>
                  <p className="mt-1">
                    Decisions are documented, consistent, and exportable. That’s huge when something escalates.
                  </p>
                </div>
              </div>
            </Card>

            <Card title="Quick Actions (demo)" icon={<FiClock className="text-sky-400" />}>
              <div className="flex flex-wrap gap-2">
                <Button tone="zinc" icon={<FiRefreshCw />} onClick={() => alert('Refresh queue (wire later)')}>
                  Refresh
                </Button>
                <Button
                  tone="zinc"
                  icon={<FiLock />}
                  onClick={() => alert('Require 2-step approval for bans/purges (wire later)')}
                >
                  Enable dual-control
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'raid' ? (
        <div className="grid w-full min-w-0 grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-7 space-y-4">
            <Card
              title="Raid Mode Presets (one-click defense)"
              icon={<FiZap className="text-amber-300" />}
              right={
                <Chip tone={raidConfig.enabled ? 'emerald' : 'zinc'}>
                  <FiShield /> {raidConfig.enabled ? 'Enabled' : 'Disabled'}
                </Chip>
              }
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <PresetCard
                  title="Shield"
                  tone="sky"
                  subtitle="Soft protection"
                  bullets={['Trusted-only links', 'Account age ≥ 7 days', 'Auto-timeout new accounts']}
                  onApply={() => applyRaidPreset('shield')}
                />
                <PresetCard
                  title="Followers-Only"
                  tone="amber"
                  subtitle="Medium lockdown"
                  bullets={['Followers-only chat', 'Strict links', 'Auto-timeout new accounts']}
                  onApply={() => applyRaidPreset('followers-only')}
                />
                <PresetCard
                  title="Lockdown"
                  tone="rose"
                  subtitle="Hard defense"
                  bullets={['Followers-only + age ≥ 14', 'Keyword lock', 'Slowmode 30s']}
                  onApply={() => applyRaidPreset('lockdown')}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button tone={raidConfig.enabled ? 'rose' : 'emerald'} icon={<FiShield />} onClick={() => setRaidConfig((c) => ({ ...c, enabled: !c.enabled }))}>
                  {raidConfig.enabled ? 'Disable Raid Mode' : 'Enable Raid Mode'}
                </Button>
                <Button tone="zinc" icon={<FiRefreshCw />} onClick={() => setRaidConfig((c) => ({ ...c, presetId: undefined }))}>
                  Clear preset tag
                </Button>
              </div>
            </Card>

            <Card title="Fine Controls" icon={<FiSlidersMini />} bodyClassName="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Toggle
                  on={raidConfig.followersOnly}
                  onToggle={() => setRaidConfig((c) => ({ ...c, followersOnly: !c.followersOnly }))}
                  label="Followers-only chat"
                  description="Stops drive-by spam from brand new viewers."
                />
                <Toggle
                  on={raidConfig.capsFilter}
                  onToggle={() => setRaidConfig((c) => ({ ...c, capsFilter: !c.capsFilter }))}
                  label="Caps / spam filter"
                  description="Auto-detect excessive caps + repetitive messages."
                />
                <Toggle
                  on={raidConfig.keywordLock}
                  onToggle={() => setRaidConfig((c) => ({ ...c, keywordLock: !c.keywordLock }))}
                  label="Keyword lock"
                  description="Temporarily blocks risky keywords while under attack."
                />
                <Toggle
                  on={raidConfig.autoTimeoutNewAccounts}
                  onToggle={() => setRaidConfig((c) => ({ ...c, autoTimeoutNewAccounts: !c.autoTimeoutNewAccounts }))}
                  label="Auto-timeout new accounts"
                  description="Auto-timeouts accounts below the min-age threshold."
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <NumberField
                  label="Slow mode (seconds)"
                  value={raidConfig.slowModeSeconds}
                  min={0}
                  max={120}
                  onChange={(v) => setRaidConfig((c) => ({ ...c, slowModeSeconds: v }))}
                />
                <NumberField
                  label="Min account age (days)"
                  value={raidConfig.minAccountAgeDays}
                  min={0}
                  max={365}
                  onChange={(v) => setRaidConfig((c) => ({ ...c, minAccountAgeDays: v }))}
                />
                <NumberField
                  label="Auto-timeout (seconds)"
                  value={raidConfig.autoTimeoutSeconds}
                  min={5}
                  max={600}
                  onChange={(v) => setRaidConfig((c) => ({ ...c, autoTimeoutSeconds: v }))}
                />
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-sm font-medium text-zinc-200">Link filtering</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['off', 'trusted-only', 'strict'] as const).map((k) => (
                    <Button
                      key={k}
                      tone={raidConfig.linkFiltering === k ? 'emerald' : 'zinc'}
                      onClick={() => setRaidConfig((c) => ({ ...c, linkFiltering: k }))}
                      className="px-3 py-2 text-xs"
                    >
                      {k}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  “Trusted-only” allows links from trusted users/mods. “Strict” blocks most links.
                </p>
              </div>
            </Card>
          </div>

          <div className="col-span-12 xl:col-span-5 space-y-4">
            <Card title="Live Preview (what will happen)" icon={<FiShield className="text-emerald-400" />}>
              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-zinc-500">Status</span>
                  <Chip tone={raidConfig.enabled ? 'emerald' : 'zinc'}>{raidConfig.enabled ? 'On' : 'Off'}</Chip>
                </div>

                <PreviewRow label="Preset tag" value={raidConfig.presetId ?? '—'} />
                <PreviewRow label="Followers-only" value={raidConfig.followersOnly ? 'Yes' : 'No'} />
                <PreviewRow label="Slowmode" value={`${raidConfig.slowModeSeconds}s`} />
                <PreviewRow label="Min account age" value={`${raidConfig.minAccountAgeDays} days`} />
                <PreviewRow label="Link filtering" value={raidConfig.linkFiltering} />
                <PreviewRow label="Caps filter" value={raidConfig.capsFilter ? 'On' : 'Off'} />
                <PreviewRow label="Keyword lock" value={raidConfig.keywordLock ? 'On' : 'Off'} />
                <PreviewRow
                  label="Auto-timeout"
                  value={raidConfig.autoTimeoutNewAccounts ? `On (${raidConfig.autoTimeoutSeconds}s)` : 'Off'}
                />
              </div>

              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500">
                Pro idea: log “raid events” and auto-suggest the best preset based on spam rate + account age distribution.
              </div>
            </Card>

            <Card title="Why this beats most platforms" icon={<FiAward className="text-sky-400" />}>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-400">
                    <FiCheck />
                  </span>
                  One-click presets + editable controls (most platforms are either too simple or too hidden).
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-400">
                    <FiCheck />
                  </span>
                  Preview is explicit — everyone knows what’s active during a raid.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-400">
                    <FiCheck />
                  </span>
                  Built to support dual-control for extreme actions later.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Drawer */}
      {selectedMod ? (
        <>
          <button
            aria-label="Close moderator drawer"
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setSelectedModId(null)}
          />
          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-[520px] overflow-y-auto border-l border-zinc-800 bg-zinc-950">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Avatar name={selectedMod.name} />
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-zinc-100">{selectedMod.name}</div>
                    <div className="truncate text-sm text-zinc-500">{selectedMod.handle}</div>
                  </div>
                </div>
              </div>
              <Button tone="zinc" icon={<FiX />} onClick={() => setSelectedModId(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <Card
                title="Performance"
                icon={<FiAward className="text-emerald-400" />}
                right={
                  <Chip
                    tone={
                      (selectedMod as any).reputation >= 85
                        ? 'emerald'
                        : (selectedMod as any).reputation >= 70
                        ? 'sky'
                        : (selectedMod as any).reputation >= 55
                        ? 'amber'
                        : 'rose'
                    }
                  >
                    Rep {(selectedMod as any).reputation}
                  </Chip>
                }
                className="bg-zinc-900"
              >
                <div className="space-y-3">
                  <Progress value={(selectedMod as any).reputation} />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Actions" value={selectedMod.stats.actionsTotal.toLocaleString()} />
                    <Stat label="Reversals" value={selectedMod.stats.reversals.toLocaleString()} />
                    <Stat label="Appeals reviewed" value={selectedMod.stats.appealsReviewed.toLocaleString()} />
                    <Stat label="Appeals overturned" value={selectedMod.stats.appealsOverturned.toLocaleString()} />
                  </div>
                  <div className="text-xs text-zinc-500">
                    Tenure: {Math.floor((Date.now() - selectedMod.addedAt) / (1000 * 60 * 60 * 24))} days • Last active:{' '}
                    {fmtRelative(selectedMod.lastActiveAt)}
                  </div>
                </div>
              </Card>

              <Card title="Role & Permissions" icon={<FiShield className="text-sky-400" />}>
                {(() => {
                  const role = roleById.get(selectedMod.roleId);
                  if (!role) return <div className="text-sm text-zinc-500">Role not found.</div>;
                  return (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip tone={role.tone}>{role.name}</Chip>
                        <Chip tone={selectedMod.status === 'active' ? 'emerald' : selectedMod.status === 'paused' ? 'amber' : 'rose'}>
                          {selectedMod.status}
                        </Chip>
                        <Chip tone={selectedMod.trust === 'senior' ? 'rose' : selectedMod.trust === 'trusted' ? 'sky' : 'zinc'}>
                          <FiAward /> {selectedMod.trust}
                        </Chip>
                      </div>
                      <p className="text-sm text-zinc-400">{role.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map((p) => (
                          <Chip key={p} tone="zinc">
                            {p}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Card>

              <Card title="Guardrails (demo)" icon={<FiLock className="text-amber-300" />}>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                    <div className="text-zinc-200 font-medium">Dual-control for high-risk actions</div>
                    <p className="mt-1">
                      Require 2-step approval for bans/purges when enabled (prevents misclicks + rogue actions).
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button tone="zinc" icon={<FiLock />} onClick={() => alert('Enable dual-control (wire later)')}>
                      Enable dual-control
                    </Button>
                    <Button tone="zinc" icon={<FiClock />} onClick={() => alert('Set action rate limits (wire later)')}>
                      Rate limits
                    </Button>
                  </div>
                </div>
              </Card>

              <Card title="Admin Actions" icon={<FiShield className="text-rose-400" />}>
                <div className="flex flex-wrap gap-2">
                  {selectedMod.status !== 'suspended' ? (
                    <Button tone="rose" icon={<FiSlash />} onClick={() => toggleModStatus(selectedMod.id, 'suspended')}>
                      Suspend
                    </Button>
                  ) : (
                    <Button tone="emerald" icon={<FiCheck />} onClick={() => toggleModStatus(selectedMod.id, 'active')}>
                      Reinstate
                    </Button>
                  )}
                  {selectedMod.status === 'active' ? (
                    <Button tone="amber" icon={<FiClock />} onClick={() => toggleModStatus(selectedMod.id, 'paused')}>
                      Pause
                    </Button>
                  ) : (
                    <Button tone="zinc" icon={<FiCheck />} onClick={() => toggleModStatus(selectedMod.id, 'active')}>
                      Set active
                    </Button>
                  )}
                  <Button tone="zinc" icon={<FiUsers />} onClick={() => alert('Edit role (wire later)')}>
                    Change role
                  </Button>
                </div>
              </Card>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Small helpers / subcomponents
────────────────────────────────────────────────────────────────────────────── */
function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
        active ? 'border-emerald-600 bg-emerald-600/10 text-emerald-200' : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700'
      }`}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
  return (
    <div className="grid h-9 w-9 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-200">
      {initials}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function PresetCard({
  title,
  subtitle,
  bullets,
  onApply,
  tone,
}: {
  title: string;
  subtitle: string;
  bullets: string[];
  onApply: () => void;
  tone: Tone;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Chip tone={tone}>{title}</Chip>
          </div>
          <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
        </div>
        <Button tone="emerald" icon={<FiZap />} onClick={onApply} className="px-3 py-2 text-xs">
          Apply
        </Button>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-zinc-400">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-400">
              <FiCheck />
            </span>
            <span className="min-w-0">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(clamp(parseInt(e.target.value || '0', 10), min, max))}
          className="w-24 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-600"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10), min, max))}
          className="w-full accent-emerald-500"
        />
      </div>
    </div>
  );
}

function FiSlidersMini() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-zinc-200">
      <FiFilter />
    </span>
  );
}
