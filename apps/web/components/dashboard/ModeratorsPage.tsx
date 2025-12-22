// apps/web/components/dashboard/ModeratorsPage.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiShield,
  FiUserPlus,
  FiSearch,
  FiMoreVertical,
  FiTrash2,
  FiEdit3,
  FiCheck,
  FiX,
  FiClock,
  FiAlertTriangle,
  FiLock,
  FiUnlock,
  FiDownload,
  FiUpload,
  FiInfo,
  FiUsers,
} from 'react-icons/fi';

/* ──────────────────────────────────────────────────────────────────────────────
  Moderators Page (Mock UI)
  - Mobile-safe: min-w-0, overflow-x-hidden, responsive grid, sticky filters
  - Organized: small primitives + clear sections
  - “Better than others”: permission templates, trust score, audit trail, bulk actions
────────────────────────────────────────────────────────────────────────────── */

type Role = 'Owner' | 'Admin' | 'Moderator' | 'Helper' | 'Bot';

type ModStatus = 'active' | 'invited' | 'suspended';

type Risk = 'low' | 'med' | 'high';

type PermissionKey =
  | 'chat:read'
  | 'chat:timeout'
  | 'chat:ban'
  | 'chat:delete'
  | 'chat:slowmode'
  | 'chat:links'
  | 'mods:manage'
  | 'settings:moderation'
  | 'vod:moderate'
  | 'reports:review';

type Permission = {
  key: PermissionKey;
  label: string;
  risk: Risk;
};

type Moderator = {
  id: string;
  name: string;
  handle: string;
  role: Role;
  status: ModStatus;
  verified: boolean;
  trustScore: number; // 0-100
  lastActiveAt: number; // epoch ms
  joinedAt: number;
  notes?: string;
  permissions: PermissionKey[];
};

type AuditEvent = {
  id: string;
  at: number;
  actor: string;
  action: string;
  target?: string;
  severity: 'info' | 'warn' | 'danger';
};

const ALL_PERMS: Permission[] = [
  { key: 'chat:read', label: 'Read chat', risk: 'low' },
  { key: 'chat:delete', label: 'Delete messages', risk: 'med' },
  { key: 'chat:timeout', label: 'Timeout users', risk: 'med' },
  { key: 'chat:ban', label: 'Ban users', risk: 'high' },
  { key: 'chat:slowmode', label: 'Toggle slow mode', risk: 'med' },
  { key: 'chat:links', label: 'Link controls', risk: 'med' },
  { key: 'reports:review', label: 'Review reports', risk: 'med' },
  { key: 'vod:moderate', label: 'Moderate VOD/comments', risk: 'med' },
  { key: 'settings:moderation', label: 'Edit moderation settings', risk: 'high' },
  { key: 'mods:manage', label: 'Manage moderators', risk: 'high' },
];

const PERM_TEMPLATES: { id: string; name: string; description: string; perms: PermissionKey[] }[] = [
  {
    id: 'helper',
    name: 'Helper',
    description: 'Basic cleanup without heavy powers.',
    perms: ['chat:read', 'chat:delete', 'reports:review'],
  },
  {
    id: 'mod',
    name: 'Moderator',
    description: 'Standard real-time moderation toolkit.',
    perms: ['chat:read', 'chat:delete', 'chat:timeout', 'chat:slowmode', 'chat:links', 'reports:review', 'vod:moderate'],
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Trusted staff; includes high-risk actions.',
    perms: ['chat:read', 'chat:delete', 'chat:timeout', 'chat:ban', 'chat:slowmode', 'chat:links', 'reports:review', 'vod:moderate', 'settings:moderation', 'mods:manage'],
  },
];

