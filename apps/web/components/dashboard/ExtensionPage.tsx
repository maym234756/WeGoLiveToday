'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiActivity, FiAlertCircle, FiArchive, FiBook, FiCheck, FiChevronDown, FiChevronRight,
  FiClock, FiCloud, FiCode, FiDatabase, FiDownload, FiExternalLink, FiFilter, FiFlag,
  FiGlobe, FiGrid, FiHeart, FiHelpCircle, FiInfo, FiLayers, FiLock, FiMonitor, FiPackage,
  FiPlus, FiRefreshCw, FiSearch, FiSettings, FiShield, FiStar, FiTag, FiTrash2, FiTrendingUp,
  FiUpload, FiUsers, FiX, FiZap, FiPlay
} from 'react-icons/fi';

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 0) TYPES                                                                   │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
const STORE_CATEGORIES = [
  'Moderation',
  'Safety',
  'Automation',
  'Analytics',
  'Engagement',
  'Community',
  'Overlays',
  'Audio',
  'Music',
  'Clips',
  'Scheduling',
  'Monetization',
  'Ecommerce',
  'Branding',
  'Accessibility',
  'Integrations',
  'Developer',
  'Rewards',
] as const;

type Category = (typeof STORE_CATEGORIES)[number];

type Price =
  | { type: 'free' }
  | { type: 'included' } // preinstalled/bundled with WeGoLive
  | { type: 'sub'; monthlyUsd: number } // monthly subscription per app
  | { type: 'one-time'; amountUsd: number };

type Extension = {
  id: string;
  name: string;
  author: string;
  icon?: string;
  categories: Category[];
  short: string;
  description: string;
  rating: number;
  installs: number;
  price: Price;
  version: string;
  lastUpdated: string; // ISO
  permissions: Array<{ id: string; label: string; risk: 'low' | 'med' | 'high' }>;
  website?: string;
  repo?: string;
  verified?: boolean;
  featured?: boolean;
  recommended?: boolean;
  preinstalled?: boolean; // ✅ new
  compatibility: Array<'Studio' | 'OBS' | 'Mobile' | 'Web'>;
};

function formatPrice(p: Price) {
  if (p.type === 'free') return 'Free';
  if (p.type === 'included') return 'Included';
  if (p.type === 'one-time') return `$${p.amountUsd.toFixed(2)} one-time`;
  return `$${p.monthlyUsd.toFixed(2)}/mo`;
}

function priceTone(p: Price): 'zinc' | 'emerald' | 'amber' | 'sky' {
  if (p.type === 'free') return 'emerald';
  if (p.type === 'included') return 'sky';
  if (p.type === 'one-time') return 'amber';
  return 'zinc';
}


/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 1) PERSISTENCE HOOK                                                        │
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
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 2) UI PRIMITIVES                                                           │
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
    <section className={`bg-zinc-900 border border-zinc-800 rounded-xl w-full min-w-0 ${className}`}>
      <header className="px-4 py-3 border-b border-zinc-800 text-zinc-300">
        {/* ✅ Wrap-friendly header so it won't overflow on mobile */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <span className="truncate">{title}</span>
          </div>

          {/* right controls wrap instead of pushing width */}
          {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
        </div>
      </header>

      <div className={`p-4 min-w-0 ${bodyClass}`}>{children}</div>
    </section>
  );
}

