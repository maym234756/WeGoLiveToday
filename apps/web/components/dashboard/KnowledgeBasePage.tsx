// apps/web/components/dashboard/KnowledgeBasePage.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState, useId } from 'react';
import {
  FiBook,
  FiSearch,
  FiHelpCircle,
  FiSettings,
  FiPlay,
  FiCheck,
  FiInfo,
  FiAlertCircle,
  FiCopy,
  FiLoader,
  FiZap,
  FiShield,
  FiTool,
  FiRefreshCw,
  FiStar,
  FiClock,
  FiTrash2,
  FiDownload,
  FiChevronRight,
  FiExternalLink,
  FiTag,
} from 'react-icons/fi';

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 0) TYPES                                                                   │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
type Category = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  description?: string;
};

type ArticleSection = {
  id: string;
  heading: string;
  body: React.ReactNode;
};

type Article = {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  tags: string[];
  lastUpdated: string; // ISO string
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  related?: string[]; // article ids
  sections?: ArticleSection[]; // enables TOC + section jump
  pinned?: boolean; // highlight “platform essentials”
};

type KBData = {
  categories: Category[];
  articles: Article[];
};

type FixActionId =
  | 'reset-layouts'
  | 'enable-captions'
  | 'lower-bitrate'
  | 'toggle-slowmode'
  | 'clear-cache';

type AssistantToolCall = {
  id: FixActionId;
  label: string;
  args?: Record<string, unknown>;
  state: 'queued' | 'running' | 'complete' | 'error';
  result?: string;
  error?: string;
  // Optional convenience: for toggles, show “Run again” as undo-ish
  canToggle?: boolean;
};

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  ts: number;
  toolCall?: AssistantToolCall;
};

type SortKey = 'newest' | 'title' | 'difficulty';

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 1) SMALL UTILITIES                                                         │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ');
}

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function tokenize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreArticle(query: string, a: Article) {
  const q = tokenize(query);
  if (q.length === 0) return 0;

  const hay = tokenize([a.title, a.summary, a.tags.join(' '), a.difficulty ?? '', a.categoryId].join(' '));
  const setHay = new Set(hay);

  // Basic overlap with weight for title
  let score = 0;
  for (const t of q) {
    if (setHay.has(t)) score += 1;
    if (tokenize(a.title).includes(t)) score += 2;
  }
  return score;
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 2) PERSISTENCE HOOKS                                                       │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') return initial;
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* no-op */
    }
  }, [key, value]);

  return [value, setValue] as const;
}

function useDebouncedValue<T>(value: T, ms = 180) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 3) UI PRIMITIVES                                                           │
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
    <section className={cx('bg-zinc-900 border border-zinc-800 rounded-xl min-w-0', className)}>
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800 text-zinc-300 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="truncate">{title}</span>
        </div>
        {right}
      </header>
      <div className={cx('p-4 min-w-0', bodyClass)}>{children}</div>
    </section>
  );
}

function Chip({
  color = 'emerald',
  children,
  title,
}: {
  color?: 'emerald' | 'zinc' | 'rose' | 'amber' | 'sky' | 'violet';
  children: React.ReactNode;
  title?: string;
}) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-600/20 text-emerald-300 ring-emerald-500/30',
    zinc: 'bg-zinc-700/30 text-zinc-300 ring-zinc-500/30',
    rose: 'bg-rose-600/20 text-rose-300 ring-rose-500/30',
    amber: 'bg-amber-600/20 text-amber-300 ring-amber-500/30',
    sky: 'bg-sky-600/20 text-sky-300 ring-sky-500/30',
    violet: 'bg-violet-600/20 text-violet-300 ring-violet-500/30',
  };
  return (
    <span title={title} className={cx('px-2 py-0.5 rounded text-xs ring-1 whitespace-nowrap', map[color])}>
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
  className = '',
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'zinc' | 'emerald' | 'rose' | 'sky' | 'violet';
  icon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const styles: Record<string, string> = {
    zinc: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white',
    sky: 'bg-sky-600 hover:bg-sky-500 text-white',
    violet: 'bg-violet-600 hover:bg-violet-500 text-white',
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm transition disabled:opacity-60 whitespace-nowrap',
        styles[tone],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        } catch {
          /* no-op */
        }
      }}
    >
      {ok ? <FiCheck /> : <FiCopy />} {ok ? 'Copied' : 'Copy'}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs">{children}</kbd>;
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 4) KNOWLEDGE BASE CONTENT (mock data; wire to API later)                   │
   │    - More categories + “platform essentials” pinned docs                   │
   │    - Articles have phone-safe markup: min-w-0, break-words, flex-wrap      │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
