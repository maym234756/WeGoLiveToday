// apps/web/components/dashboard/ChatPage.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiArchive,
  FiChevronDown,
  FiClock,
  FiCopy,
  FiFilter,
  FiHash,
  FiLock,
  FiMessageSquare,
  FiMoreHorizontal,
  FiPause,
  FiPlay,
  FiSearch,
  FiSend,
  FiSettings,
  FiShield,
  FiSlash,
  FiStar,
  FiTrash2,
  FiUser,
  FiUserCheck,
  FiUserMinus,
  FiZap,
} from 'react-icons/fi';

/**
 * ChatPage.tsx
 * - Phone-safe layout (no overflow surprises)
 * - “Mod-first” utilities: triage queue, safety filters, user card, quick actions
 * - Mock data for now: replace `seed*` + actions with Supabase later
 */

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ Types                                                                       │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

type ChatRole = 'viewer' | 'subscriber' | 'vip' | 'moderator' | 'broadcaster';

type TrustLevel = 'new' | 'regular' | 'trusted' | 'risky';

type MessageKind = 'chat' | 'system' | 'mod';

type ChatMessage = {
  id: string;
  ts: number;
  kind: MessageKind;
  user?: {
    id: string;
    displayName: string;
    handle: string;
    role: ChatRole;
    trust: TrustLevel;
    followerSinceDays?: number;
    accountAgeDays?: number;
    badges?: string[];
  };
  text: string;
  flags?: {
    spam?: boolean;
    toxic?: boolean;
    link?: boolean;
    caps?: boolean;
  };
  score?: number; // 0..100 (safety score)
};

type ChatState = {
  paused: boolean;
  slowModeSec: number;
  followersOnly: boolean;
  minAccountAgeDays: number;
  blockLinksMode: 'off' | 'trusted-only' | 'strict';
  keywordBlock: string;
  showSystem: boolean;
  showMod: boolean;
  compact: boolean;
};

type QuickAction =
  | { id: 'timeout_30' | 'timeout_300' | 'ban' | 'warn'; label: string; tone: Tone; icon: React.ReactNode }
  | { id: 'followersonly' | 'lockdown' | 'slowmode' | 'clear'; label: string; tone: Tone; icon: React.ReactNode };

type Tone = 'zinc' | 'emerald' | 'amber' | 'rose' | 'sky';

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ Lightweight UI primitives                                                   │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

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
    <section className={`rounded-2xl border border-zinc-800 bg-zinc-900 ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3 text-zinc-200">
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
  tone = 'zinc',
  children,
  title,
}: {
  tone?: Tone;
  children: React.ReactNode;
  title?: string;
}) {
  const map: Record<Tone, string> = {
    zinc: 'bg-zinc-800/70 text-zinc-200 ring-zinc-700',
    emerald: 'bg-emerald-600/15 text-emerald-300 ring-emerald-600/30',
    amber: 'bg-amber-600/15 text-amber-300 ring-amber-600/30',
    rose: 'bg-rose-600/15 text-rose-300 ring-rose-600/30',
    sky: 'bg-sky-600/15 text-sky-300 ring-sky-600/30',
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function Button({
  tone = 'zinc',
  children,
  onClick,
  icon,
  className = '',
  disabled,
  type = 'button',
}: {
  tone?: Tone;
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const map: Record<Tone, string> = {
    zinc: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40',
    amber: 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500/40',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/40',
    sky: 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500/40',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${map[tone]} ${className}`}
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
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 pr-10 text-sm text-zinc-100 outline-none focus:border-emerald-600"
      />
      {right ? <div className="absolute inset-y-0 right-2 flex items-center">{right}</div> : null}
    </div>
  );
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ Mock seed (replace with API later)                                          │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

