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

type Article = {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  content: React.ReactNode;
  tags: string[];
  lastUpdated: string; // ISO string
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  related?: string[]; // article ids
};

type KBData = {
  categories: Category[];
  articles: Article[];
};

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  ts: number;
  toolCall?: {
    id: string; // action id
    label: string;
    args?: Record<string, unknown>;
    state: 'queued' | 'running' | 'complete' | 'error';
    result?: string;
    error?: string;
  };
};

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 1) PERSISTENCE HOOK (tiny, scoped)                                         │
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
    } catch {
      /* no-op */
    }
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
    <section className={`bg-zinc-900 border border-zinc-800 rounded-xl ${className}`}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 text-zinc-300">
        <div className="flex items-center gap-2">
          {icon}
          {title}
        </div>
        {right}
      </header>
      <div className={`p-4 ${bodyClass}`}>{children}</div>
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
    <span title={title} className={`px-2 py-0.5 rounded text-xs ring-1 ${map[color]}`}>
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
  tone?: 'zinc' | 'emerald' | 'rose' | 'sky' | 'violet';
  icon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
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
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm transition disabled:opacity-60 ${styles[tone]}`}
    >
      {icon}
      {children}
    </button>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  right,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm text-zinc-400">
        {label}
      </label>
      <div className="mt-1 relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 pr-10 outline-none focus:border-emerald-600"
        />
        {right && <div className="absolute inset-y-0 right-2 flex items-center">{right}</div>}
      </div>
    </div>
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

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 3) KNOWLEDGE BASE CONTENT (mock data; wire to API later)                   │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
const KB: KBData = {
  categories: [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <FiBook className="text-emerald-400" />,
      description: 'Create your account, verify, and set up your first stream.',
    },
    {
      id: 'studio',
      title: 'Studio & Scenes',
      icon: <FiSettings className="text-emerald-400" />,
      description: 'Configure scenes, transitions, overlays, and screen share.',
    },
    {
      id: 'alerts',
      title: 'Alerts & Events',
      icon: <FiZap className="text-emerald-400" />,
      description: 'Set up alerts, event routing, and reliability.',
    },
    {
      id: 'monetization',
      title: 'Monetization',
      icon: <FiShield className="text-emerald-400" />,
      description: 'Subscriptions, goals, store, payouts, and safety.',
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <FiAlertCircle className="text-emerald-400" />,
      description: 'Fix common issues quickly.',
    },
  ],
  articles: [
    {
      id: 'create-first-stream',
      categoryId: 'getting-started',
      title: 'Create your first stream',
      summary: 'Title, category, tags, and one-click “Go Live”.',
      tags: ['setup', 'title', 'go live'],
      lastUpdated: '2025-11-15',
      difficulty: 'Beginner',
      content: (
        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            Open <strong>KPI › My Streams</strong> and set your <em>Title</em>, <em>Category</em>, and{' '}
            <em>Tags</em>. Connect your mic/cam, preview, then press <strong>Go Live</strong>.
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Navigate to <span className="text-emerald-400">My Streams</span>.
            </li>
            <li>Fill in stream info (Title, Category, Tags).</li>
            <li>
              Check mic/cam in Preview (toggle with{' '}
              <kbd className="px-1 bg-zinc-800 rounded">M</kbd>/<kbd className="px-1 bg-zinc-800 rounded">V</kbd>).
            </li>
            <li>Press <strong>Go Live</strong> or <strong>3-2-1</strong> countdown.</li>
          </ol>
        </div>
      ),
      related: ['scene-basics'],
    },
    {
      id: 'scene-basics',
      categoryId: 'studio',
      title: 'Scenes, Transitions, and Sources',
      summary: 'Organize scenes with cut/fade and attach sources like Camera, Screen, Overlay.',
      tags: ['scenes', 'transitions', 'sources'],
      lastUpdated: '2025-11-04',
      difficulty: 'Beginner',
      content: (
        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            Use the Scene grid to switch between <em>Main</em>, <em>Just Chatting</em>, <em>BRB</em>, and{' '}
            <em>Ending</em>. Choose <strong>Cut</strong> or <strong>Fade</strong> transitions.
          </p>
          <p>
            Attach sources from the right panel: <strong>Camera</strong>, <strong>Screen</strong>,{' '}
            <strong>Overlay</strong>, and <strong>Audio</strong>. Use PIP when screen sharing.
          </p>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs text-zinc-400 mb-1">Hotkeys</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 bg-zinc-800 rounded">1..4 – Switch scene</span>
              <span className="px-2 py-0.5 bg-zinc-800 rounded">C – Cut</span>
              <span className="px-2 py-0.5 bg-zinc-800 rounded">F – Fade</span>
              <span className="px-2 py-0.5 bg-zinc-800 rounded">S – Screen share</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'alerts-setup',
      categoryId: 'alerts',
      title: 'Configure Alerts',
      summary: 'Route follows, subs, tips, raids to overlays and chat.',
      tags: ['alerts', 'webhooks', 'overlay'],
      lastUpdated: '2025-11-18',
      difficulty: 'Intermediate',
      content: (
        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            Open <strong>Alerts</strong> and connect providers. Select a theme, test an event, and set rate limits for
            spam prevention.
          </p>
          <p className="text-xs text-zinc-400">
            Advanced users can route to Webhooks. See:{' '}
            <span className="text-emerald-400">Alert Webhook Spec (coming soon)</span>.
          </p>
        </div>
      ),
    },
    {
      id: 'fix-latency',
      categoryId: 'troubleshooting',
      title: 'Fix high latency',
      summary: 'Tuning bitrate, FPS, and server region for stability.',
      tags: ['latency', 'bitrate', 'fps'],
      lastUpdated: '2025-10-12',
      difficulty: 'Intermediate',
      content: (
        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            Reduce bitrate to 4500–6000 kbps for 1080p60 or 3000–4500 for 720p60. Try changing ingest region to the
            closest POP.
          </p>
          <p className="text-xs text-zinc-400">Tip: Use the Health panel to monitor CPU & dropped frames in real-time.</p>
        </div>
      ),
    },
  ],
};

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 4) SAFE “FIX-IT” ACTIONS (simulated – swap for server actions later)       │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
type FixActionId = 'reset-layouts' | 'enable-captions' | 'lower-bitrate' | 'toggle-slowmode' | 'clear-cache';

const ACTIONS: Record<
  FixActionId,
  { label: string; description: string; run: (args?: Record<string, unknown>) => Promise<string> }
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
    description: 'Turns on Captions Pro overlay with default style.',
    run: async () => {
      await wait(1000);
      localStorage.setItem('feature.captions.enabled', 'true');
      return 'Live captions enabled with default style. You can refine settings in Extensions › Captions Pro.';
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

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
function rid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 5) MAIN PAGE                                                               │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
export default function KnowledgeBasePage() {
  const [tab, setTab] = useLocalStorage<'kb' | 'assistant'>('kb.tab', 'kb');
  const [q, setQ] = useLocalStorage('kb.search', '');
  const [activeCat, setActiveCat] = useLocalStorage<string | 'all'>('kb.cat', 'all');
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  // Assistant state
  const [messages, setMessages] = useLocalStorage<AssistantMessage[]>('kb.assistant', []);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');

  // Filtered article list
  const filteredArticles = useMemo(() => {
    let rows = [...KB.articles];
    if (activeCat !== 'all') rows = rows.filter((a) => a.categoryId === activeCat);
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (a) =>
          a.title.toLowerCase().includes(needle) ||
          a.summary.toLowerCase().includes(needle) ||
          a.tags.some((t) => t.toLowerCase().includes(needle)),
      );
    }
    rows.sort((a, b) => +new Date(b.lastUpdated) - +new Date(a.lastUpdated));
    return rows;
  }, [q, activeCat]);

  // Assistant intent routing (naive; replace with LLM later)
  async function handleAssistantSend(text: string) {
    if (!text.trim()) return;
    const userMsg: AssistantMessage = { id: rid(), role: 'user', text, ts: Date.now() };
    setMessages([...messages, userMsg]);
    setInput('');
    setBusy(true);

    const t = text.toLowerCase();
    let tool: FixActionId | null = null;
    if (t.includes('layout') && (t.includes('reset') || t.includes('default'))) tool = 'reset-layouts';
    else if (t.includes('caption')) tool = 'enable-captions';
    else if ((t.includes('lag') || t.includes('latency') || t.includes('stutter')) && (t.includes('bitrate') || t.includes('fps') || t.includes('lower')))
      tool = 'lower-bitrate';
    else if (t.includes('slow') && t.includes('chat')) tool = 'toggle-slowmode';
    else if (t.includes('cache') || t.includes('storage')) tool = 'clear-cache';

    const article = bestMatchArticle(t);

    let reply = 'Here’s what I found:';
    if (article) reply += ` I recommend **${article.title}** in the Knowledge Base.`;
    if (tool) reply += ` I can also run **${ACTIONS[tool].label}** for you.`;

    const assistantMsg: AssistantMessage = { id: rid(), role: 'assistant', text: reply, ts: Date.now() };
    setMessages((prev) => [...prev, assistantMsg]);

    if (tool) {
      const toolCall: AssistantMessage = {
        id: rid(),
        role: 'assistant',
        text: '',
        ts: Date.now(),
        toolCall: { id: tool, label: ACTIONS[tool].label, state: 'queued' },
      };
      setMessages((prev) => [...prev, toolCall]);

      try {
        setMessages((prev) =>
          prev.map((m) => (m.id === toolCall.id ? { ...m, toolCall: { ...m.toolCall!, state: 'running' } } : m)),
        );
        const result = await ACTIONS[tool].run();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === toolCall.id ? { ...m, toolCall: { ...m.toolCall!, state: 'complete', result } } : m,
          ),
        );
      } catch (e: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === toolCall.id
              ? { ...m, toolCall: { ...m.toolCall!, state: 'error', error: e?.message || 'Failed' } }
              : m,
          ),
        );
      }
    }

    if (article) setActiveArticle(article);
    setBusy(false);
  }

  function bestMatchArticle(lowerText: string) {
    const scored = KB.articles.map((a) => ({
      a,
      score:
        +a.title.toLowerCase().includes(lowerText) +
        +a.summary.toLowerCase().includes(lowerText) +
        a.tags.reduce((s, t) => s + +lowerText.includes(t.toLowerCase()), 0),
    }));
    scored.sort((x, y) => y.score - x.score);
    return scored[0].score > 0 ? scored[0].a : null;
  }

  /* ────────────────────────────── RENDER ────────────────────────────── */
  return (
    <main className="min-h-screen bg-black text-white w-full max-w-none overflow-hidden pl-0 pr-4 sm:pr-6 lg:pr-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-emerald-400">📚 Knowledge Base</span>
          <Chip color="zinc">Help Center</Chip>
        </div>
        <div className="flex items-center gap-2">
          {(['kb', 'assistant'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1 rounded-md ${tab === t ? 'bg-zinc-800' : 'hover:bg-zinc-800'} capitalize`}
            >
              {t === 'kb' ? 'Articles' : 'Help AI'}
            </button>
          ))}
          <Pill icon={<FiHelpCircle />} tone="zinc">
            Support
          </Pill>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Knowledge column */}
        <div className="col-span-12 xl:col-span-8 space-y-4">
          {/* Search + filter */}
          <Card title="Find answers fast" icon={<FiSearch className="text-emerald-400" />} right={<Chip color="sky">Updated weekly</Chip>}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 flex-1 min-w-[220px]">
                <FiSearch className="text-zinc-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search articles, features, or issues…"
                  className="bg-transparent outline-none text-sm placeholder:text-zinc-500 w-full"
                />
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
              <Pill tone="zinc" icon={<FiRefreshCw />} onClick={() => { setQ(''); setActiveCat('all'); }}>
                Reset
              </Pill>
            </div>
          </Card>

          {/* Categories */}
          <Card title="Browse categories" icon={<FiBook className="text-emerald-400" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {KB.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={`text-left rounded-lg border px-3 py-3 transition ${
                    activeCat === cat.id ? 'border-emerald-600 bg-emerald-900/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{cat.icon}</div>
                    <div>
                      <div className="font-medium">{cat.title}</div>
                      <div className="text-sm text-zinc-400">{cat.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Articles list + details */}
          <div className="grid grid-cols-12 gap-4">
            <Card title="Articles" icon={<FiBook className="text-emerald-400" />} className="col-span-12 xl:col-span-6" bodyClass="space-y-2">
              {filteredArticles.length === 0 && (
                <div className="text-sm text-zinc-400">No articles found. Try different keywords.</div>
              )}
              {filteredArticles.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActiveArticle(a)}
                  className="w-full text-left rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{a.title}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <Chip color="zinc">{a.difficulty || 'Beginner'}</Chip>
                      <span className="text-zinc-500">{new Date(a.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-400 mt-1">{a.summary}</div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {a.tags.map((t) => (
                      <span key={t} className="text-xs text-zinc-400 px-1.5 py-0.5 bg-zinc-800 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </Card>

            <Card
              title={activeArticle ? activeArticle.title : 'Details'}
              icon={<FiInfo className="text-emerald-400" />}
              className="col-span-12 xl:col-span-6"
            >
              {!activeArticle ? (
                <div className="text-sm text-zinc-400">Select an article to view details.</div>
              ) : (
                <div className="space-y-4">
                  {activeArticle.content}
                  <div className="text-xs text-zinc-400">Last updated: {new Date(activeArticle.lastUpdated).toLocaleDateString()}</div>

                  {/* Quick refs */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="text-sm text-zinc-400 mb-1">Quick refs</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <code className="text-zinc-300">Hotkeys: G (Go Live), M (Mic), V (Cam)</code>
                        <CopyBtn text="G=Go Live, M=Mic, V=Cam" />
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <code className="text-zinc-300">Scenes: 1..4 · Cut: C · Fade: F</code>
                        <CopyBtn text="Scenes 1..4, Cut=C, Fade=F" />
                      </div>
                    </div>
                  </div>

                  {/* Related */}
                  {activeArticle.related && activeArticle.related.length > 0 && (
                    <div>
                      <div className="text-sm text-zinc-400 mb-1">Related</div>
                      <div className="flex flex-wrap gap-2">
                        {activeArticle.related.map((id) => {
                          const a = KB.articles.find((x) => x.id === id);
                          if (!a) return null;
                          return (
                            <button
                              key={id}
                              onClick={() => setActiveArticle(a)}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs"
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

        {/* Assistant column */}
        <div className="col-span-12 xl:col-span-4 space-y-4">
          <Card
            title="Help AI"
            icon={<FiHelpCircle className="text-emerald-400" />}
            right={<Chip color="violet">Experimental</Chip>}
            bodyClass="flex flex-col h-[64vh]"
          >
            <div className="text-xs text-zinc-400 mb-2">
              Describe your issue. If it’s safe and supported, the AI can run a <strong>fix-it</strong> action (e.g.,
              reset layouts, enable captions). You’ll see what it did.
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
              {messages.length === 0 && (
                <div className="text-sm text-zinc-400">
                  Try: “Reset my KPI grid to defaults” or “Enable captions” or “Lower bitrate to reduce lag”.
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`text-sm ${m.role === 'user' ? 'text-zinc-200' : 'text-zinc-300'}`}>
                  {m.role !== 'system' && (
                    <div className="text-xs text-zinc-500 mb-1">
                      {m.role === 'user' ? 'You' : 'Assistant'} · {new Date(m.ts).toLocaleTimeString()}
                    </div>
                  )}
                  {m.text && <div className="whitespace-pre-wrap">{m.text}</div>}

                  {m.toolCall && (
                    <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-400 flex items-center gap-2">
                          <FiTool /> {m.toolCall.label}
                        </div>
                        <div className="text-xs">
                          {m.toolCall.state === 'queued' && <Chip color="zinc">Queued</Chip>}
                          {m.toolCall.state === 'running' && <Chip color="sky">Running</Chip>}
                          {m.toolCall.state === 'complete' && <Chip color="emerald">Done</Chip>}
                          {m.toolCall.state === 'error' && <Chip color="rose">Error</Chip>}
                        </div>
                      </div>
                      {m.toolCall.result && <div className="text-xs text-zinc-300 mt-2">{m.toolCall.result}</div>}
                      {m.toolCall.error && <div className="text-xs text-rose-300 mt-2">{m.toolCall.error}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for help or request a safe fix…"
                className="flex-1 rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600"
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

            <div className="mt-2 text-xs text-zinc-500">
              This assistant only runs narrowly scoped, reversible actions. Anything sensitive or destructive is out of
              scope.
            </div>
          </Card>

          <Card title="Quick Fixes" icon={<FiZap className="text-emerald-400" />}>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ACTIONS).map(([id, a]) => (
                <QuickFixButton
                  key={id}
                  label={a.label}
                  onRun={async () => {
                    const start: AssistantMessage = {
                      id: rid(),
                      role: 'assistant',
                      text: '',
                      ts: Date.now(),
                      toolCall: { id, label: a.label, state: 'running' },
                    };
                    setMessages((prev) => [...prev, start]);
                    try {
                      const result = await a.run();
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === start.id ? { ...m, toolCall: { ...m.toolCall!, state: 'complete', result } } : m,
                        ),
                      );
                    } catch (e: any) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === start.id
                            ? { ...m, toolCall: { ...m.toolCall!, state: 'error', error: e?.message || 'Failed' } }
                            : m,
                        ),
                      );
                    }
                  }}
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
   │ 6) SMALL PIECES                                                            │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function QuickFixButton({ label, onRun }: { label: string; onRun: () => void }) {
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
      className="rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 px-3 py-2 text-left"
    >
      <div className="text-sm text-zinc-200 flex items-center gap-2">
        {running ? <FiLoader className="animate-spin" /> : <FiTool />} {label}
      </div>
      <div className="text-xs text-zinc-400 mt-1">Runs a safe, reversible action.</div>
    </button>
  );
}