const KB: KBData = {
  categories: [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <FiBook className="text-emerald-400" />,
      description: 'Account setup, first stream, and your creator checklist.',
    },
    {
      id: 'studio',
      title: 'Studio & Scenes',
      icon: <FiSettings className="text-emerald-400" />,
      description: 'Scenes, transitions, sources, overlays, and screen share.',
    },
    {
      id: 'alerts',
      title: 'Alerts & Events',
      icon: <FiZap className="text-emerald-400" />,
      description: 'Alerts, routing, testing, and reliability.',
    },
    {
      id: 'safety',
      title: 'Safety & Moderation',
      icon: <FiShield className="text-emerald-400" />,
      description: 'Chat safety, automod, and policy-ready settings.',
    },
    {
      id: 'monetization',
      title: 'Monetization',
      icon: <FiStar className="text-emerald-400" />,
      description: 'Revenue basics, pricing, payouts, and safe growth.',
    },
    {
      id: 'creator-store',
      title: 'Creator Store (Apps)',
      icon: <FiTool className="text-emerald-400" />,
      description: 'Install apps, permissions, updates, and trusted packs.',
    },
    {
      id: 'account-security',
      title: 'Account & Security',
      icon: <FiShield className="text-emerald-400" />,
      description: '2FA, sessions, recovery, and security best practices.',
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <FiAlertCircle className="text-emerald-400" />,
      description: 'Fix common issues quickly with proven steps.',
    },
  ],

  articles: [
    /* ───────────────────────────── Getting Started ───────────────────────────── */
    {
      id: 'create-first-stream',
      categoryId: 'getting-started',
      title: 'Create your first stream',
      summary: 'Title, category, tags, and one-click “Go Live”.',
      tags: ['setup', 'title', 'go live', 'checklist'],
      lastUpdated: '2025-11-15',
      difficulty: 'Beginner',
      pinned: true,
      sections: [
        {
          id: 'overview',
          heading: 'Overview',
          body: (
            <p className="text-sm text-zinc-300 break-words">
              Open <strong>My Streams</strong>, set your <em>Title</em>, <em>Category</em>, and <em>Tags</em>. Connect mic/cam,
              preview, then press <strong>Go Live</strong>.
            </p>
          ),
        },
        {
          id: 'steps',
          heading: 'Steps',
          body: (
            <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>
                Navigate to <span className="text-emerald-400">My Streams</span>.
              </li>
              <li>Fill in stream info (Title, Category, Tags).</li>
              <li>
                Check mic/cam in Preview (toggle with <Kbd>M</Kbd>/<Kbd>V</Kbd>).
              </li>
              <li>
                Press <strong>Go Live</strong> (or enable a 3-2-1 countdown).
              </li>
            </ol>
          ),
        },
        {
          id: 'pro-tips',
          heading: 'Pro tips',
          body: (
            <div className="text-sm text-zinc-300 space-y-2 min-w-0">
              <p className="break-words">
                Add a pinned chat rule and set a slow-mode baseline during high traffic. Your channel stays clean without
                feeling restrictive.
              </p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 min-w-0">
                <div className="text-xs text-zinc-400 mb-1">Quick hotkeys</div>
                <div className="flex flex-wrap gap-2 text-xs min-w-0">
                  <span className="px-2 py-0.5 bg-zinc-800 rounded">G – Go Live</span>
                  <span className="px-2 py-0.5 bg-zinc-800 rounded">M – Mic</span>
                  <span className="px-2 py-0.5 bg-zinc-800 rounded">V – Cam</span>
                </div>
              </div>
            </div>
          ),
        },
      ],
      related: ['scene-basics', 'starter-safety-pack', 'stream-health-panel'],
    },

    {
      id: 'go-live-checklist',
      categoryId: 'getting-started',
      title: 'Creator checklist (pre-flight)',
      summary: 'A fast checklist you can run before every stream.',
      tags: ['checklist', 'quality', 'audio', 'scenes'],
      lastUpdated: '2025-11-21',
      difficulty: 'Beginner',
      pinned: true,
      sections: [
        {
          id: 'list',
          heading: 'Pre-flight checklist',
          body: (
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>Audio: speak test + check levels (avoid clipping).</li>
              <li>Scene: “Main” + “BRB” + “Ending” ready.</li>
              <li>Chat: slow-mode baseline + link filtering.</li>
              <li>Alerts: test one follow/sub/tip event.</li>
              <li>Title/tags: accurate + searchable.</li>
            </ul>
          ),
        },
        {
          id: 'fast-fixes',
          heading: 'Fast fixes (safe + reversible)',
          body: (
            <div className="text-sm text-zinc-300 space-y-2 min-w-0">
              <p className="break-words">
                Use <strong>Quick Fixes</strong> for safe actions like toggling captions or slow-mode. These should be reversible
                and logged for support.
              </p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400 break-words">
                Tip: keep a “Known Good” preset: bitrate, FPS, and ingest region that you know works.
              </div>
            </div>
          ),
        },
      ],
      related: ['fix-latency', 'starter-safety-pack'],
    },

    /* ───────────────────────────── Studio & Scenes ───────────────────────────── */
    {
      id: 'scene-basics',
      categoryId: 'studio',
      title: 'Scenes, transitions, and sources',
      summary: 'Organize scenes with cut/fade and attach Camera, Screen, Overlay.',
      tags: ['scenes', 'transitions', 'sources'],
      lastUpdated: '2025-11-04',
      difficulty: 'Beginner',
      sections: [
        {
          id: 'core',
          heading: 'Core setup',
          body: (
            <div className="space-y-2 text-sm text-zinc-300 break-words">
              <p>
                Use the Scene grid to switch between <em>Main</em>, <em>Just Chatting</em>, <em>BRB</em>, and <em>Ending</em>.
                Choose <strong>Cut</strong> or <strong>Fade</strong> transitions.
              </p>
              <p>
                Attach sources from the right panel: <strong>Camera</strong>, <strong>Screen</strong>, <strong>Overlay</strong>, and{' '}
                <strong>Audio</strong>.
              </p>
            </div>
          ),
        },
        {
          id: 'hotkeys',
          heading: 'Hotkeys',
          body: (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 min-w-0">
              <div className="text-xs text-zinc-400 mb-1">Hotkeys</div>
              <div className="flex flex-wrap gap-2 text-xs min-w-0">
                <span className="px-2 py-0.5 bg-zinc-800 rounded">1..4 – Switch scene</span>
                <span className="px-2 py-0.5 bg-zinc-800 rounded">C – Cut</span>
                <span className="px-2 py-0.5 bg-zinc-800 rounded">F – Fade</span>
                <span className="px-2 py-0.5 bg-zinc-800 rounded">S – Screen share</span>
              </div>
            </div>
          ),
        },
      ],
      related: ['overlay-browser-source'],
    },

    {
      id: 'overlay-browser-source',
      categoryId: 'studio',
      title: 'Overlays as browser sources',
      summary: 'How overlays work, where to copy URLs, and how to keep them stable.',
      tags: ['overlays', 'browser source', 'obs', 'studio'],
      lastUpdated: '2025-11-26',
      difficulty: 'Intermediate',
      sections: [
        {
          id: 'concept',
          heading: 'How it works',
          body: (
            <div className="text-sm text-zinc-300 space-y-2 min-w-0">
              <p className="break-words">
                Overlays are usually rendered in a browser source (Studio / OBS). Keep the overlay URL stable and treat it like a
                “display endpoint”.
              </p>
              <p className="text-xs text-zinc-400 break-words">
                Best practice: don’t hardcode sizes in the overlay; use responsive layout so it fits 16:9 and vertical.
              </p>
            </div>
          ),
        },
        {
          id: 'reliability',
          heading: 'Reliability',
          body: (
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>Use a single overlay URL per scene (avoid duplicates).</li>
              <li>Prefer “cache + reconnect” logic (don’t blank the screen on short drops).</li>
              <li>Keep heavy images optimized; overlays should stay lightweight.</li>
            </ul>
          ),
        },
      ],
      related: ['alerts-setup'],
    },

    /* ───────────────────────────── Alerts & Events ───────────────────────────── */
    {
      id: 'alerts-setup',
      categoryId: 'alerts',
      title: 'Configure alerts',
      summary: 'Route follows, subs, tips, raids to overlays and chat.',
      tags: ['alerts', 'webhooks', 'overlay', 'testing'],
      lastUpdated: '2025-11-18',
      difficulty: 'Intermediate',
      pinned: true,
      sections: [
        {
          id: 'connect',
          heading: 'Connect providers',
          body: (
            <p className="text-sm text-zinc-300 break-words">
              Open <strong>Alerts</strong>, connect providers, pick a theme, and test events. Add rate limits to prevent spam.
            </p>
          ),
        },
        {
          id: 'routing',
          heading: 'Routing and reliability',
          body: (
            <div className="text-sm text-zinc-300 space-y-2 min-w-0">
              <p className="break-words">
                Route high-signal events to overlays and low-signal events to an “event inbox” for review. Keep chat readable.
              </p>
              <p className="text-xs text-zinc-400 break-words">Advanced: route to Webhooks (spec coming soon).</p>
            </div>
          ),
        },
      ],
      related: ['starter-safety-pack', 'event-inbox'],
    },

    {
      id: 'event-inbox',
      categoryId: 'alerts',
      title: 'Event Inbox (anti-spam routing)',
      summary: 'Keep overlays clean by separating high-signal from noisy events.',
      tags: ['alerts', 'spam', 'routing', 'reliability'],
      lastUpdated: '2025-12-01',
      difficulty: 'Intermediate',
      sections: [
        {
          id: 'why',
          heading: 'Why it matters',
          body: (
            <p className="text-sm text-zinc-300 break-words">
              If everything hits the overlay, viewers tune out. The Event Inbox keeps your stream “signal-forward” while still
              recording all events for analytics.
            </p>
          ),
        },
        {
          id: 'rules',
          heading: 'Suggested routing rules',
          body: (
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>Overlay: first-time subs, large tips, raids above a threshold.</li>
              <li>Inbox: small tips spam, repeat follow bot waves, low-impact events.</li>
              <li>Chat: optional summary message every N minutes.</li>
            </ul>
          ),
        },
      ],
      related: ['alerts-setup'],
    },

    /* ───────────────────────────── Safety & Moderation ───────────────────────────── */
    {
      id: 'starter-safety-pack',
      categoryId: 'safety',
      title: 'Starter Safety Pack',
      summary: 'Recommended baseline: slow-mode, link rules, and escalation flow.',
      tags: ['safety', 'moderation', 'slowmode', 'links', 'liability'],
      lastUpdated: '2025-11-20',
      difficulty: 'Beginner',
      pinned: true,
      sections: [
        {
          id: 'baseline',
          heading: 'Baseline settings',
          body: (
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>Enable link filtering (allowlist domains you trust).</li>
              <li>Set slow-mode to 2–4 seconds during peaks.</li>
              <li>Require email verification for first-time chatters (optional).</li>
              <li>Escalation: warn → timeout → mod review → ban.</li>
            </ul>
          ),
        },
        {
          id: 'liability',
          heading: 'Liability-friendly moderation',
          body: (
            <div className="text-sm text-zinc-300 space-y-2 min-w-0">
              <p className="break-words">
                Keep an audit trail: show “why” a message was flagged (spam/link/harassment). That reduces disputes and protects
                the platform.
              </p>
              <p className="text-xs text-zinc-400 break-words">
                Safety note: never expose private user data in public mod notes. Keep notes internal and minimal.
              </p>
            </div>
          ),
        },
      ],
      related: ['moderator-roles', 'reporting-abuse', 'toggle-slowmode-guide', 'fix-latency'],
    },

    {
      id: 'moderator-roles',
      categoryId: 'safety',
      title: 'Moderator roles and permissions',
      summary: 'Least-privilege setup: what mods can do and what should require owner approval.',
      tags: ['mods', 'permissions', 'safety', 'audit'],
      lastUpdated: '2025-12-03',
      difficulty: 'Intermediate',
      pinned: true,
      sections: [
        {
          id: 'principle',
          heading: 'Least privilege',
          body: (
            <p className="text-sm text-zinc-300 break-words">
              Give moderators only what they need. Keep high-risk actions (perma-ban, link allowlist edits, payout changes) for
              the owner or trusted leads.
            </p>
          ),
        },
        {
          id: 'suggested',
          heading: 'Suggested role tiers',
          body: (
            <div className="text-sm text-zinc-300 space-y-2 min-w-0">
              <ul className="list-disc pl-5 space-y-2 break-words">
                <li>
                  <strong>Chat Mod:</strong> timeout, delete message, slow-mode adjustments (bounded).
                </li>
                <li>
                  <strong>Safety Lead:</strong> manage allowlists, escalation review queue, appeal responses.
                </li>
                <li>
                  <strong>Owner:</strong> bans, payout settings, policy toggles, and logs export.
                </li>
              </ul>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400 break-words">
                Tip: enable “Reason required” for timeouts above 5 minutes.
              </div>
            </div>
          ),
        },
      ],
      related: ['starter-safety-pack'],
    },

    {
      id: 'reporting-abuse',
      categoryId: 'safety',
      title: 'Reporting abuse (creator + viewer flow)',
      summary: 'How reports should work, what gets logged, and how to keep it defensible.',
      tags: ['reports', 'safety', 'policy', 'liability'],
      lastUpdated: '2025-12-05',
      difficulty: 'Advanced',
      sections: [
        {
          id: 'flow',
          heading: 'Recommended flow',
          body: (
            <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>Viewer reports message → system captures context window (e.g., ±10 messages).</li>
              <li>Automod triage → severity + category → queue.</li>
              <li>Mod review → action + reason code.</li>
              <li>Appeal (optional) → internal notes + outcome.</li>
            </ol>
          ),
        },
        {
          id: 'logs',
          heading: 'What to log (and what not to)',
          body: (
            <div className="text-sm text-zinc-300 space-y-2 min-w-0">
              <p className="break-words">
                Log action type, reason code, timestamp, and minimal context. Avoid storing sensitive data unless required.
              </p>
              <p className="text-xs text-zinc-400 break-words">
                Keep logs consistent and exportable—this protects creators and the platform.
              </p>
            </div>
          ),
        },
      ],
      related: ['starter-safety-pack'],
    },

    {
      id: 'toggle-slowmode-guide',
      categoryId: 'safety',
      title: 'Slow-mode: when to use it and how to tune it',
      summary: 'How to keep chat readable without killing engagement.',
      tags: ['slowmode', 'chat', 'engagement', 'safety'],
      lastUpdated: '2025-11-29',
      difficulty: 'Beginner',
      sections: [
        {
          id: 'ranges',
          heading: 'Recommended ranges',
          body: (
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>2–4s: normal busy streams</li>
              <li>5–8s: raids / spikes / heated topics</li>
              <li>10–15s: sustained spam or bot waves (temporary)</li>
            </ul>
          ),
        },
        {
          id: 'feel',
          heading: 'Make it feel fair',
          body: (
            <p className="text-sm text-zinc-300 break-words">
              Post a pinned message: “Slow-mode is on to keep chat readable.” Transparency reduces conflict.
            </p>
          ),
        },
      ],
      related: ['starter-safety-pack'],
    },

    /* ───────────────────────────── Monetization ───────────────────────────── */
    {
      id: 'pricing-micro-subs',
      categoryId: 'monetization',
      title: 'Micro-sub pricing that actually works',
      summary: 'How to price $0.70–$1.80 apps while staying sustainable with fees.',
      tags: ['pricing', 'stripe', 'apps', 'sustainable'],
      lastUpdated: '2025-12-08',
      difficulty: 'Advanced',
      pinned: true,
      sections: [
        {
          id: 'strategy',
          heading: 'Pricing strategy',
          body: (
            <div className="text-sm text-zinc-300 space-y-2 min-w-0">
              <p className="break-words">
                Keep “tiny subs” as impulse buys, but ensure each plan has clear value and low support burden. Bundle related
                features into “packs” where possible.
              </p>
              <ul className="list-disc pl-5 space-y-2 break-words">
                <li>$0.70–$0.80: lightweight utilities (low compute, low support)</li>
                <li>$1.50–$1.80: premium automation, analytics, safety upgrades</li>
              </ul>
            </div>
          ),
        },
        {
          id: 'fees',
          heading: 'Fee awareness (practical)',
          body: (
            <p className="text-sm text-zinc-300 break-words">
              Use Stripe “metered” or bundling if micro-charges get eaten by fees. Consider an “app wallet” later for smoother
              economics.
            </p>
          ),
        },
      ],
      related: ['store-permissions', 'store-trust'],
    },

    /* ───────────────────────────── Creator Store (Apps) ───────────────────────────── */
    {
      id: 'store-install',
      categoryId: 'creator-store',
      title: 'Installing apps from Creator Store',
      summary: 'How installs work, what gets enabled, and how to roll back safely.',
      tags: ['store', 'install', 'apps', 'rollback'],
      lastUpdated: '2025-12-10',
      difficulty: 'Beginner',
      pinned: true,
      sections: [
        {
          id: 'install',
          heading: 'Install flow',
          body: (
            <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>Open Creator Store → choose an app.</li>
              <li>Review permissions (chat read/mod, overlays, audio, etc.).</li>
              <li>Install → configure → test in Preview.</li>
              <li>If needed: disable or uninstall (settings remain saved unless you clear them).</li>
            </ol>
          ),
        },
        {
          id: 'rollback',
          heading: 'Safe rollback',
          body: (
            <p className="text-sm text-zinc-300 break-words">
              If an app causes issues, disable it first. Uninstall only if you’re sure. Keep a “Known Good” configuration so you
              can revert quickly.
            </p>
          ),
        },
      ],
      related: ['store-permissions', 'store-trust'],
    },

    {
      id: 'store-permissions',
      categoryId: 'creator-store',
      title: 'App permissions and risk levels',
      summary: 'Understand what apps can access and how to reduce liability.',
      tags: ['permissions', 'security', 'moderation', 'liability'],
      lastUpdated: '2025-12-11',
      difficulty: 'Intermediate',
      pinned: true,
      sections: [
        {
          id: 'levels',
          heading: 'Risk levels (simple)',
          body: (
            <div className="text-sm text-zinc-300 space-y-2 min-w-0">
              <ul className="list-disc pl-5 space-y-2 break-words">
                <li>
                  <strong>Low:</strong> display overlays, read public events, UI helpers.
                </li>
                <li>
                  <strong>Medium:</strong> mic access, analytics events, external integrations.
                </li>
                <li>
                  <strong>High:</strong> moderation actions (timeouts/bans), payments/cart, account settings.
                </li>
              </ul>
              <p className="text-xs text-zinc-400 break-words">
                Liability tip: require explicit confirmation before enabling high-risk permissions.
              </p>
            </div>
          ),
        },
        {
          id: 'controls',
          heading: 'Controls you should offer',
          body: (
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>Per-permission toggles (not all-or-nothing).</li>
              <li>Audit logs for “high” actions.</li>
              <li>Kill switch: disable app immediately.</li>
            </ul>
          ),
        },
      ],
      related: ['store-trust', 'starter-safety-pack'],
    },

    {
      id: 'store-trust',
      categoryId: 'creator-store',
      title: 'Verified apps and trust signals',
      summary: 'How to decide what’s safe to install (and what to avoid).',
      tags: ['verified', 'security', 'store', 'safety'],
      lastUpdated: '2025-12-12',
      difficulty: 'Intermediate',
      sections: [
        {
          id: 'signals',
          heading: 'Trust signals',
          body: (
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>Verified publisher badge + clear contact info</li>
              <li>Transparent permissions + changelog</li>
              <li>Works in Preview without requiring “high risk” by default</li>
              <li>Clear data retention policy (even if “no data stored”)</li>
            </ul>
          ),
        },
      ],
      related: ['store-permissions'],
    },

    /* ───────────────────────────── Account & Security ───────────────────────────── */
    {
      id: '2fa-setup',
      categoryId: 'account-security',
      title: 'Enable 2FA and protect your account',
      summary: '2FA basics, backup codes, and session hygiene.',
      tags: ['2fa', 'security', 'account', 'sessions'],
      lastUpdated: '2025-12-02',
      difficulty: 'Beginner',
      pinned: true,
      sections: [
        {
          id: 'why',
          heading: 'Why 2FA matters',
          body: (
            <p className="text-sm text-zinc-300 break-words">
              Streaming accounts are high-value targets. 2FA + session review prevents takeover and protects payouts.
            </p>
          ),
        },
        {
          id: 'best',
          heading: 'Best practices',
          body: (
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>Use an authenticator app (avoid SMS when possible).</li>
              <li>Store backup codes offline.</li>
              <li>Review active sessions monthly; revoke unknown devices.</li>
            </ul>
          ),
        },
      ],
      related: ['restore-account'],
    },

    {
      id: 'restore-account',
      categoryId: 'account-security',
      title: 'Account recovery (if you get locked out)',
      summary: 'Recovery steps, what support will ask for, and how to prepare.',
      tags: ['recovery', 'security', 'support'],
      lastUpdated: '2025-12-04',
      difficulty: 'Intermediate',
      sections: [
        {
          id: 'steps',
          heading: 'Recovery steps',
          body: (
            <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>Use backup codes (if enabled).</li>
              <li>Reset password and revoke sessions.</li>
              <li>Contact support with your creator ID + recent login locations.</li>
            </ol>
          ),
        },
        {
          id: 'prep',
          heading: 'Prepare now',
          body: (
            <p className="text-sm text-zinc-300 break-words">
              Keep a verified email, enable 2FA, and record a secure note of your recovery options.
            </p>
          ),
        },
      ],
      related: ['2fa-setup'],
    },

    /* ───────────────────────────── Troubleshooting ───────────────────────────── */
    {
      id: 'fix-latency',
      categoryId: 'troubleshooting',
      title: 'Fix high latency',
      summary: 'Tune bitrate, FPS, and region for stability.',
      tags: ['latency', 'bitrate', 'fps', 'health'],
      lastUpdated: '2025-10-12',
      difficulty: 'Intermediate',
      sections: [
        {
          id: 'bitrate',
          heading: 'Bitrate & FPS tuning',
          body: (
            <div className="space-y-2 text-sm text-zinc-300 min-w-0">
              <p className="break-words">
                Reduce bitrate to <strong>4500–6000 kbps</strong> for 1080p60 or <strong>3000–4500</strong> for 720p60. Try a
                closer ingest region.
              </p>
              <p className="text-xs text-zinc-400 break-words">
                Tip: Use the Health panel to monitor CPU & dropped frames in real-time.
              </p>
            </div>
          ),
        },
      ],
      related: ['stream-health-panel'],
    },

    {
      id: 'stream-health-panel',
      categoryId: 'troubleshooting',
      title: 'Stream Health Panel (what to watch live)',
      summary: 'Dropped frames, CPU, bitrate variance, and when to react.',
      tags: ['health', 'dropped frames', 'cpu', 'bitrate'],
      lastUpdated: '2025-12-06',
      difficulty: 'Intermediate',
      sections: [
        {
          id: 'signals',
          heading: 'Core signals',
          body: (
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 break-words">
              <li>Dropped frames rising → lower bitrate or reduce resolution.</li>
              <li>CPU {'>'} 85% sustained → switch encoder preset or reduce FPS.</li>
              <li>Bitrate variance → unstable network; consider wired / fallback.</li>
            </ul>
          ),
        },
        {
          id: 'quick',
          heading: 'Quick actions',
          body: (
            <p className="text-sm text-zinc-300 break-words">
              Use safe “Quick Fix” actions where available (e.g., set preferred bitrate). Restart stream if needed.
            </p>
          ),
        },
      ],
      related: ['fix-latency'],
    },
  ],
};