const SEED_MODS: Moderator[] = [
  {
    id: 'm1',
    name: 'Avery',
    handle: '@avery_mod',
    role: 'Admin',
    status: 'active',
    verified: true,
    trustScore: 92,
    lastActiveAt: Date.now() - 1000 * 60 * 12,
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 210,
    notes: 'Covers late-night streams, great judgement.',
    permissions: PERM_TEMPLATES.find((t) => t.id === 'admin')!.perms,
  },
  {
    id: 'm2',
    name: 'Jordan',
    handle: '@jordan',
    role: 'Moderator',
    status: 'active',
    verified: false,
    trustScore: 78,
    lastActiveAt: Date.now() - 1000 * 60 * 60 * 2,
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 64,
    notes: 'Fast on spam, needs ban escalation approval.',
    permissions: PERM_TEMPLATES.find((t) => t.id === 'mod')!.perms.filter((p) => p !== 'chat:ban'),
  },
  {
    id: 'm3',
    name: 'Kai',
    handle: '@kai_helper',
    role: 'Helper',
    status: 'invited',
    verified: false,
    trustScore: 60,
    lastActiveAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    notes: 'Pending acceptance.',
    permissions: PERM_TEMPLATES.find((t) => t.id === 'helper')!.perms,
  },
  {
    id: 'm4',
    name: 'AutoMod Bot',
    handle: '@wegolive_guardian',
    role: 'Bot',
    status: 'active',
    verified: true,
    trustScore: 88,
    lastActiveAt: Date.now() - 1000 * 60 * 3,
    joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    notes: 'Auto-detects spam and hate speech (soft actions only).',
    permissions: ['chat:read', 'chat:delete', 'reports:review'],
  },
];

const SEED_AUDIT: AuditEvent[] = [
  { id: 'a1', at: Date.now() - 1000 * 60 * 18, actor: 'You', action: 'Updated permissions', target: '@jordan', severity: 'info' },
  { id: 'a2', at: Date.now() - 1000 * 60 * 60 * 3, actor: '@avery_mod', action: 'Timed out user', target: '@toxic_spam_91', severity: 'warn' },
  { id: 'a3', at: Date.now() - 1000 * 60 * 60 * 26, actor: 'AutoMod Bot', action: 'Deleted spam links', target: '7 messages', severity: 'warn' },
  { id: 'a4', at: Date.now() - 1000 * 60 * 60 * 72, actor: 'You', action: 'Invited moderator', target: '@kai_helper', severity: 'info' },
];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function fmtRelative(ms: number) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

/* ──────────────────────────────────────────────────────────────────────────────
  Tiny UI Primitives
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
    <section className={cx('rounded-xl border border-zinc-800 bg-zinc-950/50', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          {icon}
          <span>{title}</span>
        </div>
        {right}
      </header>
      <div className={cx('p-4', bodyClass)}>{children}</div>
    </section>
  );
}

function Chip({ tone = 'zinc', children }: { tone?: 'zinc' | 'emerald' | 'rose' | 'amber' | 'sky'; children: React.ReactNode }) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-800/70 text-zinc-200 ring-zinc-700',
    emerald: 'bg-emerald-600/20 text-emerald-300 ring-emerald-600/30',
    rose: 'bg-rose-600/20 text-rose-300 ring-rose-600/30',
    amber: 'bg-amber-600/20 text-amber-300 ring-amber-600/30',
    sky: 'bg-sky-600/20 text-sky-300 ring-sky-600/30',
  };
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1', map[tone])}>{children}</span>;
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
  tone?: 'zinc' | 'emerald' | 'rose';
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-100',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white',
    rose: 'bg-rose-600 hover:bg-rose-500 border-rose-600 text-white',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition disabled:opacity-60',
        map[tone],
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  left,
  right,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      {left && <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">{left}</div>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(
          'w-full min-w-0 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600',
          left ? 'pl-10' : '',
          right ? 'pr-10' : ''
        )}
      />
      {right && <div className="absolute inset-y-0 right-2 flex items-center">{right}</div>}
    </div>
  );
}

function DividerLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-zinc-800" />
      <div className="text-xs text-zinc-400">{children}</div>
      <div className="h-px flex-1 bg-zinc-800" />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
  Page
────────────────────────────────────────────────────────────────────────────── */