const seedMessages: ChatMessage[] = [
  {
    id: 'm1',
    ts: Date.now() - 1000 * 60 * 3,
    kind: 'system',
    text: 'Chat connected. Moderation is active.',
    score: 100,
  },
  {
    id: 'm2',
    ts: Date.now() - 1000 * 60 * 2.6,
    kind: 'chat',
    user: {
      id: 'u1',
      displayName: 'Skye',
      handle: '@skye',
      role: 'subscriber',
      trust: 'trusted',
      accountAgeDays: 420,
      followerSinceDays: 260,
      badges: ['Sub', 'OG'],
    },
    text: 'W stream 🔥 any tips for the new overlay setup?',
    flags: {},
    score: 95,
  },
  {
    id: 'm3',
    ts: Date.now() - 1000 * 60 * 2.2,
    kind: 'chat',
    user: {
      id: 'u2',
      displayName: 'xXFastClickXx',
      handle: '@fastclick',
      role: 'viewer',
      trust: 'new',
      accountAgeDays: 2,
      followerSinceDays: 0,
      badges: ['New'],
    },
    text: 'FREE $$$ click this 👉 http://not-real.example',
    flags: { spam: true, link: true, caps: false, toxic: false },
    score: 18,
  },
  {
    id: 'm4',
    ts: Date.now() - 1000 * 60 * 1.9,
    kind: 'mod',
    user: {
      id: 'mod1',
      displayName: 'AstraMod',
      handle: '@astramod',
      role: 'moderator',
      trust: 'trusted',
      accountAgeDays: 1200,
      followerSinceDays: 900,
      badges: ['Mod'],
    },
    text: 'Auto-flagged: link spam + new account. Suggested action: 5m timeout.',
    score: 88,
  },
  {
    id: 'm5',
    ts: Date.now() - 1000 * 60 * 1.2,
    kind: 'chat',
    user: {
      id: 'u3',
      displayName: 'CapsKing',
      handle: '@capsking',
      role: 'viewer',
      trust: 'risky',
      accountAgeDays: 17,
      followerSinceDays: 0,
      badges: ['New'],
    },
    text: 'YOU ALL ARE TRASH LOL',
    flags: { toxic: true, caps: true },
    score: 22,
  },
  {
    id: 'm6',
    ts: Date.now() - 1000 * 25,
    kind: 'chat',
    user: {
      id: 'u4',
      displayName: 'Mira',
      handle: '@mira',
      role: 'vip',
      trust: 'regular',
      accountAgeDays: 300,
      followerSinceDays: 120,
      badges: ['VIP'],
    },
    text: 'Poll idea: next game should be “Ranked” vs “IRL chill”?',
    score: 92,
  },
];

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ Page                                                                        │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