/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 5) SAFE “FIX-IT” ACTIONS (simulated; swap for server actions later)        │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
const ACTIONS: Record<
  FixActionId,
  { label: string; description: string; run: (args?: Record<string, unknown>) => Promise<string>; canToggle?: boolean }
> = {
  'reset-layouts': {
    label: 'Reset dashboard widget layouts',
    description: 'Clears saved RGL layouts for Analytics/KPI grids.',
    run: async () => {
      await wait(800);
      localStorage.removeItem('kpi-dashboard.layouts.v1');
      return 'Layouts reset. Refresh your dashboard to see default positions.';
    },
  },
  'enable-captions': {
    label: 'Enable live captions',
    description: 'Turns on captions overlay with default style.',
    canToggle: true,
    run: async () => {
      await wait(900);
      const cur = localStorage.getItem('feature.captions.enabled');
      if (cur === 'true') {
        localStorage.setItem('feature.captions.enabled', 'false');
        return 'Live captions disabled.';
      }
      localStorage.setItem('feature.captions.enabled', 'true');
      return 'Live captions enabled with default style. You can refine settings in Store › Captions.';
    },
  },
  'lower-bitrate': {
    label: 'Lower bitrate to improve stability',
    description: 'Sets preferred bitrate to 5500 kbps.',
    run: async () => {
      await wait(700);
      localStorage.setItem('stream.bitrate.preferred', '5500');
      return 'Preferred bitrate set to 5500 kbps. Restart the stream for changes to take effect.';
    },
  },
  'toggle-slowmode': {
    label: 'Toggle chat slow-mode',
    description: 'Sets slow-mode to 3 seconds if off, otherwise disables.',
    canToggle: true,
    run: async () => {
      await wait(600);
      const cur = localStorage.getItem('chat.slowmode.seconds');
      if (cur) {
        localStorage.removeItem('chat.slowmode.seconds');
        return 'Slow-mode disabled.';
      }
      localStorage.setItem('chat.slowmode.seconds', '3');
      return 'Slow-mode set to 3 seconds.';
    },
  },
  'clear-cache': {
    label: 'Clear local cache',
    description: 'Clears certain localStorage keys safely.',
    run: async () => {
      await wait(500);
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('wegolive.') || k.startsWith('ext.') || k.startsWith('feature.')) {
          localStorage.removeItem(k);
        }
      }
      return 'Selective cache cleared.';
    },
  },
};

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 6) MAIN PAGE                                                               │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
export default function KnowledgeBasePage() {
  const [tab, setTab] = useLocalStorage<'kb' | 'assistant'>('kb.tab', 'kb');

  const [q, setQ] = useLocalStorage('kb.search', '');
  const dq = useDebouncedValue(q, 160);

  const [activeCat, setActiveCat] = useLocalStorage<string | 'all'>('kb.cat', 'all');
  const [sort, setSort] = useLocalStorage<SortKey>('kb.sort', 'newest');

  const [activeArticleId, setActiveArticleId] = useLocalStorage<string | null>('kb.activeArticle', null);
  const [favorites, setFavorites] = useLocalStorage<string[]>('kb.favorites', []);
  const [recent, setRecent] = useLocalStorage<string[]>('kb.recent', []);

  // Assistant state
  const [messages, setMessages] = useLocalStorage<AssistantMessage[]>('kb.assistant', []);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');

  const article = useMemo(() => KB.articles.find((a) => a.id === activeArticleId) ?? null, [activeArticleId]);

  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of KB.articles) counts[a.categoryId] = (counts[a.categoryId] ?? 0) + 1;
    return KB.categories.map((c) => ({ ...c, count: counts[c.id] ?? 0 }));
  }, []);

  const filteredArticles = useMemo(() => {
    let rows = [...KB.articles];

    if (activeCat !== 'all') rows = rows.filter((a) => a.categoryId === activeCat);

    const query = dq.trim();
    if (query) {
      rows = rows
        .map((a) => ({ a, score: scoreArticle(query, a) }))
        .filter((x) => x.score > 0)
        .sort((x, y) => y.score - x.score)
        .map((x) => x.a);
    }

    // secondary sort
    if (sort === 'newest') rows.sort((a, b) => +new Date(b.lastUpdated) - +new Date(a.lastUpdated));
    if (sort === 'title') rows.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'difficulty') {
      const rank: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };
      rows.sort(
        (a, b) => (rank[a.difficulty ?? 'Beginner'] ?? 1) - (rank[b.difficulty ?? 'Beginner'] ?? 1),
      );
    }

    // pinned first (when not searching)
    if (!dq.trim()) rows.sort((a, b) => +!!b.pinned - +!!a.pinned);

    return rows;
  }, [dq, activeCat, sort]);

  const newest = useMemo(() => {
    return [...KB.articles].sort((a, b) => +new Date(b.lastUpdated) - +new Date(a.lastUpdated)).slice(0, 4);
  }, []);

  const favoriteArticles = useMemo(() => {
    const set = new Set(favorites);
    return KB.articles.filter((a) => set.has(a.id));
  }, [favorites]);

  const recentArticles = useMemo(() => {
    const map = new Map(KB.articles.map((a) => [a.id, a]));
    return recent.map((id) => map.get(id)).filter(Boolean).slice(0, 6) as Article[];
  }, [recent]);

  function openArticle(a: Article) {
    setActiveArticleId(a.id);
    setRecent((prev) => {
      const next = [a.id, ...prev.filter((x) => x !== a.id)];
      return next.slice(0, 20);
    });
    setTab('kb');
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }

  function resetSearch() {
    setQ('');
    setActiveCat('all');
    setSort('newest');
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = document.getElementById('kb-search') as HTMLInputElement | null;
        if (el) {
          e.preventDefault();
          el.focus();
        }
      }
      if (e.key === 'Escape') {
        // on mobile, "escape" behaves like "back to list"
        setActiveArticleId((cur) => (cur ? null : cur));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActiveArticleId]);

  /* ───────────── Assistant routing (naive; swap for real LLM later) ───────────── */
  async function runTool(tool: FixActionId) {
    const toolMsgId = rid();
    const start: AssistantMessage = {
      id: toolMsgId,
      role: 'assistant',
      text: '',
      ts: Date.now(),
      toolCall: { id: tool, label: ACTIONS[tool].label, state: 'running', canToggle: !!ACTIONS[tool].canToggle },
    };
    setMessages((prev) => [...prev, start]);

    try {
      const result = await ACTIONS[tool].run();
      setMessages((prev) =>
        prev.map((m) => (m.id === toolMsgId ? { ...m, toolCall: { ...m.toolCall!, state: 'complete', result } } : m)),
      );
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === toolMsgId
            ? { ...m, toolCall: { ...m.toolCall!, state: 'error', error: e?.message || 'Failed' } }
            : m,
        ),
      );
    }
  }

  function bestMatchArticleByQuery(text: string) {
    const query = text.trim();
    if (!query) return null;

    const scored = KB.articles
      .map((a) => ({ a, score: scoreArticle(query, a) }))
      .sort((x, y) => y.score - x.score);

    return scored[0]?.score ? scored[0].a : null;
  }

  async function handleAssistantSend(text: string) {
    const clean = text.trim();
    if (!clean) return;

    const userMsg: AssistantMessage = { id: rid(), role: 'user', text: clean, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);

    const t = clean.toLowerCase();
    let tool: FixActionId | null = null;

    if (t.includes('layout') && (t.includes('reset') || t.includes('default'))) tool = 'reset-layouts';
    else if (t.includes('caption')) tool = 'enable-captions';
    else if ((t.includes('lag') || t.includes('latency') || t.includes('stutter')) && (t.includes('bitrate') || t.includes('lower')))
      tool = 'lower-bitrate';
    else if (t.includes('slow') && t.includes('chat')) tool = 'toggle-slowmode';
    else if (t.includes('cache') || t.includes('storage')) tool = 'clear-cache';

    const match = bestMatchArticleByQuery(clean);

    const parts: string[] = [];
    parts.push('Here’s a fast path:');
    if (match) parts.push(`• Recommended article: **${match.title}**`);
    if (tool) parts.push(`• Optional fix-it action: **${ACTIONS[tool].label}**`);
    if (!match && !tool) {
      parts.push('• Try searching with keywords (or pick a category).');
      parts.push('• You can also ask: “Fix lag”, “Enable captions”, or “Toggle slow-mode”.');
    }

    const assistantMsg: AssistantMessage = { id: rid(), role: 'assistant', text: parts.join('\n'), ts: Date.now() };
    setMessages((prev) => [...prev, assistantMsg]);

    if (match) openArticle(match);
    if (tool) await runTool(tool);

    setBusy(false);
  }

  async function exportAssistantTranscript() {
    const lines = messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        const who = m.role === 'user' ? 'You' : 'Assistant';
        const time = new Date(m.ts).toLocaleString();
        const base = `[${time}] ${who}: ${m.text || ''}`.trim();
        const tool = m.toolCall
          ? `\n  • Tool: ${m.toolCall.label} (${m.toolCall.state})${m.toolCall.result ? `\n  • Result: ${m.toolCall.result}` : ''}`
          : '';
        return base + tool;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(lines || 'No messages yet.');
    } catch {
      /* no-op */
    }
  }

  /* ───────────── Article reading progress (scrollable body) ───────────── */
  const articleScrollRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const el = articleScrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return setProgress(100);
      const pct = Math.max(0, Math.min(100, Math.round((el.scrollTop / max) * 100)));
      setProgress(pct);
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [activeArticleId]);

  function scrollToSection(id: string) {
    const el = document.getElementById(`kb-sec-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const hasFilters = activeCat !== 'all' || sort !== 'newest' || dq.trim().length > 0;

  /* ────────────────────────────── RENDER ────────────────────────────── */
  return (
    <main className="min-h-screen w-full min-w-0 bg-black text-white max-w-none px-2 sm:px-4 lg:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <span className="text-2xl font-bold text-emerald-400 whitespace-nowrap">📚 Knowledge Base</span>
          <Chip color="zinc" title="Docs + best practices">Help Center</Chip>
          <Chip color="sky" title="Press / to search">Shortcut: <Kbd>/</Kbd></Chip>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(['kb', 'assistant'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cx(
                'text-xs px-3 py-1 rounded-md capitalize',
                tab === t ? 'bg-zinc-800' : 'hover:bg-zinc-800',
              )}
            >
              {t === 'kb' ? 'Articles' : 'Help AI'}
            </button>
          ))}
          <Pill icon={<FiHelpCircle />} tone="zinc">
            Support
          </Pill>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 min-w-0">
        {/* LEFT / MAIN COLUMN (mobile shows this when tab=kb; desktop always shows) */}
        <div className={cx('col-span-12 xl:col-span-8 space-y-4 min-w-0', tab === 'assistant' ? 'hidden xl:block' : '')}>
          {/* Search + filter */}
          <Card
            title="Find answers fast"
            icon={<FiSearch className="text-emerald-400" />}
            right={
              <div className="flex items-center gap-2">
                <Chip color="sky" title="Content freshness tracking">Updated weekly</Chip>
              </div>
            }
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 flex-1 min-w-[220px]">
                  <FiSearch className="text-zinc-500" />
                  <input
                    id="kb-search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search articles, features, or issues…"
                    className="bg-transparent outline-none text-sm placeholder:text-zinc-500 w-full min-w-0"
                  />
                  <span className="hidden sm:inline text-xs text-zinc-500">
                    <Kbd>/</Kbd>
                  </span>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800">
                  <FiBook className="text-zinc-500" />
                  <select
                    className="bg-transparent text-sm outline-none"
                    value={activeCat}
                    onChange={(e) => setActiveCat(e.target.value as any)}
                  >
                    <option value="all">All categories</option>
                    {KB.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800">
                  <FiTag className="text-zinc-500" />
                  <select
                    className="bg-transparent text-sm outline-none"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                  >
                    <option value="newest">Newest</option>
                    <option value="title">Title</option>
                    <option value="difficulty">Difficulty</option>
                  </select>
                </div>

                <Pill tone="zinc" icon={<FiRefreshCw />} onClick={resetSearch}>
                  Reset
                </Pill>
              </div>

              {/* Active filter bar */}
              {hasFilters && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className="text-zinc-500">Active:</span>
                  {dq.trim() && <Chip color="zinc" title="Search query">{dq.trim()}</Chip>}
                  {activeCat !== 'all' && (
                    <Chip color="zinc" title="Category">
                      {KB.categories.find((c) => c.id === activeCat)?.title ?? 'Category'}
                    </Chip>
                  )}
                  {sort !== 'newest' && <Chip color="zinc" title="Sort">{sort}</Chip>}
                  <button onClick={resetSearch} className="text-emerald-400 hover:underline">
                    Clear all
                  </button>
                </div>
              )}

              {/* Smart suggestions (tags) */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span className="text-zinc-500">Try:</span>
                {['slowmode', 'bitrate', 'alerts', 'scenes', 'captions', 'safety'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setQ(t)}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Mobile-only: Library + What’s new (keeps phone view “complete” without needing right column) */}
          <div className="xl:hidden grid grid-cols-12 gap-4 min-w-0">
            <Card
              title="Your library"
              icon={<FiClock className="text-emerald-400" />}
              right={<Chip color="zinc">{favorites.length} saved</Chip>}
              className="col-span-12 md:col-span-6"
            >
              <div className="space-y-3">
                {favoriteArticles.length === 0 ? (
                  <div className="text-sm text-zinc-400">Save articles you reference often.</div>
                ) : (
                  <div className="space-y-2">
                    {favoriteArticles.slice(0, 4).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => openArticle(a)}
                        className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 px-3 py-2"
                      >
                        <div className="text-sm text-zinc-200 truncate">{a.title}</div>
                        <div className="text-xs text-zinc-400 truncate">{a.summary}</div>
                      </button>
                    ))}
                  </div>
                )}

                {recentArticles.length > 0 && (
                  <div>
                    <div className="text-sm text-zinc-300 mb-2">Recently viewed</div>
                    <div className="space-y-2">
                      {recentArticles.slice(0, 3).map((a) => (
                        <button
                          key={a.id}
                          onClick={() => openArticle(a)}
                          className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 px-3 py-2"
                        >
                          <div className="text-sm text-zinc-200 truncate">{a.title}</div>
                          <div className="text-xs text-zinc-500">Updated {fmtDate(a.lastUpdated)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card title="What’s new" icon={<FiZap className="text-emerald-400" />} className="col-span-12 md:col-span-6">
              <div className="space-y-2">
                {newest.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => openArticle(a)}
                    className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-zinc-200 truncate">{a.title}</div>
                      <Chip color="zinc">{fmtDate(a.lastUpdated)}</Chip>
                    </div>
                    <div className="text-xs text-zinc-400 break-words mt-1">{a.summary}</div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Categories */}
          <Card title="Browse categories" icon={<FiBook className="text-emerald-400" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
              {categoriesWithCounts.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={cx(
                    'text-left rounded-lg border px-3 py-3 transition min-w-0',
                    activeCat === cat.id
                      ? 'border-emerald-600 bg-emerald-900/10'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700',
                  )}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="mt-0.5">{cat.icon}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="font-medium truncate">{cat.title}</div>
                        <Chip color="zinc" title="Articles in this category">
                          {cat.count}
                        </Chip>
                      </div>
                      <div className="text-sm text-zinc-400 break-words">{cat.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Articles list + details (mobile behaves like “list -> details” / desktop shows both) */}
          <div className="grid grid-cols-12 gap-4 min-w-0">
            <Card
              title={`Articles (${filteredArticles.length})`}
              icon={<FiBook className="text-emerald-400" />}
              className={cx('col-span-12 xl:col-span-6', article ? 'hidden xl:block' : '')}
              bodyClass="space-y-2"
              right={<Chip color="zinc" title="Pinned = recommended baseline">Pinned first</Chip>}
            >
              {filteredArticles.length === 0 && (
                <div className="text-sm text-zinc-400">
                  No articles found. Try different keywords or clear filters.
                </div>
              )}

              {filteredArticles.map((a) => (
                <button
                  key={a.id}
                  onClick={() => openArticle(a)}
                  className={cx(
                    'w-full text-left rounded-lg border bg-zinc-950 p-3 min-w-0',
                    a.id === activeArticleId ? 'border-emerald-700' : 'border-zinc-800 hover:border-zinc-700',
                  )}
                >
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {a.pinned && <Chip color="sky" title="Platform essential">Pinned</Chip>}
                        <div className="font-medium truncate">{a.title}</div>
                      </div>
                      <div className="text-sm text-zinc-400 mt-1 break-words">{a.summary}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Chip color="zinc">{a.difficulty || 'Beginner'}</Chip>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">{fmtDate(a.lastUpdated)}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {a.tags.slice(0, 6).map((t) => (
                      <span key={t} className="text-xs text-zinc-400 px-1.5 py-0.5 bg-zinc-800 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </Card>

            <Card
              title={article ? article.title : 'Details'}
              icon={<FiInfo className="text-emerald-400" />}
              className={cx('col-span-12 xl:col-span-6', !article ? 'hidden xl:block' : '')}
              right={
                article ? (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Chip color="zinc">{article.difficulty || 'Beginner'}</Chip>
                    <Chip color="zinc">Updated {fmtDate(article.lastUpdated)}</Chip>
                  </div>
                ) : (
                  <Chip color="zinc">Select an article</Chip>
                )
              }
              bodyClass="min-w-0"
            >
              {!article ? (
                <div className="text-sm text-zinc-400">Pick an article to view details, TOC, and quick refs.</div>
              ) : (
                <div className="space-y-4 min-w-0">
                  {/* Mobile-only back button */}
                  <div className="xl:hidden">
                    <button
                      onClick={() => setActiveArticleId(null)}
                      className="inline-flex items-center gap-2 text-sm text-zinc-200 hover:text-emerald-300"
                    >
                      <FiChevronRight className="rotate-180 text-zinc-400" />
                      Back to articles
                    </button>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleFavorite(article.id)}
                        className={cx(
                          'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
                          favorites.includes(article.id)
                            ? 'border-emerald-700 bg-emerald-900/10 text-emerald-200'
                            : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-200',
                        )}
                      >
                        <FiStar className={favorites.includes(article.id) ? 'text-emerald-300' : 'text-zinc-400'} />
                        {favorites.includes(article.id) ? 'Saved' : 'Save'}
                      </button>

                      <button
                        onClick={async () => {
                          const url = typeof window !== 'undefined' ? window.location.href : '';
                          if (url) await navigator.clipboard.writeText(url);
                        }}
                        className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 hover:border-zinc-700 px-3 py-2 text-sm text-zinc-200"
                        title="Copy page link"
                      >
                        <FiExternalLink className="text-zinc-400" />
                        Share
                      </button>
                    </div>

                    {/* Reading progress */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 whitespace-nowrap">Read</span>
                      <div className="h-2 w-40 rounded bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-emerald-600/70" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500 w-10 text-right">{progress}%</span>
                    </div>
                  </div>

                  {/* TOC */}
                  {article.sections && article.sections.length > 1 && (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <div className="text-sm text-zinc-300 mb-2">Table of contents</div>
                      <div className="flex flex-wrap gap-2">
                        {article.sections.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => scrollToSection(s.id)}
                            className="inline-flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-xs text-zinc-200"
                          >
                            <FiChevronRight className="text-zinc-400" />
                            {s.heading}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Body (scrollable) */}
                  <div
                    ref={articleScrollRef}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 max-h-[60vh] xl:max-h-[68vh] overflow-y-auto overflow-x-hidden overscroll-contain min-w-0"
                  >
                    <div className="space-y-5 min-w-0">
                      {article.sections?.map((s) => (
                        <section key={s.id} id={`kb-sec-${s.id}`} className="min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-200 mb-2">{s.heading}</h3>
                          <div className="min-w-0 break-words">{s.body}</div>
                        </section>
                      ))}
                    </div>
                  </div>

                  {/* Quick refs */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="text-sm text-zinc-300 mb-2">Quick refs</div>
                    <div className="space-y-2 text-sm min-w-0">
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <code className="text-zinc-300 break-words">Hotkeys: G (Go Live), M (Mic), V (Cam)</code>
                        <CopyBtn text="G=Go Live, M=Mic, V=Cam" />
                      </div>
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <code className="text-zinc-300 break-words">Scenes: 1..4 · Cut: C · Fade: F</code>
                        <CopyBtn text="Scenes 1..4, Cut=C, Fade=F" />
                      </div>
                    </div>
                  </div>

                  {/* Related */}
                  {article.related && article.related.length > 0 && (
                    <div>
                      <div className="text-sm text-zinc-300 mb-2">Related</div>
                      <div className="flex flex-wrap gap-2">
                        {article.related.map((id) => {
                          const a = KB.articles.find((x) => x.id === id);
                          if (!a) return null;
                          return (
                            <button
                              key={id}
                              onClick={() => openArticle(a)}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
                            >
                              {a.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN (mobile shows this when tab=assistant; desktop always shows) */}
        <div className={cx('col-span-12 xl:col-span-4 space-y-4 min-w-0', tab === 'kb' ? 'hidden xl:block' : '')}>
          {/* Your Library */}
          <Card
            title="Your library"
            icon={<FiClock className="text-emerald-400" />}
            right={<Chip color="zinc">{favorites.length} saved</Chip>}
          >
            <div className="space-y-4">
              <div>
                <div className="text-sm text-zinc-300 mb-2 flex items-center justify-between">
                  <span>Saved</span>
                  {favorites.length > 0 && (
                    <button
                      onClick={() => setFavorites([])}
                      className="text-xs text-zinc-400 hover:text-rose-300 inline-flex items-center gap-1"
                      title="Clear saved"
                    >
                      <FiTrash2 /> Clear
                    </button>
                  )}
                </div>
                {favoriteArticles.length === 0 ? (
                  <div className="text-sm text-zinc-400">Save articles you reference often.</div>
                ) : (
                  <div className="space-y-2">
                    {favoriteArticles.slice(0, 6).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => openArticle(a)}
                        className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 px-3 py-2"
                      >
                        <div className="text-sm text-zinc-200 truncate">{a.title}</div>
                        <div className="text-xs text-zinc-400 truncate">{a.summary}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm text-zinc-300 mb-2">Recently viewed</div>
                {recentArticles.length === 0 ? (
                  <div className="text-sm text-zinc-400">Articles you open will show up here.</div>
                ) : (
                  <div className="space-y-2">
                    {recentArticles.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => openArticle(a)}
                        className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 px-3 py-2"
                      >
                        <div className="text-sm text-zinc-200 truncate">{a.title}</div>
                        <div className="text-xs text-zinc-500">Updated {fmtDate(a.lastUpdated)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* What’s new */}
          <Card title="What’s new" icon={<FiZap className="text-emerald-400" />}>
            <div className="space-y-2">
              {newest.map((a) => (
                <button
                  key={a.id}
                  onClick={() => openArticle(a)}
                  className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-zinc-200 truncate">{a.title}</div>
                    <Chip color="zinc">{fmtDate(a.lastUpdated)}</Chip>
                  </div>
                  <div className="text-xs text-zinc-400 break-words mt-1">{a.summary}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Assistant */}
          <Card
            title="Help AI"
            icon={<FiHelpCircle className="text-emerald-400" />}
            right={<Chip color="violet">Experimental</Chip>}
            bodyClass="flex flex-col h-[64vh] min-w-0"
          >
            <div className="text-xs text-zinc-400 mb-2">
              Ask a question or request a <strong>safe</strong> fix-it action. This AI only runs narrowly-scoped,
              reversible settings.
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                'Fix lag by lowering bitrate',
                'Enable captions',
                'Toggle slow-mode for chat',
                'Reset my KPI layout',
                'Help me set up alerts',
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => handleAssistantSend(p)}
                  className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  disabled={busy}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 min-w-0">
              {messages.length === 0 && (
                <div className="text-sm text-zinc-400">
                  Try: “Reset my KPI grid to defaults” or “Enable captions” or “Lower bitrate to reduce lag”.
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={cx('text-sm min-w-0', m.role === 'user' ? 'text-zinc-200' : 'text-zinc-300')}>
                  {m.role !== 'system' && (
                    <div className="text-xs text-zinc-500 mb-1">
                      {m.role === 'user' ? 'You' : 'Assistant'} · {new Date(m.ts).toLocaleTimeString()}
                    </div>
                  )}

                  {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}

                  {m.toolCall && (
                    <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="text-xs text-zinc-400 flex items-center gap-2 min-w-0">
                          <FiTool /> <span className="truncate">{m.toolCall.label}</span>
                        </div>
                        <div className="text-xs shrink-0">
                          {m.toolCall.state === 'queued' && <Chip color="zinc">Queued</Chip>}
                          {m.toolCall.state === 'running' && <Chip color="sky">Running</Chip>}
                          {m.toolCall.state === 'complete' && <Chip color="emerald">Done</Chip>}
                          {m.toolCall.state === 'error' && <Chip color="rose">Error</Chip>}
                        </div>
                      </div>

                      {m.toolCall.result && <div className="text-xs text-zinc-300 mt-2 break-words">{m.toolCall.result}</div>}
                      {m.toolCall.error && <div className="text-xs text-rose-300 mt-2 break-words">{m.toolCall.error}</div>}

                      {m.toolCall.canToggle && m.toolCall.state === 'complete' && (
                        <div className="mt-2">
                          <button
                            onClick={() => runTool(m.toolCall!.id)}
                            className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                          >
                            Run again (toggle)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2 min-w-0">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for help or request a safe fix…"
                className="flex-1 min-w-0 rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !busy) handleAssistantSend(input);
                }}
              />
              <Pill
                tone="emerald"
                icon={busy ? <FiLoader className="animate-spin" /> : <FiPlay />}
                onClick={() => !busy && handleAssistantSend(input)}
                disabled={busy}
              >
                Send
              </Pill>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-500">
              <span>Safe actions only.</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await exportAssistantTranscript();
                  }}
                  className="inline-flex items-center gap-1 hover:text-zinc-200"
                  title="Copy transcript to clipboard"
                >
                  <FiDownload /> Export
                </button>
                <button
                  onClick={() => setMessages([])}
                  className="inline-flex items-center gap-1 hover:text-rose-300"
                  title="Clear assistant history"
                >
                  <FiTrash2 /> Clear
                </button>
              </div>
            </div>
          </Card>

          {/* Quick Fixes */}
          <Card title="Quick Fixes" icon={<FiZap className="text-emerald-400" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
              {Object.entries(ACTIONS).map(([id, a]) => (
                <QuickFixButton
                  key={id}
                  label={a.label}
                  description={a.description}
                  onRun={() => runTool(id as FixActionId)}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}


/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 7) SMALL PIECES                                                            │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function QuickFixButton({
  label,
  description,
  onRun,
}: {
  label: string;
  description: string;
  onRun: () => Promise<void> | void;
}) {
  const [running, setRunning] = useState(false);
  return (
    <button
      onClick={async () => {
        if (running) return;
        setRunning(true);
        try {
          await onRun();
        } finally {
          setRunning(false);
        }
      }}
      className="rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 px-3 py-2 text-left min-w-0"
    >
      <div className="text-sm text-zinc-200 flex items-center gap-2 min-w-0">
        {running ? <FiLoader className="animate-spin" /> : <FiTool />}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xs text-zinc-400 mt-1 break-words">{description}</div>
    </button>
  );
}