export default function ModeratorsPage() {
  const [mods, setMods] = useState<Moderator[]>(SEED_MODS);
  const [audit, setAudit] = useState<AuditEvent[]>(SEED_AUDIT);

  // filters
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | 'All'>('All');
  const [status, setStatus] = useState<ModStatus | 'all'>('all');
  const [sort, setSort] = useState<'trust' | 'recent' | 'alpha'>('trust');

  // selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  // drawers/modals (simple inline panels)
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<Moderator | null>(null);

  // invite form
  const [inviteHandle, setInviteHandle] = useState('');
  const [inviteTemplate, setInviteTemplate] = useState(PERM_TEMPLATES[1].id);

  const stats = useMemo(() => {
    const active = mods.filter((m) => m.status === 'active').length;
    const invited = mods.filter((m) => m.status === 'invited').length;
    const suspended = mods.filter((m) => m.status === 'suspended').length;
    const avgTrust = mods.length ? Math.round(mods.reduce((a, b) => a + b.trustScore, 0) / mods.length) : 0;
    return { active, invited, suspended, avgTrust };
  }, [mods]);

  const filtered = useMemo(() => {
    let list = mods.slice();

    if (q.trim()) {
      const qq = q.toLowerCase();
      list = list.filter((m) => `${m.name} ${m.handle}`.toLowerCase().includes(qq));
    }
    if (role !== 'All') list = list.filter((m) => m.role === role);
    if (status !== 'all') list = list.filter((m) => m.status === status);

    if (sort === 'trust') list.sort((a, b) => b.trustScore - a.trustScore);
    if (sort === 'recent') list.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    if (sort === 'alpha') list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [mods, q, role, status, sort]);

  const clearSelection = () => setSelected({});
  const toggleSelectAll = () => {
    const allVisibleSelected = filtered.every((m) => selected[m.id]);
    if (allVisibleSelected) {
      // unselect visible
      const next = { ...selected };
      filtered.forEach((m) => delete next[m.id]);
      setSelected(next);
    } else {
      // select visible
      const next = { ...selected };
      filtered.forEach((m) => (next[m.id] = true));
      setSelected(next);
    }
  };

  const addAudit = (evt: Omit<AuditEvent, 'id'>) => {
    setAudit((prev) => [{ id: `evt_${Math.random().toString(36).slice(2, 9)}`, ...evt }, ...prev].slice(0, 50));
  };

  const bulkSuspend = () => {
    if (!selectedIds.length) return;
    setMods((prev) =>
      prev.map((m) => (selectedIds.includes(m.id) ? { ...m, status: 'suspended' } : m))
    );
    addAudit({ at: Date.now(), actor: 'You', action: 'Suspended moderators', target: `${selectedIds.length} accounts`, severity: 'danger' });
    clearSelection();
  };

  const bulkReinstate = () => {
    if (!selectedIds.length) return;
    setMods((prev) => prev.map((m) => (selectedIds.includes(m.id) ? { ...m, status: 'active' } : m)));
    addAudit({ at: Date.now(), actor: 'You', action: 'Reinstated moderators', target: `${selectedIds.length} accounts`, severity: 'info' });
    clearSelection();
  };

  const bulkRemove = () => {
    if (!selectedIds.length) return;
    setMods((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
    addAudit({ at: Date.now(), actor: 'You', action: 'Removed moderators', target: `${selectedIds.length} accounts`, severity: 'danger' });
    clearSelection();
  };

  const invite = () => {
    const handle = inviteHandle.trim();
    if (!handle) return;

    const tmpl = PERM_TEMPLATES.find((t) => t.id === inviteTemplate) ?? PERM_TEMPLATES[1];

    const next: Moderator = {
      id: `m_${Math.random().toString(36).slice(2, 9)}`,
      name: handle.replace(/^@/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      handle: handle.startsWith('@') ? handle : `@${handle}`,
      role: tmpl.id === 'admin' ? 'Admin' : tmpl.id === 'helper' ? 'Helper' : 'Moderator',
      status: 'invited',
      verified: false,
      trustScore: 50,
      lastActiveAt: Date.now() - 1000 * 60 * 60 * 24,
      joinedAt: Date.now(),
      permissions: tmpl.perms,
      notes: 'Invited — pending acceptance.',
    };

    setMods((prev) => [next, ...prev]);
    addAudit({ at: Date.now(), actor: 'You', action: 'Invited moderator', target: next.handle, severity: 'info' });

    setInviteHandle('');
    setInviteOpen(false);
  };

  const openEdit = (m: Moderator) => setEditing(m);

  const saveEdit = (m: Moderator) => {
    setMods((prev) => prev.map((x) => (x.id === m.id ? m : x)));
    addAudit({ at: Date.now(), actor: 'You', action: 'Updated moderator', target: m.handle, severity: 'info' });
    setEditing(null);
  };

  const removeOne = (id: string) => {
    const target = mods.find((m) => m.id === id)?.handle ?? 'unknown';
    setMods((prev) => prev.filter((m) => m.id !== id));
    addAudit({ at: Date.now(), actor: 'You', action: 'Removed moderator', target, severity: 'danger' });
    setEditing(null);
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-2 py-3 sm:px-4 sm:py-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FiShield className="text-emerald-400" />
              <h1 className="truncate text-xl font-bold text-zinc-100">Moderators</h1>
              <Chip tone="emerald">Safety-first</Chip>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Manage roles, permissions, and audit trails. Built to reduce liability with clear controls + logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button tone="zinc" icon={<FiUpload />} onClick={() => addAudit({ at: Date.now(), actor: 'You', action: 'Imported moderator list (demo)', severity: 'info' })}>
              Import
            </Button>
            <Button tone="zinc" icon={<FiDownload />} onClick={() => addAudit({ at: Date.now(), actor: 'You', action: 'Exported moderator list (demo)', severity: 'info' })}>
              Export
            </Button>
            <Button tone="emerald" icon={<FiUserPlus />} onClick={() => setInviteOpen(true)}>
              Invite
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Active" value={stats.active} icon={<FiUsers />} />
          <StatCard label="Invited" value={stats.invited} icon={<FiClock />} />
          <StatCard label="Suspended" value={stats.suspended} icon={<FiAlertTriangle />} />
          <StatCard label="Avg trust" value={`${stats.avgTrust}%`} icon={<FiShield />} />
        </div>

        {/* Filters */}
        <div className="mt-4">
          <Card
            title="Filters"
            icon={<FiSearch className="text-zinc-300" />}
            right={
              <div className="flex items-center gap-2">
                <Chip tone="zinc">{filtered.length} shown</Chip>
                <button
                  onClick={() => {
                    setQ('');
                    setRole('All');
                    setStatus('all');
                    setSort('trust');
                  }}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Reset
                </button>
              </div>
            }
            bodyClass="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-5">
                <TextInput value={q} onChange={setQ} placeholder="Search by name or handle…" left={<FiSearch />} />
              </div>

              <div className="md:col-span-2">
                <Select
                  label="Role"
                  value={role}
                  onChange={(v) => setRole(v as Role | 'All')}
                  options={['All', 'Owner', 'Admin', 'Moderator', 'Helper', 'Bot']}
                />
              </div>

              <div className="md:col-span-2">
                <Select
                  label="Status"
                  value={status}
                  onChange={(v) => setStatus(v as ModStatus | 'all')}
                  options={['all', 'active', 'invited', 'suspended']}
                />
              </div>

              <div className="md:col-span-3">
                <Select
                  label="Sort"
                  value={sort}
                  onChange={(v) => setSort(v as any)}
                  options={['trust', 'recent', 'alpha']}
                  formatOption={(o) => (o === 'trust' ? 'Trust score' : o === 'recent' ? 'Recent activity' : 'A → Z')}
                />
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-zinc-200">
                  <span className="font-semibold">{selectedIds.length}</span> selected
                  <span className="ml-2 text-xs text-zinc-400">Bulk actions apply to selected items only.</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button tone="zinc" icon={<FiUnlock />} onClick={bulkReinstate}>
                    Reinstate
                  </Button>
                  <Button tone="zinc" icon={<FiLock />} onClick={bulkSuspend}>
                    Suspend
                  </Button>
                  <Button tone="rose" icon={<FiTrash2 />} onClick={bulkRemove}>
                    Remove
                  </Button>
                  <button onClick={clearSelection} className="text-xs text-zinc-400 hover:underline">
                    Clear
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* List */}
          <div className="lg:col-span-8 min-w-0">
            <Card
              title="Team"
              icon={<FiUsers className="text-emerald-400" />}
              right={
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs text-zinc-300 hover:text-emerald-300"
                  >
                    Toggle select visible
                  </button>
                </div>
              }
              bodyClass="p-0"
            >
              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead className="bg-zinc-950/80 text-left text-xs text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Sel</th>
                      <th className="px-4 py-3">Moderator</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Trust</th>
                      <th className="px-4 py-3">Last active</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <tr key={m.id} className="border-t border-zinc-900 hover:bg-zinc-950/40">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!selected[m.id]}
                            onChange={(e) => setSelected((prev) => ({ ...prev, [m.id]: e.target.checked }))}
                            className="h-4 w-4 accent-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <AvatarSeed seed={m.handle} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-semibold text-zinc-100">{m.name}</span>
                                {m.verified && <Chip tone="sky">Verified</Chip>}
                                {m.role === 'Bot' && <Chip tone="zinc">Automation</Chip>}
                              </div>
                              <div className="truncate text-xs text-zinc-400">{m.handle}</div>
                              {m.notes && <div className="mt-1 line-clamp-1 text-xs text-zinc-500">{m.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Chip tone={m.role === 'Admin' ? 'emerald' : m.role === 'Owner' ? 'amber' : 'zinc'}>{m.role}</Chip>
                        </td>
                        <td className="px-4 py-3">
                          <Chip tone={m.status === 'active' ? 'emerald' : m.status === 'invited' ? 'sky' : 'rose'}>
                            {m.status}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">
                          <TrustBar score={m.trustScore} />
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          {fmtRelative(m.lastActiveAt)}
                        </td>
                        <td className="px-4 py-3">
                          <RowMenu onEdit={() => openEdit(m)} />
                        </td>
                      </tr>
                    ))}
                    {!filtered.length && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-400">
                          No moderators match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
              <FiInfo className="mt-0.5" />
              <p className="min-w-0">
                “Trust score” is a platform-side metric you can compute later (response time, reversal rate, reports accuracy, etc.).
                Keeping it visible encourages safer moderation behavior.
              </p>
            </div>
          </div>

          {/* Right rail */}
          <div className="lg:col-span-4 min-w-0 space-y-4">
            <Card
              title="Permission templates"
              icon={<FiShield className="text-emerald-400" />}
              bodyClass="space-y-3"
            >
              {PERM_TEMPLATES.map((t) => (
                <div key={t.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100">{t.name}</span>
                        <Chip tone="zinc">{t.perms.length} perms</Chip>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">{t.description}</p>
                    </div>
                    <Button
                      tone="zinc"
                      className="px-2 py-1 text-xs"
                      onClick={() => {
                        setInviteTemplate(t.id);
                        setInviteOpen(true);
                      }}
                    >
                      Use
                    </Button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.perms.slice(0, 5).map((p) => (
                      <Chip key={p} tone={riskTone(permRisk(p))}>{shortPerm(p)}</Chip>
                    ))}
                    {t.perms.length > 5 && <Chip tone="zinc">+{t.perms.length - 5}</Chip>}
                  </div>
                </div>
              ))}
            </Card>

            <Card
              title="Audit trail"
              icon={<FiClock className="text-emerald-400" />}
              right={<Chip tone="zinc">{audit.length} events</Chip>}
              bodyClass="space-y-3"
            >
              {audit.slice(0, 8).map((e) => (
                <div key={e.id} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className={cx('mt-0.5 h-2.5 w-2.5 rounded-full', e.severity === 'danger' ? 'bg-rose-500' : e.severity === 'warn' ? 'bg-amber-500' : 'bg-emerald-500')} />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm text-zinc-200">{e.action}</div>
                      <div className="shrink-0 text-xs text-zinc-500">{fmtRelative(e.at)}</div>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      <span className="text-zinc-300">{e.actor}</span>
                      {e.target ? <span> → <span className="text-zinc-300">{e.target}</span></span> : null}
                    </div>
                  </div>
                </div>
              ))}
              <DividerLabel>Safety note</DividerLabel>
              <p className="text-xs text-zinc-500">
                Keeping a visible audit trail protects you and the platform: accountability reduces reckless bans/timeouts and helps with disputes.
              </p>
            </Card>
          </div>
        </div>

        {/* Invite Panel */}
        {inviteOpen && (
          <Modal onClose={() => setInviteOpen(false)} title="Invite moderator">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-6">
                  <label className="text-xs text-zinc-400">Handle</label>
                  <TextInput value={inviteHandle} onChange={setInviteHandle} placeholder="@username" left={<FiUserPlus />} />
                </div>

                <div className="sm:col-span-6">
                  <Select
                    label="Template"
                    value={inviteTemplate}
                    onChange={setInviteTemplate}
                    options={PERM_TEMPLATES.map((t) => t.id)}
                    formatOption={(id) => PERM_TEMPLATES.find((t) => t.id === id)?.name ?? id}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-100">Preview permissions</div>
                  <Chip tone="zinc">
                    {(PERM_TEMPLATES.find((t) => t.id === inviteTemplate)?.perms.length ?? 0)} perms
                  </Chip>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(PERM_TEMPLATES.find((t) => t.id === inviteTemplate)?.perms ?? []).map((p) => (
                    <Chip key={p} tone={riskTone(permRisk(p))}>
                      {shortPerm(p)}
                    </Chip>
                  ))}
                </div>

                <div className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
                  <FiInfo className="mt-0.5" />
                  <p className="min-w-0">
                    We recommend limiting <span className="text-zinc-300">high-risk</span> perms (ban/manage mods/settings) to Admins only.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button tone="zinc" onClick={() => setInviteOpen(false)} icon={<FiX />}>
                  Cancel
                </Button>
                <Button tone="emerald" onClick={invite} icon={<FiCheck />}>
                  Send invite
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Edit Panel */}
        {editing && (
          <EditDrawer
            mod={editing}
            onClose={() => setEditing(null)}
            onSave={saveEdit}
            onRemove={() => removeOne(editing.id)}
          />
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
  Subcomponents
────────────────────────────────────────────────────────────────────────────── */

function StatCard({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-400">{label}</div>
        <div className="text-zinc-400">{icon}</div>
      </div>
      <div className="mt-1 text-lg font-bold text-zinc-100">{value}</div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  formatOption,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  formatOption?: (o: string) => string;
}) {
  return (
    <div className="min-w-0">
      <label className="text-xs text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {formatOption ? formatOption(o) : o}
          </option>
        ))}
      </select>
    </div>
  );
}

function TrustBar({ score }: { score: number }) {
  const tone = score >= 85 ? 'emerald' : score >= 70 ? 'sky' : score >= 55 ? 'amber' : 'rose';
  const bar = tone === 'emerald' ? 'bg-emerald-500' : tone === 'sky' ? 'bg-sky-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{score}%</span>
        <span className={cx('font-medium', tone === 'emerald' ? 'text-emerald-300' : tone === 'sky' ? 'text-sky-300' : tone === 'amber' ? 'text-amber-300' : 'text-rose-300')}>
          {tone === 'emerald' ? 'High' : tone === 'sky' ? 'Good' : tone === 'amber' ? 'Watch' : 'Risk'}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-900">
        <div className={cx('h-full', bar)} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

function AvatarSeed({ seed }: { seed: string }) {
  const initials = seed.replace('@', '').slice(0, 2).toUpperCase();
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 text-sm font-bold text-zinc-200">
      {initials}
    </div>
  );
}

function RowMenu({ onEdit }: { onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-2 text-zinc-300 hover:bg-zinc-900"
        aria-label="Row actions"
      >
        <FiMoreVertical />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl">
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900"
          >
            <FiEdit3 /> Edit
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
  Edit Drawer
────────────────────────────────────────────────────────────────────────────── */

function EditDrawer({
  mod,
  onClose,
  onSave,
  onRemove,
}: {
  mod: Moderator;
  onClose: () => void;
  onSave: (m: Moderator) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState<Moderator>(mod);

  useEffect(() => setDraft(mod), [mod]);

  const permsDetailed = useMemo(() => {
    return ALL_PERMS.map((p) => ({
      ...p,
      enabled: draft.permissions.includes(p.key),
    }));
  }, [draft.permissions]);

  const highRiskEnabled = permsDetailed.filter((p) => p.enabled && p.risk === 'high').length;

  const togglePerm = (key: PermissionKey) => {
    setDraft((prev) => {
      const has = prev.permissions.includes(key);
      return { ...prev, permissions: has ? prev.permissions.filter((p) => p !== key) : [...prev.permissions, key] };
    });
  };

  const applyTemplate = (templateId: string) => {
    const tmpl = PERM_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    setDraft((prev) => ({
      ...prev,
      permissions: tmpl.perms,
      role: tmpl.id === 'admin' ? 'Admin' : tmpl.id === 'helper' ? 'Helper' : 'Moderator',
    }));
  };

  return (
    <Modal title={`Edit ${mod.name}`} onClose={onClose} wide>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4 min-w-0">
          <Card
            title="Profile"
            icon={<FiUsers className="text-emerald-400" />}
            bodyClass="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <label className="text-xs text-zinc-400">Display name</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
                />
              </div>
              <div className="sm:col-span-6">
                <label className="text-xs text-zinc-400">Handle</label>
                <input
                  value={draft.handle}
                  onChange={(e) => setDraft((p) => ({ ...p, handle: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <Select
                  label="Status"
                  value={draft.status}
                  onChange={(v) => setDraft((p) => ({ ...p, status: v as ModStatus }))}
                  options={['active', 'invited', 'suspended']}
                />
              </div>
              <div className="sm:col-span-4">
                <Select
                  label="Role"
                  value={draft.role}
                  onChange={(v) => setDraft((p) => ({ ...p, role: v as Role }))}
                  options={['Owner', 'Admin', 'Moderator', 'Helper', 'Bot']}
                />
              </div>
              <div className="sm:col-span-4">
                <label className="text-xs text-zinc-400">Trust score</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.trustScore}
                  onChange={(e) => setDraft((p) => ({ ...p, trustScore: clampInt(e.target.value, 0, 100) }))}
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400">Notes</label>
              <textarea
                value={draft.notes ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                className="mt-1 min-h-[88px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
              />
              <div className="mt-1 text-xs text-zinc-500">
                Joined {fmtDate(draft.joinedAt)} • Last active {fmtRelative(draft.lastActiveAt)}
              </div>
            </div>
          </Card>

          <Card
            title="Quick templates"
            icon={<FiShield className="text-emerald-400" />}
            bodyClass="space-y-2"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PERM_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t.id)}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left hover:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-zinc-100">{t.name}</div>
                    <Chip tone="zinc">{t.perms.length}</Chip>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">{t.description}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-4 min-w-0">
          <Card
            title="Permissions"
            icon={<FiLock className="text-emerald-400" />}
            right={
              highRiskEnabled > 0 ? (
                <Chip tone="rose">{highRiskEnabled} high-risk enabled</Chip>
              ) : (
                <Chip tone="emerald">No high-risk perms</Chip>
              )
            }
            bodyClass="space-y-3"
          >
            <div className="text-xs text-zinc-500">
              High-risk permissions increase liability. Keep them limited to Admins and ensure audit trail is enabled.
            </div>

            <div className="grid grid-cols-1 gap-2">
              {permsDetailed.map((p) => (
                <label
                  key={p.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-200">{p.label}</span>
                      <Chip tone={riskTone(p.risk)}>{p.risk}</Chip>
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">{p.key}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={() => togglePerm(p.key)}
                    className="h-4 w-4 shrink-0 accent-emerald-500"
                  />
                </label>
              ))}
            </div>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button tone="zinc" onClick={onClose} icon={<FiX />}>
              Cancel
            </Button>
            <Button tone="emerald" onClick={() => onSave(draft)} icon={<FiCheck />}>
              Save
            </Button>
            <Button tone="rose" onClick={onRemove} icon={<FiTrash2 />}>
              Remove
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
  Modal
────────────────────────────────────────────────────────────────────────────── */

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  // lock background scroll on mobile when modal open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <>
      <button
        aria-label="Close modal"
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/70"
      />
      <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-2 sm:p-6">
        <div
          className={cx(
            'w-full min-w-0 rounded-xl border border-zinc-800 bg-black shadow-2xl',
            wide ? 'max-w-5xl' : 'max-w-2xl'
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-100">{title}</div>
              <div className="text-xs text-zinc-500">Mobile-safe • min-w-0 • scrollable</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-2 text-zinc-300 hover:bg-zinc-900"
              aria-label="Close"
            >
              <FiX />
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
  Helpers
────────────────────────────────────────────────────────────────────────────── */

function permRisk(k: PermissionKey): Risk {
  return ALL_PERMS.find((p) => p.key === k)?.risk ?? 'low';
}

function riskTone(r: Risk): 'zinc' | 'sky' | 'amber' | 'rose' | 'emerald' {
  if (r === 'low') return 'emerald';
  if (r === 'med') return 'amber';
  return 'rose';
}

function shortPerm(k: PermissionKey) {
  // compact labels for chips
  if (k === 'chat:read') return 'Chat read';
  if (k === 'chat:delete') return 'Delete';
  if (k === 'chat:timeout') return 'Timeout';
  if (k === 'chat:ban') return 'Ban';
  if (k === 'chat:slowmode') return 'Slow mode';
  if (k === 'chat:links') return 'Links';
  if (k === 'reports:review') return 'Reports';
  if (k === 'vod:moderate') return 'VOD';
  if (k === 'settings:moderation') return 'Settings';
  if (k === 'mods:manage') return 'Manage mods';
  return k;
}

function clampInt(v: string, min: number, max: number) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