export default function ChatPage() {
  // Feed state
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Composer
  const [draft, setDraft] = useState('');

  // Search / filters
  const [search, setSearch] = useState('');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [roleFilter, setRoleFilter] = useState<ChatRole | 'all'>('all');

  // Chat settings (demo)
  const [state, setState] = useState<ChatState>({
    paused: false,
    slowModeSec: 0,
    followersOnly: false,
    minAccountAgeDays: 0,
    blockLinksMode: 'trusted-only',
    keywordBlock: '',
    showSystem: true,
    showMod: true,
    compact: false,
  });

  // UI
  const [panel, setPanel] = useState<'triage' | 'settings'>('triage');
  const listRef = useRef<HTMLDivElement | null>(null);

  // Derived: selected user + their recent activity
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return messages.find((m) => m.user?.id === selectedUserId)?.user ?? null;
  }, [messages, selectedUserId]);

  const selectedUserRecent = useMemo(() => {
    if (!selectedUserId) return [];
    return messages
      .filter((m) => m.user?.id === selectedUserId && m.kind === 'chat')
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 6);
  }, [messages, selectedUserId]);

  // Triage: flagged messages queue
  const triageQueue = useMemo(() => {
    const flagged = messages.filter((m) => m.kind === 'chat' && hasFlags(m));
    return flagged
      .slice()
      .sort((a, b) => (a.score ?? 50) - (b.score ?? 50)) // lowest score first
      .slice(0, 10);
  }, [messages]);

  // Filtered feed
  const filteredMessages = useMemo(() => {
    const q = search.trim().toLowerCase();

    return messages.filter((m) => {
      if (!state.showSystem && m.kind === 'system') return false;
      if (!state.showMod && m.kind === 'mod') return false;

      if (onlyFlagged && !hasFlags(m)) return false;

      if (roleFilter !== 'all' && m.user?.role && m.user.role !== roleFilter) return false;

      if (q) {
        const inText = m.text.toLowerCase().includes(q);
        const inUser =
          (m.user?.displayName ?? '').toLowerCase().includes(q) ||
          (m.user?.handle ?? '').toLowerCase().includes(q);
        if (!inText && !inUser) return false;
      }

      return true;
    });
  }, [messages, onlyFlagged, roleFilter, search, state.showMod, state.showSystem]);

  // Auto-scroll (only if not paused)
  useEffect(() => {
    if (state.paused) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filteredMessages.length, state.paused]);

  const quickActions: QuickAction[] = [
    { id: 'timeout_30', label: 'Timeout 30s', tone: 'amber', icon: <FiClock /> },
    { id: 'timeout_300', label: 'Timeout 5m', tone: 'amber', icon: <FiClock /> },
    { id: 'warn', label: 'Warn', tone: 'sky', icon: <FiAlertTriangle /> },
    { id: 'ban', label: 'Ban', tone: 'rose', icon: <FiSlash /> },
    { id: 'followersonly', label: 'Followers-only', tone: 'zinc', icon: <FiUserCheck /> },
    { id: 'slowmode', label: 'Slow mode', tone: 'zinc', icon: <FiActivity /> },
    { id: 'lockdown', label: 'Lockdown', tone: 'rose', icon: <FiLock /> },
    { id: 'clear', label: 'Clear chat', tone: 'zinc', icon: <FiTrash2 /> },
  ];

  function onSend() {
    const text = draft.trim();
    if (!text) return;

    const msg: ChatMessage = {
      id: `local-${Math.random().toString(36).slice(2, 9)}`,
      ts: Date.now(),
      kind: 'chat',
      user: {
        id: 'me',
        displayName: 'You',
        handle: '@you',
        role: 'broadcaster',
        trust: 'trusted',
        accountAgeDays: 999,
        followerSinceDays: 999,
        badges: ['Broadcaster'],
      },
      text,
      score: 99,
    };

    setMessages((prev) => [...prev, msg]);
    setDraft('');
  }

  function applyQuickAction(actionId: QuickAction['id'], target?: ChatMessage) {
    // Demo-only behavior. Wire to real moderation APIs later.
    const targetUser = target?.user;
    const userName = targetUser?.displayName ?? 'User';

    if (actionId === 'clear') {
      setMessages((prev) => [
        ...prev,
        { id: `sys-${Date.now()}`, ts: Date.now(), kind: 'system', text: 'Chat cleared by broadcaster.', score: 100 },
      ]);
      return;
    }

    if (actionId === 'lockdown') {
      setState((s) => ({ ...s, followersOnly: true, slowModeSec: 10, blockLinksMode: 'strict' }));
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          ts: Date.now(),
          kind: 'system',
          text: 'Lockdown enabled: followers-only + slow mode + strict links.',
          score: 100,
        },
      ]);
      return;
    }

    if (actionId === 'followersonly') {
      setState((s) => ({ ...s, followersOnly: !s.followersOnly }));
      return;
    }

    if (actionId === 'slowmode') {
      setState((s) => ({ ...s, slowModeSec: s.slowModeSec ? 0 : 5 }));
      return;
    }

    if (!targetUser) return;

    const sysText =
      actionId === 'timeout_30'
        ? `Timed out ${userName} for 30 seconds.`
        : actionId === 'timeout_300'
        ? `Timed out ${userName} for 5 minutes.`
        : actionId === 'warn'
        ? `Warned ${userName}.`
        : actionId === 'ban'
        ? `Banned ${userName}.`
        : `Action applied to ${userName}.`;

    setMessages((prev) => [
      ...prev,
      { id: `mod-${Date.now()}`, ts: Date.now(), kind: 'mod', text: sysText, score: 100, user: mockModUser() },
    ]);
  }

  function onSelectMessage(m: ChatMessage) {
    if (m.user?.id) setSelectedUserId(m.user.id);
  }

  // Phone-safe wrapper: max-w-none, min-w-0, overflow protections
  return (
    <div className="w-full min-w-0">
      <div className="mx-auto w-full min-w-0 max-w-screen-2xl space-y-4 px-2 py-3 sm:px-4">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xl font-bold text-emerald-400">💬 Chat</span>
            <Chip tone={state.paused ? 'amber' : 'emerald'} title="Feed state">
              {state.paused ? (
                <>
                  <FiPause /> Paused
                </>
              ) : (
                <>
                  <FiPlay /> Live
                </>
              )}
            </Chip>
            {state.followersOnly && (
              <Chip tone="sky" title="Followers-only chat enabled">
                <FiUserCheck /> Followers-only
              </Chip>
            )}
            {state.slowModeSec > 0 && (
              <Chip tone="zinc" title="Slow mode">
                <FiClock /> Slow {state.slowModeSec}s
              </Chip>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              tone={state.paused ? 'emerald' : 'zinc'}
              icon={state.paused ? <FiPlay /> : <FiPause />}
              onClick={() => setState((s) => ({ ...s, paused: !s.paused }))}
            >
              {state.paused ? 'Resume' : 'Pause'}
            </Button>

            <Button tone="zinc" icon={<FiShield />} onClick={() => applyQuickAction('lockdown')}>
              Lockdown
            </Button>

            <div className="hidden md:flex">
              <Button
                tone="zinc"
                icon={panel === 'triage' ? <FiSettings /> : <FiAlertTriangle />}
                onClick={() => setPanel((p) => (p === 'triage' ? 'settings' : 'triage'))}
              >
                {panel === 'triage' ? 'Settings' : 'Triage'}
              </Button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-12">
          <div className="min-w-0 md:col-span-6">
            <Input
              value={search}
              onChange={setSearch}
              placeholder="Search chat, users, handles…"
              right={<FiSearch className="text-zinc-500" />}
            />
          </div>

          <div className="min-w-0 md:col-span-3">
            <div className="flex items-center gap-2">
              <Button
                tone={onlyFlagged ? 'amber' : 'zinc'}
                icon={<FiFilter />}
                onClick={() => setOnlyFlagged((v) => !v)}
                className="w-full"
              >
                {onlyFlagged ? 'Flagged only' : 'All messages'}
              </Button>
            </div>
          </div>

          <div className="min-w-0 md:col-span-3">
            <RoleSelect value={roleFilter} onChange={setRoleFilter} />
          </div>
        </div>

        {/* Main grid */}
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left: Feed */}
          <div className="min-w-0 lg:col-span-7 xl:col-span-8">
            <Card
              title="Live Feed"
              icon={<FiMessageSquare className="text-emerald-400" />}
              right={
                <div className="flex items-center gap-2">
                  <label className="hidden items-center gap-2 text-xs text-zinc-400 sm:flex">
                    <input
                      type="checkbox"
                      checked={state.compact}
                      onChange={(e) => setState((s) => ({ ...s, compact: e.target.checked }))}
                    />
                    Compact
                  </label>
                  <Button tone="zinc" icon={<FiArchive />} onClick={() => applyQuickAction('clear')}>
                    Clear
                  </Button>
                </div>
              }
              bodyClass="p-0"
            >
              <div className="min-w-0">
                <div
                  ref={listRef}
                  className="max-h-[56vh] min-h-[42vh] w-full min-w-0 overflow-y-auto overflow-x-hidden px-3 py-3 sm:max-h-[62vh]"
                >
                  <div className="space-y-2">
                    {filteredMessages.map((m) => (
                      <MessageRow
                        key={m.id}
                        msg={m}
                        compact={state.compact}
                        selected={m.user?.id ? m.user.id === selectedUserId : false}
                        onSelect={() => onSelectMessage(m)}
                        onQuick={(id) => applyQuickAction(id, m)}
                      />
                    ))}
                  </div>
                </div>

                {/* Composer */}
                <div className="border-t border-zinc-800 p-3">
                  <form
                    className="flex min-w-0 items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSend();
                    }}
                  >
                    <Input
                      value={draft}
                      onChange={setDraft}
                      placeholder="Send a message…"
                      className="min-w-0 flex-1"
                      right={<FiHash className="text-zinc-600" />}
                    />
                    <Button tone="emerald" icon={<FiSend />} type="submit">
                      Send
                    </Button>
                  </form>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quickActions.slice(0, 4).map((a) => (
                      <Button
                        key={a.id}
                        tone={a.tone}
                        icon={a.icon}
                        onClick={() => applyQuickAction(a.id)}
                        className="px-2 py-1 text-xs"
                      >
                        {a.label}
                      </Button>
                    ))}
                    <Chip tone="zinc" title="Demo UI">
                      <FiZap /> Replace with live chat later
                    </Chip>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Panels */}
          <div className="min-w-0 lg:col-span-5 xl:col-span-4">
            {/* Mobile panel toggle */}
            <div className="mb-2 flex gap-2 lg:hidden">
              <Button
                tone={panel === 'triage' ? 'emerald' : 'zinc'}
                icon={<FiAlertTriangle />}
                onClick={() => setPanel('triage')}
                className="w-full"
              >
                Triage
              </Button>
              <Button
                tone={panel === 'settings' ? 'emerald' : 'zinc'}
                icon={<FiSettings />}
                onClick={() => setPanel('settings')}
                className="w-full"
              >
                Settings
              </Button>
            </div>

            <div className="space-y-4">
              {/* User panel */}
              <UserPanel
                user={selectedUser}
                recent={selectedUserRecent}
                onCopyHandle={() => {
                  if (!selectedUser?.handle) return;
                  safeCopy(selectedUser.handle);
                }}
                onAction={(id) => {
                  const targetMsg = messages.find((m) => m.user?.id === selectedUser?.id && m.kind === 'chat');
                  if (targetMsg) applyQuickAction(id, targetMsg);
                }}
              />

              {/* Triage / Settings */}
              {panel === 'triage' ? (
                <TriagePanel queue={triageQueue} onSelect={onSelectMessage} onAction={applyQuickAction} />
              ) : (
                <SettingsPanel state={state} setState={setState} />
              )}

              {/* Explainability panel (what makes this “ahead”) */}
              <Card title="Safety Engine (Explainable)" icon={<FiShield className="text-emerald-400" />}>
                <div className="space-y-2 text-sm text-zinc-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="emerald">Context scoring</Chip>
                    <Chip tone="sky">Account age</Chip>
                    <Chip tone="amber">Link & spam</Chip>
                    <Chip tone="rose">Toxicity signals</Chip>
                  </div>
                  <p className="text-zinc-400">
                    Instead of “black-box moderation”, each flagged message shows *why* it was flagged (links, spam,
                    caps, toxicity) and a safety score. This makes mod decisions consistent and auditable.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ Components                                                                  │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