function Chip({
  color = 'emerald',
  children,
  title,
}: {
  color?: 'emerald' | 'zinc' | 'rose' | 'amber' | 'sky';
  children: React.ReactNode;
  title?: string;
}) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-600/20 text-emerald-300 ring-emerald-500/30',
    zinc: 'bg-zinc-700/30 text-zinc-300 ring-zinc-500/30',
    rose: 'bg-rose-600/20 text-rose-300 ring-rose-500/30',
    amber: 'bg-amber-600/20 text-amber-300 ring-amber-500/30',
    sky: 'bg-sky-600/20 text-sky-300 ring-sky-500/30',
  };

  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center px-2 py-0.5 rounded text-xs ring-1 ${map[color]} truncate`}
    >
      {children}
    </span>
  );
}

function Pill({
  children,
  onClick,
  tone = 'zinc',
  icon,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'zinc' | 'emerald' | 'rose' | 'sky';
  icon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
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
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm transition disabled:opacity-60 ${styles[tone]} max-w-full`}
    >
      {icon}
      {/* ✅ allow the label to wrap if needed instead of overflowing */}
      <span className="min-w-0 break-words">{children}</span>
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition ${checked ? 'bg-emerald-600' : 'bg-zinc-700'}`}
      aria-pressed={checked}
    >
      <span
        className={`block w-5 h-5 bg-white rounded-full transform transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        } mt-0.5`}
      />
    </button>
  );
}

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <FiStar key={i} className={i < Math.round(value) ? 'text-amber-400' : 'text-zinc-600'} />
      ))}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs truncate">
      {children}
    </span>
  );
}


/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 3) APPS CATALOG (replace with API later)                                   │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
const CATALOG: Extension[] = [
  {
    id: 'guardian',
    name: 'Guardian Mod',
    author: 'WeGoLive',
    categories: ['Moderation', 'Automation', 'Safety'],
    short: 'AI auto-moderation with context + language filters.',
    description:
      'Guardian Mod detects toxicity, spam, harassment, and raid patterns in real-time. It can soft-mute, time-out, or escalate to a mod prompt with transparency logs.',
    rating: 4.8,
    installs: 18240,
    price: { type: 'included' },
    preinstalled: true,
    version: '1.6.0',
    lastUpdated: '2025-10-01',
    permissions: [
      { id: 'chat:read', label: 'Read chat', risk: 'low' },
      { id: 'chat:moderate', label: 'Timeout / Ban', risk: 'high' },
    ],
    website: 'https://wegolive.app/extensions/guardian',
    verified: true,
    featured: true,
    recommended: true,
    compatibility: ['Studio', 'Web'],
  },

  {
    id: 'heatmap',
    name: 'Viewer Heatmap',
    author: 'SignalLab',
    categories: ['Analytics', 'Engagement', 'Overlays'],
    short: 'Real-time engagement heatmap overlaid on your stream.',
    description:
      'Overlay engagement heatmaps sourced from chat events, reactions, and polls. Helps you see where attention spikes and drops so you can adjust layouts.',
    rating: 4.6,
    installs: 9341,
    price: { type: 'sub', monthlyUsd: 1.79 },
    version: '2.1.3',
    lastUpdated: '2025-11-05',
    permissions: [
      { id: 'overlay', label: 'Draw overlay', risk: 'low' },
      { id: 'events', label: 'Stream events', risk: 'med' },
    ],
    repo: 'https://github.com/signallab/heatmap',
    verified: true,
    featured: true,
    compatibility: ['Studio', 'OBS', 'Web'],
  },

  {
    id: 'storefront',
    name: 'Storefront Mini',
    author: 'Kitsune Commerce',
    categories: ['Ecommerce', 'Engagement', 'Monetization'],
    short: 'Shoppable overlay for merch & digital goods.',
    description:
      'In-stream cart, QR checkout, and fulfillment webhook. Drops enable limited-time offers synced to chat commands.',
    rating: 4.4,
    installs: 12877,
    price: { type: 'sub', monthlyUsd: 1.79 },
    version: '3.0.0',
    lastUpdated: '2025-08-22',
    permissions: [
      { id: 'payments', label: 'Payments and cart', risk: 'high' },
      { id: 'overlay', label: 'Overlay display', risk: 'low' },
    ],
    website: 'https://kitsune.dev/storefront',
    compatibility: ['Studio', 'Web', 'Mobile'],
  },

  {
    id: 'captions-pro',
    name: 'Captions Pro',
    author: 'OpenSound',
    categories: ['Accessibility', 'Audio'],
    short: 'Low-latency captions with vocab lists & styling.',
    description:
      'Hybrid ASR with word-level timings, profanity masking, and brand vocabulary. Output SRT or burn into overlay.',
    rating: 4.7,
    installs: 15440,
    price: { type: 'sub', monthlyUsd: 0.79 },
    version: '1.9.5',
    lastUpdated: '2025-09-30',
    permissions: [
      { id: 'audio:mic', label: 'Microphone access', risk: 'med' },
      { id: 'overlay', label: 'Overlay display', risk: 'low' },
    ],
    repo: 'https://github.com/opensound/captions-pro',
    compatibility: ['Studio', 'OBS', 'Web', 'Mobile'],
  },

  {
    id: 'now-playing',
    name: 'Now Playing',
    author: 'StreamBeats',
    categories: ['Music', 'Overlays', 'Integrations'],
    short: 'Display current track from Spotify/Apple/YT Music.',
    description:
      'Auto-switch services, album art cache, and theme-ready text layers for your lower-third.',
    rating: 4.2,
    installs: 22031,
    price: { type: 'free' },
    version: '2.4.1',
    lastUpdated: '2025-11-10',
    permissions: [
      { id: 'music', label: 'Connect music services', risk: 'med' },
      { id: 'overlay', label: 'Overlay display', risk: 'low' },
    ],
    website: 'https://streambeats.dev/now-playing',
    compatibility: ['Studio', 'OBS', 'Web'],
  },

  /* ---------------------- SAFETY + MODERATION (FREE / INCLUDED) ---------------------- */
  {
    id: 'raid-guard',
    name: 'Raid Guard',
    author: 'WeGoLive',
    categories: ['Safety', 'Moderation', 'Automation'],
    short: 'Detect raids/brigades and auto-enable protection modes.',
    description:
      'Triggers follower-only/chat slowmode, blocks repeated phrases, and prompts mods with a one-click lockdown action.',
    rating: 4.9,
    installs: 40211,
    price: { type: 'included' },
    preinstalled: true,
    version: '1.2.0',
    lastUpdated: '2025-11-20',
    permissions: [
      { id: 'chat:read', label: 'Read chat', risk: 'low' },
      { id: 'chat:moderate', label: 'Lockdown / Timeout', risk: 'high' },
      { id: 'events', label: 'Stream events', risk: 'med' },
    ],
    verified: true,
    recommended: true,
    compatibility: ['Studio', 'Web'],
  },
  {
    id: 'link-shield',
    name: 'Link Shield',
    author: 'WeGoLive',
    categories: ['Safety', 'Moderation'],
    short: 'Blocks scam links + phishing domains with safe allowlists.',
    description:
      'Auto-removes suspicious links, supports per-channel allowlist, and flags repeat offenders for moderators.',
    rating: 4.7,
    installs: 31880,
    price: { type: 'free' },
    version: '1.0.4',
    lastUpdated: '2025-10-18',
    permissions: [
      { id: 'chat:read', label: 'Read chat', risk: 'low' },
      { id: 'chat:moderate', label: 'Remove message', risk: 'med' },
    ],
    verified: true,
    compatibility: ['Studio', 'Web'],
  },
  {
    id: 'age-gate',
    name: 'Age Gate & Labels',
    author: 'WeGoLive',
    categories: ['Safety', 'Moderation'],
    short: 'Stream labels + age-gating reminders (liability-friendly).',
    description:
      'Adds pre-stream checklist reminders for content labels and optional age-gate prompts with audit-friendly logs.',
    rating: 4.5,
    installs: 14120,
    price: { type: 'free' },
    version: '1.1.2',
    lastUpdated: '2025-09-12',
    permissions: [{ id: 'settings', label: 'Read/write channel labels', risk: 'low' }],
    compatibility: ['Studio', 'Web'],
  },
  {
    id: 'profanity-mask',
    name: 'Profanity Mask (Chat)',
    author: 'CivicTools',
    categories: ['Moderation', 'Safety', 'Accessibility'],
    short: 'Auto-masks profanity while preserving context.',
    description:
      'Replaces profane phrases with safe masks, supports per-language rules, and keeps original text available to mods only.',
    rating: 4.3,
    installs: 9902,
    price: { type: 'free' },
    version: '2.0.0',
    lastUpdated: '2025-08-03',
    permissions: [
      { id: 'chat:read', label: 'Read chat', risk: 'low' },
      { id: 'chat:moderate', label: 'Edit/replace display', risk: 'med' },
    ],
    compatibility: ['Studio', 'Web'],
  },

  /* ---------------------- FREE GROWTH / ENGAGEMENT ---------------------- */
  {
    id: 'polls-lite',
    name: 'Polls Lite',
    author: 'WeGoLive',
    categories: ['Engagement', 'Community'],
    short: 'Simple polls + chat commands (free tier).',
    description:
      'Quick polls with chat commands. Great starter engagement. (Pro version adds scheduling + analytics.)',
    rating: 4.1,
    installs: 25780,
    price: { type: 'free' },
    version: '1.3.1',
    lastUpdated: '2025-07-19',
    permissions: [
      { id: 'chat:read', label: 'Read chat', risk: 'low' },
      { id: 'chat:write', label: 'Post poll messages', risk: 'med' },
    ],
    compatibility: ['Studio', 'Web'],
  },
  {
    id: 'clip-marker',
    name: 'Clip Marker',
    author: 'MomentWorks',
    categories: ['Clips', 'Automation'],
    short: 'Hotkey markers + quick export list after stream.',
    description:
      'Drops timestamp markers during live. After stream, shows a “moments list” to speed up clipping.',
    rating: 4.4,
    installs: 12022,
    price: { type: 'free' },
    version: '1.0.9',
    lastUpdated: '2025-10-02',
    permissions: [{ id: 'events', label: 'Read stream events', risk: 'low' }],
    compatibility: ['Studio', 'Web'],
  },
  {
    id: 'lower-third-pack-free',
    name: 'Lower Third Pack (Free)',
    author: 'OverlayForge',
    categories: ['Overlays', 'Branding'],
    short: 'Starter lower-thirds + social callouts.',
    description:
      'Clean lower-thirds, “Follow” callouts, and simple scene labels. Mobile-friendly overlays included.',
    rating: 4.0,
    installs: 18840,
    price: { type: 'free' },
    version: '1.2.6',
    lastUpdated: '2025-11-02',
    permissions: [{ id: 'overlay', label: 'Overlay display', risk: 'low' }],
    compatibility: ['OBS', 'Web', 'Studio'],
  },

  /* ---------------------- $0.79/mo “MICRO” SUBS ---------------------- */
  {
    id: 'polls-plus',
    name: 'Polls+',
    author: 'WeGoLive',
    categories: ['Engagement', 'Community', 'Analytics'],
    short: 'Scheduled polls + outcomes dashboard.',
    description:
      'Adds poll scheduling, multi-step polls, and results analytics (retention + chat velocity).',
    rating: 4.6,
    installs: 8420,
    price: { type: 'sub', monthlyUsd: 0.79 },
    version: '1.0.0',
    lastUpdated: '2025-12-01',
    permissions: [
      { id: 'chat:read', label: 'Read chat', risk: 'low' },
      { id: 'chat:write', label: 'Post poll messages', risk: 'med' },
      { id: 'events', label: 'Stream events', risk: 'med' },
    ],
    featured: true,
    compatibility: ['Studio', 'Web'],
  },
  {
    id: 'clip-finder',
    name: 'Clip Finder',
    author: 'MomentWorks',
    categories: ['Clips', 'Analytics', 'Automation'],
    short: 'Suggests clip ranges based on spikes.',
    description:
      'Detects “spike moments” from chat velocity and reactions. Proposes candidate clip windows after stream.',
    rating: 4.5,
    installs: 6100,
    price: { type: 'sub', monthlyUsd: 0.79 },
    version: '1.1.0',
    lastUpdated: '2025-11-28',
    permissions: [{ id: 'events', label: 'Read stream events', risk: 'med' }],
    compatibility: ['Studio', 'Web'],
  },
  {
    id: 'scheduler-mini',
    name: 'Scheduler Mini',
    author: 'CalendarCrew',
    categories: ['Scheduling', 'Community'],
    short: 'Schedule streams + post reminders to chat.',
    description:
      'Simple schedule entries, countdown card, and auto-reminders to chat 30/10/1 minutes before.',
    rating: 4.2,
    installs: 4500,
    price: { type: 'sub', monthlyUsd: 0.79 },
    version: '2.0.2',
    lastUpdated: '2025-10-15',
    permissions: [
      { id: 'chat:write', label: 'Post reminders', risk: 'med' },
      { id: 'settings', label: 'Read channel settings', risk: 'low' },
    ],
    compatibility: ['Studio', 'Web', 'Mobile'],
  },

  /* ---------------------- $1.79/mo “PRO” SUBS ---------------------- */
  {
    id: 'multi-platform-restream',
    name: 'Multi-Platform Restream',
    author: 'StreamRelay',
    categories: ['Integrations', 'Automation'],
    short: 'Restream to multiple platforms with unified chat (demo UI).',
    description:
      'One broadcast, multiple destinations. Adds unified chat view and per-platform toggles. (Wire later.)',
    rating: 4.3,
    installs: 3900,
    price: { type: 'sub', monthlyUsd: 1.79 },
    version: '0.9.0',
    lastUpdated: '2025-11-12',
    permissions: [
      { id: 'integrations', label: 'Connect external platforms', risk: 'high' },
      { id: 'chat:read', label: 'Read chat', risk: 'low' },
    ],
    compatibility: ['Studio', 'Web'],
  },
  {
    id: 'sponsor-crm',
    name: 'Sponsor CRM',
    author: 'BrandDesk',
    categories: ['Monetization', 'Analytics', 'Community'],
    short: 'Track sponsors, deliverables, and campaign notes.',
    description:
      'Mini CRM: campaign checklist, auto reminders, sponsor notes, and a quick “media kit” export.',
    rating: 4.6,
    installs: 2750,
    price: { type: 'sub', monthlyUsd: 1.79 },
    version: '1.0.3',
    lastUpdated: '2025-11-21',
    permissions: [{ id: 'data', label: 'Store sponsor data', risk: 'med' }],
    compatibility: ['Web', 'Studio'],
  },
];


/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 4) Store CARD + DETAIL MODAL                                           │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function ExtensionCard({
  ext,
  installed,
  onInstall,
  onUninstall,
  onOpen,
}: {
  ext: Extension;
  installed: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex gap-3 min-w-0">
      <div className="w-12 h-12 shrink-0 rounded bg-zinc-900 border border-zinc-800 grid place-items-center text-zinc-400">
        {ext.icon ? (
          <img src={ext.icon} alt={ext.name} className="w-12 h-12 object-cover rounded" />
        ) : (
          <FiPackage />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Title row (wrap-safe) */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="truncate font-medium">{ext.name}</div>
          {ext.verified && (
            <Chip color="sky" title="Verified by WeGoLive">
              <FiShield className="inline mr-1" /> Verified
            </Chip>
          )}
          {ext.featured && <Chip color="amber">Featured</Chip>}
          {ext.recommended && <Chip>Recommended</Chip>}
        </div>

        <div className="text-xs text-zinc-400 mt-0.5 truncate">by {ext.author}</div>

        {/* Meta row (allow wrapping on phone) */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
          <div className="shrink-0">
            <RatingStars value={ext.rating} />
          </div>

          <span className="text-xs text-zinc-400 shrink-0">
            {ext.installs.toLocaleString()} installs
          </span>

          <span className="text-xs text-zinc-400 shrink-0">v{ext.version}</span>

          <span className="text-xs text-zinc-600 hidden sm:inline">•</span>

          <div className="flex flex-wrap items-center gap-1 min-w-0">
            {ext.categories.slice(0, 2).map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
            {ext.categories.length > 2 && <Tag>+{ext.categories.length - 2}</Tag>}
          </div>
        </div>

        <p className="text-sm text-zinc-300 mt-2 line-clamp-2">{ext.short}</p>

        {/* Actions (wrap-safe) */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!installed ? (
            <Pill tone="emerald" icon={<FiDownload />} onClick={onInstall}>
              Install
            </Pill>
          ) : (
            <Pill tone="zinc" icon={<FiSettings />} onClick={onOpen}>
              Manage
            </Pill>
          )}

          {installed && (
            <Pill tone="rose" icon={<FiTrash2 />} onClick={onUninstall}>
              Uninstall
            </Pill>
          )}

          <button
            onClick={onOpen}
            className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1"
          >
            Learn more <FiChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({
  ext,
  installed,
  onClose,
  onInstall,
  onUninstall,
  onToggleEnable,
  enabled,
}: {
  ext: Extension;
  installed: boolean;
  enabled: boolean;
  onClose: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onToggleEnable: (v: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-3 sm:p-4 grid place-items-center">
      {/* max-h + internal scrolling prevents phone overflow */}
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-xl">
        <header className="px-4 py-3 border-b border-zinc-800 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2 text-zinc-300 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded bg-zinc-950 border border-zinc-800 grid place-items-center text-zinc-400">
              <FiPackage />
            </div>

            <div className="min-w-0">
              <div className="font-medium truncate">{ext.name}</div>
              <div className="text-xs text-zinc-400 truncate">by {ext.author}</div>
            </div>

            {ext.verified && (
              <div className="hidden sm:block">
                <Chip color="sky">
                  <FiShield className="inline mr-1" /> Verified
                </Chip>
              </div>
            )}
          </div>

          <button className="text-zinc-400 hover:text-zinc-200 shrink-0" onClick={onClose}>
            <FiX />
          </button>
        </header>

        {/* Scrollable body */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-56px)]">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-8 space-y-3 min-w-0">
              <p className="text-zinc-300">{ext.description}</p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <RatingStars value={ext.rating} />
                  <span className="text-zinc-400">{ext.rating.toFixed(1)}</span>
                </div>
                <div className="text-zinc-400">{ext.installs.toLocaleString()} installs</div>
                <div className="text-zinc-400">
                  Updated {new Date(ext.lastUpdated).toLocaleDateString()}
                </div>
              </div>

              <div>
                <div className="text-sm text-zinc-400 mb-1">Compatibility</div>
                <div className="flex flex-wrap gap-1">
                  {ext.compatibility.map((c) => (
                    <Tag key={c}>{c}</Tag>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-zinc-400 mb-1">Permissions requested</div>
                <ul className="space-y-1">
                  {ext.permissions.map((p) => (
                    <li key={p.id} className="text-sm text-zinc-300 flex items-center gap-2">
                      {p.risk === 'low' && <Chip color="zinc">Low</Chip>}
                      {p.risk === 'med' && <Chip color="amber">Medium</Chip>}
                      {p.risk === 'high' && <Chip color="rose">High</Chip>}
                      <span className="min-w-0 break-words">{p.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="col-span-12 md:col-span-4 space-y-3 min-w-0">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-sm text-zinc-400 mb-2">Status</div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-300">Installed</span>
                    <Chip color={installed ? 'emerald' : 'zinc'}>{installed ? 'Yes' : 'No'}</Chip>
                  </div>

                  {installed && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-300">Enabled</span>
                      <Toggle checked={enabled} onChange={onToggleEnable} />
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {!installed ? (
                    <Pill tone="emerald" icon={<FiDownload />} onClick={onInstall}>
                      Install
                    </Pill>
                  ) : (
                    <>
                      <Pill tone="zinc" icon={<FiSettings />}>
                        Open settings
                      </Pill>
                      <Pill tone="rose" icon={<FiTrash2 />} onClick={onUninstall}>
                        Uninstall
                      </Pill>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-sm text-zinc-400 mb-2">Links</div>
                <div className="flex flex-col gap-2 text-sm">
                  {ext.website && (
                    <a
                      href={ext.website}
                      target="_blank"
                      className="text-zinc-300 hover:text-white inline-flex items-center gap-1"
                    >
                      <FiExternalLink /> Website
                    </a>
                  )}
                  {ext.repo && (
                    <a
                      href={ext.repo}
                      target="_blank"
                      className="text-zinc-300 hover:text-white inline-flex items-center gap-1"
                    >
                      <FiCode /> Repository
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                <FiAlertCircle className="inline mr-2" />
                Only install extensions from developers you trust. Review permissions—high-risk scopes are
                highlighted.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 5) MAIN PAGE                                                               │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
export default function ExtensionsPage() {
  // Tabs
  const [tab, setTab] = useLocalStorage<'discover' | 'installed' | 'updates' | 'developer'>(
    'ext.tab',
    'discover'
  );

  // Catalog & state
  const [query, setQuery] = useLocalStorage('ext.search', '');
  const [category, setCategory] = useLocalStorage<Category | 'All'>('ext.category', 'All');
  const [sort, setSort] = useLocalStorage<'Relevance' | 'Rating' | 'Installs' | 'Updated'>(
    'ext.sort',
    'Relevance'
  );

  // Installed state
  const [installed, setInstalled] = useLocalStorage<Record<string, { enabled: boolean }>>(
    'ext.installed',
    { guardian: { enabled: true } }
  );

  // Modal
  const [openId, setOpenId] = useState<string | null>(null);
  const openExt = CATALOG.find((e) => e.id === openId) || null;

  // ✅ Developer sandbox state (so toggleScope/devScopes exist)
  const [devName, setDevName] = useLocalStorage('ext.dev.name', 'My Extension');
  const [devScopes, setDevScopes] = useLocalStorage<string[]>('ext.dev.scopes', ['overlay']);
  const toggleScope = (s: string) => {
    setDevScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  // Derived lists
  const filtered = useMemo(() => {
    let rows = [...CATALOG];

    if (category !== 'All') rows = rows.filter((r) => r.categories.includes(category));

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.short.toLowerCase().includes(q) ||
          r.categories.some((c) => c.toLowerCase().includes(q))
      );
    }

    if (sort === 'Rating') rows.sort((a, b) => b.rating - a.rating);
    if (sort === 'Installs') rows.sort((a, b) => b.installs - a.installs);
    if (sort === 'Updated') rows.sort((a, b) => +new Date(b.lastUpdated) - +new Date(a.lastUpdated));

    // Relevance keeps the featured/recommended first
    if (sort === 'Relevance') {
      rows.sort(
        (a, b) =>
          Number(b.featured) +
          Number(b.recommended) -
          (Number(a.featured) + Number(a.recommended))
      );
    }

    return rows;
  }, [category, query, sort]);

  const installedList = filtered.filter((e) => installed[e.id]);
  const updatesList = installedList.filter(() => Math.random() > 0.5); // demo
  const discoverList = filtered.filter((e) => !installed[e.id]);

  const onInstall = (id: string) => setInstalled({ ...installed, [id]: { enabled: true } });

  const onUninstall = (id: string) => {
    const next = { ...installed };
    delete next[id];
    setInstalled(next);
  };

  const onToggleEnable = (id: string, v: boolean) =>
    setInstalled({ ...installed, [id]: { enabled: v } });

  // Render lists based on tab
  const renderGrid = (rows: Extension[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
      {rows.map((ext) => (
        <ExtensionCard
          key={ext.id}
          ext={ext}
          installed={Boolean(installed[ext.id])}
          onInstall={() => onInstall(ext.id)}
          onUninstall={() => onUninstall(ext.id)}
          onOpen={() => setOpenId(ext.id)}
        />
      ))}
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-white w-full max-w-none min-w-0 px-2 sm:px-4 lg:px-6 py-6 sm:py-8 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 min-w-0">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <span className="text-2xl font-bold text-emerald-400">🧩 Store</span>
          <Chip>Marketplace</Chip>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['discover', 'installed', 'updates', 'developer'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1 rounded-md ${
                tab === t ? 'bg-zinc-800' : 'hover:bg-zinc-800'
              } capitalize`}
            >
              {t}
            </button>
          ))}
          <Pill icon={<FiHelpCircle />} tone="zinc">
            Docs
          </Pill>
        </div>
      </div>

      {/* Filters row (hidden in Developer) */}
      {tab !== 'developer' && (
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center min-w-0">
          {/* Left filters wrap nicely */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 w-full sm:w-auto min-w-0">
              <FiSearch className="text-zinc-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products"
                className="bg-transparent outline-none text-sm placeholder:text-zinc-500 w-full min-w-0"
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 w-full sm:w-auto min-w-0">
              <FiFilter className="text-zinc-500 shrink-0" />
              <select
                className="bg-transparent text-sm outline-none w-full sm:w-auto min-w-0"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category | 'All')}
              >
                {[
                  'All',
                  'Moderation',
                  'Analytics',
                  'Ecommerce',
                  'Fun',
                  'Engagement',
                  'Music',
                  'Automation',
                  'Overlays',
                  'Accessibility',
                  'Developer',
                  'Audio',
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 w-full sm:w-auto min-w-0">
              <FiTrendingUp className="text-zinc-500 shrink-0" />
              <select
                className="bg-transparent text-sm outline-none w-full sm:w-auto min-w-0"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                {['Relevance', 'Rating', 'Installs', 'Updated'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right actions: stack on mobile */}
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Pill tone="zinc" icon={<FiBook />}>
              Guidelines
            </Pill>
            <Pill tone="sky" icon={<FiPlus />}>
              Submit Extension
            </Pill>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-12 gap-4 min-w-0">
        {/* Main column */}
        <div className="col-span-12 xl:col-span-8 space-y-4 min-w-0">
          {tab === 'discover' && (
            <Card
              title="Discover"
              icon={<FiGrid className="text-emerald-400" />}
              right={
                <Chip color="amber">
                  <FiStar className="inline mr-1" /> Featured
                </Chip>
              }
            >
              {renderGrid(discoverList)}
            </Card>
          )}

          {tab === 'installed' && (
            <Card
              title="Installed"
              icon={<FiArchive className="text-emerald-400" />}
              right={<Chip color="zinc">{installedList.length} total</Chip>}
            >
              {installedList.length ? (
                renderGrid(installedList)
              ) : (
                <div className="text-zinc-400 text-sm">
                  Nothing installed yet — explore Discover and add your first extension.
                </div>
              )}
            </Card>
          )}

          {tab === 'updates' && (
            <Card
              title="Updates"
              icon={<FiRefreshCw className="text-emerald-400" />}
              right={
                <Pill tone="zinc" icon={<FiRefreshCw />}>
                  Check for updates
                </Pill>
              }
            >
              {updatesList.length ? (
                renderGrid(updatesList)
              ) : (
                <div className="text-zinc-400 text-sm">All extensions are up to date.</div>
              )}
            </Card>
          )}

          {tab === 'developer' && (
            <Card
              title="Developer Mode"
              icon={<FiCode className="text-emerald-400" />}
              right={<Chip color="rose">Sandbox</Chip>}
              bodyClass="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="text-sm text-zinc-400 mb-2">Extension name</div>
                  <div className="min-w-0">
                    <Labeled label="Extension name" value={devName} onChange={setDevName} />
                  </div>

                  <div className="text-sm text-zinc-400 mt-4 mb-1">Scopes</div>
                  <div className="flex flex-wrap gap-2">
                    {['chat:read', 'chat:write', 'overlay', 'events', 'payments'].map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleScope(s)}
                        className={`px-2 py-1 rounded text-xs border ${
                          devScopes.includes(s)
                            ? 'bg-emerald-600/20 text-emerald-300 border-emerald-700'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-1 rounded-lg border border-zinc-800 bg-zinc-950 p-3 min-w-0">
                  <div className="text-sm text-zinc-400 mb-2">Local test runner</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="emerald" icon={<FiPlay />}>
                      Run
                    </Pill>
                    <Pill tone="zinc" icon={<FiUpload />}>
                      Load manifest
                    </Pill>
                    <Pill tone="zinc" icon={<FiExternalLink />}>
                      Open overlay
                    </Pill>
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    Simulates sandbox events and scope errors. Coming soon: hot-reload + console pipe.
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Side column */}
        <div className="col-span-12 xl:col-span-4 space-y-4 min-w-0">
          <Card title="Highlights" icon={<FiZap className="text-emerald-400" />}>
            <div className="space-y-3">
              {CATALOG.filter((c) => c.featured)
                .slice(0, 3)
                .map((c) => (
                  <div key={c.id} className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 bg-zinc-950 border border-zinc-800 rounded grid place-items-center text-zinc-400">
                      <FiPackage />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-200 truncate">{c.name}</div>
                      <div className="text-xs text-zinc-400 line-clamp-2">{c.short}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <RatingStars value={c.rating} />
                        <Chip color="zinc">{formatPrice(c.price)}</Chip>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          <Card title="Security & Trust" icon={<FiShield className="text-emerald-400" />}>
            <ul className="text-sm text-zinc-300 space-y-2">
              <li>
                <Chip color="sky">Verified</Chip> authors are audited and code-scanned.
              </li>
              <li>Permissions are scoped &amp; revocable. High-risk scopes are flagged.</li>
              <li>Extensions run sandboxed; overlays isolate untrusted code.</li>
            </ul>
          </Card>

          <Card title="Build for WeGoLive" icon={<FiBook className="text-emerald-400" />}>
            <div className="text-sm text-zinc-300">
              Publish your tools to the marketplace and monetize with <Chip color="amber">Rev-Share</Chip>.
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Pill tone="emerald" icon={<FiPlus />}>
                Create template
              </Pill>
              <Pill tone="zinc" icon={<FiExternalLink />}>
                Read API
              </Pill>
            </div>
          </Card>
        </div>
      </div>

      {/* Details Modal */}
      {openExt && (
        <DetailsModal
          ext={openExt}
          installed={Boolean(installed[openExt.id])}
          enabled={Boolean(installed[openExt.id]?.enabled)}
          onClose={() => setOpenId(null)}
          onInstall={() => onInstall(openExt.id)}
          onUninstall={() => {
            onUninstall(openExt.id);
            setOpenId(null);
          }}
          onToggleEnable={(v) => onToggleEnable(openExt.id, v)}
        />
      )}
    </main>
  );
}



/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 6) SMALL DEV INPUT (reuses LabeledInput but keeps naming explicit here)    │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function Labeled({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useMemo(() => `dev-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm text-zinc-400 break-words">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className="mt-1 w-full min-w-0 rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600"
      />
    </div>
  );
}