function RoleSelect({
  value,
  onChange,
}: {
  value: ChatRole | 'all';
  onChange: (v: ChatRole | 'all') => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ChatRole | 'all')}
        className="w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
      >
        <option value="all">All roles</option>
        <option value="viewer">Viewer</option>
        <option value="subscriber">Subscriber</option>
        <option value="vip">VIP</option>
        <option value="moderator">Moderator</option>
        <option value="broadcaster">Broadcaster</option>
      </select>
      <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
    </div>
  );
}

function MessageRow({
  msg,
  compact,
  selected,
  onSelect,
  onQuick,
}: {
  msg: ChatMessage;
  compact: boolean;
  selected: boolean;
  onSelect: () => void;
  onQuick: (id: QuickAction['id']) => void;
}) {
  const tone = getMessageTone(msg);
  const when = timeAgo(msg.ts);

  const badge = msg.kind === 'system' ? (
    <Chip tone="zinc">
      <FiZap /> System
    </Chip>
  ) : msg.kind === 'mod' ? (
    <Chip tone="sky">
      <FiShield /> Mod
    </Chip>
  ) : null;

  const score = msg.score ?? 50;

  return (
    <button
      onClick={onSelect}
      className={`w-full min-w-0 rounded-xl border px-3 py-2 text-left transition ${
        selected ? 'border-emerald-600/60 bg-emerald-600/5' : 'border-zinc-800 bg-zinc-950/50 hover:bg-zinc-950'
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {msg.user ? (
              <>
                <span className="truncate font-semibold text-zinc-100">{msg.user.displayName}</span>
                <span className="truncate text-xs text-zinc-500">{msg.user.handle}</span>
                <UserBadges user={msg.user} />
              </>
            ) : (
              <span className="truncate font-semibold text-zinc-200">System</span>
            )}
            {badge}
            {hasFlags(msg) && (
              <Chip tone={score < 30 ? 'rose' : score < 60 ? 'amber' : 'sky'} title="Safety score">
                <FiAlertTriangle /> {score}
              </Chip>
            )}
          </div>

          <div className={`min-w-0 text-sm ${compact ? 'mt-1' : 'mt-2'} ${tone}`}>
            <p className="break-words">{msg.text}</p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>{when}</span>
            {msg.flags?.link && (
              <Chip tone="amber">
                <FiHash /> Link
              </Chip>
            )}
            {msg.flags?.spam && (
              <Chip tone="amber">
                <FiZap /> Spam
              </Chip>
            )}
            {msg.flags?.caps && (
              <Chip tone="amber">
                <FiAlertTriangle /> Caps
              </Chip>
            )}
            {msg.flags?.toxic && (
              <Chip tone="rose">
                <FiSlash /> Toxic
              </Chip>
            )}
          </div>
        </div>

        {/* Quick actions only for chat messages */}
        {msg.kind === 'chat' && msg.user ? (
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              title="Timeout 30s"
              onClick={(e) => {
                e.stopPropagation();
                onQuick('timeout_30');
              }}
            >
              <FiClock />
            </IconButton>
            <IconButton
              title="Ban"
              onClick={(e) => {
                e.stopPropagation();
                onQuick('ban');
              }}
            >
              <FiSlash />
            </IconButton>
            <IconButton
              title="More"
              onClick={(e) => {
                e.stopPropagation();
                onQuick('warn');
              }}
            >
              <FiMoreHorizontal />
            </IconButton>
          </div>
        ) : null}
      </div>
    </button>
  );
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-200 transition hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}

function UserBadges({ user }: { user: NonNullable<ChatMessage['user']> }) {
  const roleChip =
    user.role === 'moderator' ? (
      <Chip tone="sky" title="Moderator">
        <FiShield /> Mod
      </Chip>
    ) : user.role === 'broadcaster' ? (
      <Chip tone="emerald" title="Broadcaster">
        <FiStar /> Host
      </Chip>
    ) : user.role === 'vip' ? (
      <Chip tone="amber" title="VIP">
        <FiStar /> VIP
      </Chip>
    ) : user.role === 'subscriber' ? (
      <Chip tone="emerald" title="Subscriber">
        <FiUserCheck /> Sub
      </Chip>
    ) : null;

  const trustChip =
    user.trust === 'risky' ? (
      <Chip tone="rose" title="Risky trust level">
        <FiAlertTriangle /> Risk
      </Chip>
    ) : user.trust === 'new' ? (
      <Chip tone="zinc" title="New account / low history">
        <FiUser /> New
      </Chip>
    ) : user.trust === 'trusted' ? (
      <Chip tone="emerald" title="Trusted">
        <FiUserCheck /> Trusted
      </Chip>
    ) : (
      <Chip tone="sky" title="Regular">
        <FiUser /> Regular
      </Chip>
    );

  return (
    <>
      {roleChip}
      {trustChip}
    </>
  );
}

function UserPanel({
  user,
  recent,
  onCopyHandle,
  onAction,
}: {
  user: NonNullable<ChatMessage['user']> | null;
  recent: ChatMessage[];
  onCopyHandle: () => void;
  onAction: (id: QuickAction['id']) => void;
}) {
  if (!user) {
    return (
      <Card title="User" icon={<FiUser className="text-emerald-400" />}>
        <div className="text-sm text-zinc-400">
          Tap a message to open a user card. This makes moderation fast on mobile.
        </div>
      </Card>
    );
  }

  const rep = computeReputation(user, recent);
  const repTone: Tone = rep >= 80 ? 'emerald' : rep >= 60 ? 'sky' : rep >= 40 ? 'amber' : 'rose';

  return (
    <Card
      title="User"
      icon={<FiUser className="text-emerald-400" />}
      right={
        <div className="flex items-center gap-2">
          <Chip tone={repTone} title="Explainable reputation">
            <FiActivity /> Rep {rep}
          </Chip>
          <IconButton title="Copy handle" onClick={() => onCopyHandle()}>
            <FiCopy />
          </IconButton>
        </div>
      }
    >
      <div className="min-w-0 space-y-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-zinc-100">{user.displayName}</div>
              <div className="truncate text-sm text-zinc-500">{user.handle}</div>
            </div>
            <UserBadges user={user} />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400 sm:grid-cols-4">
            <Info label="Acct age" value={`${user.accountAgeDays ?? 0}d`} />
            <Info label="Follower" value={`${user.followerSinceDays ?? 0}d`} />
            <Info label="Role" value={user.role} />
            <Info label="Trust" value={user.trust} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button tone="amber" icon={<FiClock />} onClick={() => onAction('timeout_300')} className="flex-1 sm:flex-none">
            Timeout 5m
          </Button>
          <Button tone="sky" icon={<FiAlertTriangle />} onClick={() => onAction('warn')} className="flex-1 sm:flex-none">
            Warn
          </Button>
          <Button tone="rose" icon={<FiSlash />} onClick={() => onAction('ban')} className="flex-1 sm:flex-none">
            Ban
          </Button>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-zinc-200">Recent messages</span>
            <span className="text-xs text-zinc-500">{recent.length} shown</span>
          </div>
          <div className="space-y-2">
            {recent.length ? (
              recent.map((m) => (
                <div key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-sm text-zinc-200">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{timeAgo(m.ts)}</span>
                    {hasFlags(m) ? (
                      <Chip tone={(m.score ?? 50) < 30 ? 'rose' : 'amber'} title="Safety score">
                        <FiAlertTriangle /> {m.score ?? 50}
                      </Chip>
                    ) : (
                      <Chip tone="emerald">Clean</Chip>
                    )}
                  </div>
                  <div className="mt-1 break-words">{m.text}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500">No recent messages in view.</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="truncate text-xs text-zinc-200">{value}</div>
    </div>
  );
}

function TriagePanel({
  queue,
  onSelect,
  onAction,
}: {
  queue: ChatMessage[];
  onSelect: (m: ChatMessage) => void;
  onAction: (id: QuickAction['id'], target?: ChatMessage) => void;
}) {
  return (
    <Card
      title="Triage Queue"
      icon={<FiAlertTriangle className="text-amber-400" />}
      right={
        <Chip tone={queue.length ? 'amber' : 'emerald'} title="Flagged messages">
          <FiZap /> {queue.length}
        </Chip>
      }
    >
      <div className="space-y-2">
        {queue.length ? (
          queue.map((m) => (
            <div key={m.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-zinc-200">{m.user?.displayName ?? 'Unknown'}</span>
                    <span className="truncate text-xs text-zinc-500">{m.user?.handle}</span>
                    <Chip tone={(m.score ?? 50) < 30 ? 'rose' : 'amber'} title="Safety score">
                      <FiAlertTriangle /> {m.score ?? 50}
                    </Chip>
                  </div>
                  <div className="mt-2 break-words text-sm text-zinc-200">{m.text}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.flags?.spam && (
                      <Chip tone="amber">
                        <FiZap /> spam
                      </Chip>
                    )}
                    {m.flags?.link && (
                      <Chip tone="amber">
                        <FiHash /> link
                      </Chip>
                    )}
                    {m.flags?.caps && (
                      <Chip tone="amber">
                        <FiAlertTriangle /> caps
                      </Chip>
                    )}
                    {m.flags?.toxic && (
                      <Chip tone="rose">
                        <FiSlash /> toxic
                      </Chip>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <IconButton title="Open user card" onClick={() => onSelect(m)}>
                    <FiUser />
                  </IconButton>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button tone="amber" icon={<FiClock />} onClick={() => onAction('timeout_300', m)} className="flex-1 sm:flex-none">
                  Timeout 5m
                </Button>
                <Button tone="sky" icon={<FiAlertTriangle />} onClick={() => onAction('warn', m)} className="flex-1 sm:flex-none">
                  Warn
                </Button>
                <Button tone="rose" icon={<FiSlash />} onClick={() => onAction('ban', m)} className="flex-1 sm:flex-none">
                  Ban
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            No flagged messages right now. You’re chilling. 😌
          </div>
        )}
      </div>
    </Card>
  );
}

function SettingsPanel({
  state,
  setState,
}: {
  state: ChatState;
  setState: React.Dispatch<React.SetStateAction<ChatState>>;
}) {
  return (
    <Card title="Chat Controls" icon={<FiSettings className="text-emerald-400" />}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ToggleRow
            label="Followers-only"
            value={state.followersOnly}
            onToggle={() => setState((s) => ({ ...s, followersOnly: !s.followersOnly }))}
            hint="Only followers can chat (demo)."
            icon={<FiUserCheck />}
          />
          <ToggleRow
            label="Show system"
            value={state.showSystem}
            onToggle={() => setState((s) => ({ ...s, showSystem: !s.showSystem }))}
            hint="Show connection + platform notices."
            icon={<FiZap />}
          />
          <ToggleRow
            label="Show mod"
            value={state.showMod}
            onToggle={() => setState((s) => ({ ...s, showMod: !s.showMod }))}
            hint="Show moderation logs."
            icon={<FiShield />}
          />
          <ToggleRow
            label="Compact feed"
            value={state.compact}
            onToggle={() => setState((s) => ({ ...s, compact: !s.compact }))}
            hint="Denser message list for fast modding."
            icon={<FiMessageSquare />}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NumberRow
            label="Slow mode (sec)"
            value={state.slowModeSec}
            min={0}
            max={60}
            onChange={(v) => setState((s) => ({ ...s, slowModeSec: v }))}
            icon={<FiClock />}
          />
          <NumberRow
            label="Min account age (days)"
            value={state.minAccountAgeDays}
            min={0}
            max={365}
            onChange={(v) => setState((s) => ({ ...s, minAccountAgeDays: v }))}
            icon={<FiUserMinus />}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectRow
            label="Link filter"
            value={state.blockLinksMode}
            onChange={(v) => setState((s) => ({ ...s, blockLinksMode: v }))}
            icon={<FiHash />}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'trusted-only', label: 'Trusted-only' },
              { value: 'strict', label: 'Strict (block all)' },
            ]}
          />
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-sm text-zinc-400">
              <FiSlash />
              Keyword block (comma-separated)
            </div>
            <Input
              value={state.keywordBlock}
              onChange={(v) => setState((s) => ({ ...s, keywordBlock: v }))}
              placeholder="e.g. referral, crypto, giveaway"
              right={<FiLock className="text-zinc-600" />}
            />
            <div className="mt-1 text-xs text-zinc-500">
              Demo only — later: store per-channel + show match explanations.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
          Pro move: persist these controls per stream session and expose presets (Shield / Lockdown / Event Mode).
        </div>
      </div>
    </Card>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
  hint,
  icon,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left hover:bg-zinc-900/40"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-1 text-xs text-zinc-500">{hint}</div>
      </div>
      <span
        className={`mt-1 inline-flex h-6 w-11 items-center rounded-full border p-0.5 transition ${
          value ? 'border-emerald-600/50 bg-emerald-600/20' : 'border-zinc-700 bg-zinc-800/60'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full transition ${value ? 'translate-x-5 bg-emerald-400' : 'translate-x-0 bg-zinc-400'}`}
        />
      </span>
    </button>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  onChange,
  icon,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-200">
        {icon} {label}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full accent-emerald-500"
        />
        <Chip tone="zinc">{value}</Chip>
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        Range {min}–{max}
      </div>
    </div>
  );
}

function SelectRow<T extends string>({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-200">
        {icon} {label}
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
      </div>
    </div>
  );
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ Helpers                                                                     │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

function hasFlags(m: ChatMessage) {
  return Boolean(m.flags?.spam || m.flags?.toxic || m.flags?.link || m.flags?.caps);
}

function getMessageTone(m: ChatMessage) {
  if (m.kind === 'system') return 'text-zinc-400';
  if (m.kind === 'mod') return 'text-sky-200';
  const score = m.score ?? 80;
  if (hasFlags(m)) return score < 30 ? 'text-rose-200' : 'text-amber-200';
  return 'text-zinc-200';
}

function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function computeReputation(user: NonNullable<ChatMessage['user']>, recent: ChatMessage[]) {
  // Demo explainable reputation:
  // - Account age matters a lot
  // - “Risky” trust is penalized
  // - Recent flagged messages reduce score
  const age = clamp((user.accountAgeDays ?? 0) / 10, 0, 70); // up to 70
  const trust =
    user.trust === 'trusted' ? 20 : user.trust === 'regular' ? 12 : user.trust === 'new' ? 6 : -10;
  const recentPenalty = recent.reduce((acc, m) => acc + (hasFlags(m) ? 8 : 0), 0); // 0..48
  const score = Math.round(clamp(age + trust - recentPenalty, 0, 100));
  return score;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function safeCopy(text: string) {
  try {
    void navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

function mockModUser(): NonNullable<ChatMessage['user']> {
  return {
    id: 'mod1',
    displayName: 'AstraMod',
    handle: '@astramod',
    role: 'moderator',
    trust: 'trusted',
    accountAgeDays: 1200,
    followerSinceDays: 900,
    badges: ['Mod'],
  };
}
