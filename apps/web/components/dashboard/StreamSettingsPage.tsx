// apps/web/components/dashboard/StreamSettingsPage.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiChevronRight,
  FiClipboard,
  FiCpu,
  FiGlobe,
  FiLink,
  FiLock,
  FiRefreshCw,
  FiSave,
  FiSettings,
  FiShield,
  FiSliders,
  FiTag,
  FiUploadCloud,
  FiVideo,
  FiWifi,
  FiZap,
} from 'react-icons/fi';

type Region = 'auto' | 'us-east' | 'us-west' | 'eu' | 'sa' | 'asia';
type LatencyMode = 'ultra-low' | 'balanced' | 'quality';
type VodPolicy = 'off' | 'subs' | 'followers' | 'everyone';
type ChatDelay = 0 | 2 | 5 | 10 | 20;

type StreamPreset = {
  id: string;
  name: string;
  description: string;
  recommendedFor: string[];
  defaults: Partial<StreamSettingsState>;
};

type StreamKey = {
  id: string;
  label: string;
  masked: string;
  createdAt: number;
  lastUsedAt?: number;
  status: 'active' | 'rotated' | 'revoked';
};

type HealthMetric = {
  label: string;
  value: string;
  hint: string;
  status: 'good' | 'warn' | 'bad';
};

type StreamSettingsState = {
  // Core
  title: string;
  category: string;
  tags: string[];
  isMature: boolean;

  // Ingest
  region: Region;
  latencyMode: LatencyMode;
  autoRecover: boolean;

  // Quality
  targetBitrateKbps: number;
  maxBitrateKbps: number;
  resolution: '1080p' | '936p' | '900p' | '720p' | '480p';
  fps: 60 | 30;

  // VOD / Clips
  vodPolicy: VodPolicy;
  saveVodDays: 1 | 7 | 14 | 30;
  allowClips: boolean;
  clipMinFollowers: number;

  // Safety (stream controls)
  chatDelay: ChatDelay;
  requireEmailVerified: boolean;
  requirePhoneVerified: boolean;
  linkFilter: 'off' | 'warn' | 'block';
  capsFilter: 'off' | 'warn' | 'block';

  // Advanced
  streamPreview: boolean;
  goLiveChecklist: boolean;
  obsAutoConfig: boolean;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

/* ──────────────────────────────────────────────────────────────────────────────
  Tiny UI primitives (local, drop-in)
────────────────────────────────────────────────────────────────────────────── */
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
    <section className={cx('rounded-2xl border border-zinc-800 bg-zinc-900', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 text-zinc-200">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
        {right}
      </header>
      <div className={cx('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

function Chip({
  children,
  tone = 'zinc',
}: {
  children: React.ReactNode;
  tone?: 'zinc' | 'emerald' | 'sky' | 'amber' | 'rose';
}) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-800 text-zinc-200 ring-zinc-700',
    emerald: 'bg-emerald-600/20 text-emerald-200 ring-emerald-700/40',
    sky: 'bg-sky-600/20 text-sky-200 ring-sky-700/40',
    amber: 'bg-amber-600/20 text-amber-200 ring-amber-700/40',
    rose: 'bg-rose-600/20 text-rose-200 ring-rose-700/40',
  };
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1', map[tone])}>
      {children}
    </span>
  );
}

function PillButton({
  children,
  icon,
  onClick,
  tone = 'zinc',
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  tone?: 'zinc' | 'emerald' | 'rose' | 'sky';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const styles: Record<string, string> = {
    zinc: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white',
    sky: 'bg-sky-600 hover:bg-sky-500 text-white',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition disabled:opacity-60',
        styles[tone]
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
  right,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-200">{label}</p>
          {right}
        </div>
        {description && <p className="mt-1 text-xs text-zinc-400">{description}</p>}
      </div>

      <button
        type="button"
        aria-pressed={value}
        onClick={() => onChange(!value)}
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-full border transition',
          value ? 'border-emerald-700 bg-emerald-600/30' : 'border-zinc-700 bg-zinc-800'
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white transition',
            value ? 'left-5' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm text-zinc-300">{label}</label>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>
      <div className="mt-1">{children}</div>
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
  options: Array<{ label: string; value: string; hint?: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-700"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <input
      value={value}
      type={type}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-700"
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
  Mock data (replace with API later)
────────────────────────────────────────────────────────────────────────────── */
const PRESETS: StreamPreset[] = [
  {
    id: 'studio-default',
    name: 'Studio Default',
    description: 'Balanced latency + quality, ideal for most creators.',
    recommendedFor: ['IRL', 'Gaming', 'Music'],
    defaults: { latencyMode: 'balanced', resolution: '1080p', fps: 60, targetBitrateKbps: 6500, maxBitrateKbps: 8000 },
  },
  {
    id: 'mobile-irl',
    name: 'Mobile IRL',
    description: 'More resilient ingest + recovery for spotty networks.',
    recommendedFor: ['IRL', 'Travel'],
    defaults: { latencyMode: 'balanced', autoRecover: true, resolution: '720p', fps: 60, targetBitrateKbps: 4500, maxBitrateKbps: 6000 },
  },
  {
    id: 'ultra-low-latency',
    name: 'Ultra Low Latency',
    description: 'Best for interactive chat & drops; may reduce stability.',
    recommendedFor: ['Just Chatting', 'Q&A'],
    defaults: { latencyMode: 'ultra-low', targetBitrateKbps: 5500, maxBitrateKbps: 6500, streamPreview: true },
  },
  {
    id: 'economy',
    name: 'Economy',
    description: 'Smaller bitrate for weaker connections.',
    recommendedFor: ['Any'],
    defaults: { latencyMode: 'quality', resolution: '720p', fps: 30, targetBitrateKbps: 3000, maxBitrateKbps: 4000 },
  },
];

const INITIAL_KEYS: StreamKey[] = [
  {
    id: 'k1',
    label: 'Primary',
    masked: 'wg_•••••••••••••••_A1',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    lastUsedAt: Date.now() - 1000 * 60 * 22,
    status: 'active',
  },
  {
    id: 'k2',
    label: 'Backup',
    masked: 'wg_•••••••••••••••_B9',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
    lastUsedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    status: 'rotated',
  },
];

function formatAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return `${s}s ago`;
}

/* ──────────────────────────────────────────────────────────────────────────────
  Page
────────────────────────────────────────────────────────────────────────────── */
export default function StreamSettingsPage() {
  const [savedToast, setSavedToast] = useState<'idle' | 'saved'>('idle');
  const toastTimer = useRef<number | null>(null);

  const [settings, setSettings] = useState<StreamSettingsState>({
    // Core
    title: 'Ranked grind + viewer drops 🎁',
    category: 'Gaming',
    tags: ['Ranked', 'Competitive', 'Drops'],
    isMature: false,

    // Ingest
    region: 'auto',
    latencyMode: 'balanced',
    autoRecover: true,

    // Quality
    targetBitrateKbps: 6500,
    maxBitrateKbps: 8000,
    resolution: '1080p',
    fps: 60,

    // VOD / Clips
    vodPolicy: 'followers',
    saveVodDays: 14,
    allowClips: true,
    clipMinFollowers: 25,

    // Safety (stream controls)
    chatDelay: 2,
    requireEmailVerified: true,
    requirePhoneVerified: false,
    linkFilter: 'warn',
    capsFilter: 'warn',

    // Advanced
    streamPreview: true,
    goLiveChecklist: true,
    obsAutoConfig: true,
  });

  const [streamKeys, setStreamKeys] = useState<StreamKey[]>(INITIAL_KEYS);
  const [activeTab, setActiveTab] = useState<'overview' | 'ingest' | 'quality' | 'safety' | 'keys' | 'advanced'>(
    'overview'
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const riskScore = useMemo(() => {
    let score = 0;
    if (settings.latencyMode === 'ultra-low') score += 2;
    if (settings.maxBitrateKbps > 9000) score += 2;
    if (!settings.autoRecover) score += 2;
    if (settings.chatDelay === 0) score += 1;
    if (settings.linkFilter === 'off') score += 1;
    if (!settings.requireEmailVerified) score += 1;
    return score; // 0-?
  }, [settings]);

  const health: HealthMetric[] = useMemo(() => {
    const bitrateHeadroom = settings.maxBitrateKbps - settings.targetBitrateKbps;
    const headroomStatus: HealthMetric['status'] = bitrateHeadroom >= 1500 ? 'good' : bitrateHeadroom >= 800 ? 'warn' : 'bad';

    const latencyStatus: HealthMetric['status'] =
      settings.latencyMode === 'balanced' ? 'good' : settings.latencyMode === 'ultra-low' ? 'warn' : 'good';

    const safetyStatus: HealthMetric['status'] =
      settings.linkFilter === 'block' && settings.requireEmailVerified ? 'good' : settings.linkFilter === 'warn' ? 'warn' : 'bad';

    const vodStatus: HealthMetric['status'] = settings.vodPolicy === 'off' ? 'warn' : 'good';

    return [
      {
        label: 'Ingest region',
        value: settings.region === 'auto' ? 'Auto' : settings.region.toUpperCase(),
        hint: 'Closest edge + failover',
        status: 'good',
      },
      {
        label: 'Latency mode',
        value: settings.latencyMode.replace('-', ' '),
        hint: 'Interactivity vs stability',
        status: latencyStatus,
      },
      {
        label: 'Bitrate headroom',
        value: `${bitrateHeadroom} kbps`,
        hint: 'Avoids buffer spikes',
        status: headroomStatus,
      },
      {
        label: 'Safety posture',
        value: safetyStatus === 'good' ? 'Hardened' : safetyStatus === 'warn' ? 'Balanced' : 'Open',
        hint: 'Chat controls baseline',
        status: safetyStatus,
      },
      {
        label: 'VOD discoverability',
        value: settings.vodPolicy === 'off' ? 'Disabled' : settings.vodPolicy,
        hint: 'Replay funnel',
        status: vodStatus,
      },
    ];
  }, [settings]);

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSettings((prev) => ({ ...prev, ...preset.defaults }));
  };

  const save = () => {
    // TODO: wire to API
    setSavedToast('saved');
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setSavedToast('idle'), 1400);
  };

  const rotateKey = (id: string) => {
    setStreamKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, status: 'rotated', lastUsedAt: k.lastUsedAt } : k))
    );
    setStreamKeys((prev) => [
      {
        id: `k_${Math.random().toString(36).slice(2, 7)}`,
        label: 'Rotated',
        masked: `wg_•••••••••••••••_${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
        createdAt: Date.now(),
        status: 'active',
      },
      ...prev,
    ]);
  };

  const revokeKey = (id: string) => {
    setStreamKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k)));
  };

  const copyMasked = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full min-w-0">
      {/* Page header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-white">🎥 Stream Settings</h1>
            <Chip tone="emerald">Live-ready</Chip>
            <Chip tone={riskScore <= 2 ? 'emerald' : riskScore <= 5 ? 'amber' : 'rose'}>
              {riskScore <= 2 ? 'Stable' : riskScore <= 5 ? 'Risky' : 'High risk'}
            </Chip>
            {settings.streamPreview && <Chip tone="sky">Preview</Chip>}
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            A “production-first” control panel: quality, ingest, safety, keys, and go-live checks—optimized for mobile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PillButton tone="zinc" icon={<FiRefreshCw />} onClick={() => applyPreset('studio-default')}>
            Apply preset
          </PillButton>
          <PillButton tone="emerald" icon={<FiSave />} onClick={save}>
            Save
          </PillButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex w-full flex-wrap gap-2">
        {(
          [
            ['overview', 'Overview', <FiActivity key="i" />],
            ['ingest', 'Ingest', <FiUploadCloud key="i" />],
            ['quality', 'Quality', <FiVideo key="i" />],
            ['safety', 'Safety', <FiShield key="i" />],
            ['keys', 'Keys', <FiLock key="i" />],
            ['advanced', 'Advanced', <FiSettings key="i" />],
          ] as const
        ).map(([k, label, icon]) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            className={cx(
              'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition',
              activeTab === k
                ? 'border-emerald-700 bg-emerald-600/15 text-emerald-200'
                : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900'
            )}
          >
            <span className="opacity-90">{icon}</span>
            <span className="whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>

      {/* Content grid (stacks on mobile) */}
      <div className="grid min-w-0 grid-cols-12 gap-4">
        {/* Main column */}
        <div className="col-span-12 min-w-0 xl:col-span-8 space-y-4">
          {activeTab === 'overview' && (
            <>
              <Card
                title="Go-live essentials"
                icon={<FiZap className="text-emerald-300" />}
                right={<Chip tone="zinc">Smart checks</Chip>}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <QuickCheck
                    ok={settings.obsAutoConfig}
                    title="OBS auto-config"
                    desc="Detects encoder + suggests bitrate/resolution."
                  />
                  <QuickCheck
                    ok={settings.goLiveChecklist}
                    title="Go-live checklist"
                    desc="Pre-flight: audio, scenes, alerts, safety."
                  />
                  <QuickCheck
                    ok={settings.autoRecover}
                    title="Auto recovery"
                    desc="Reconnect strategy on packet loss."
                  />
                  <QuickCheck
                    ok={settings.linkFilter !== 'off'}
                    title="Link protection"
                    desc="Warn/block unsafe links in chat."
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <PillButton
                    tone="zinc"
                    icon={<FiSliders />}
                    onClick={() => {
                      setActiveTab('quality');
                      applyPreset('studio-default');
                    }}
                  >
                    Optimize for quality
                  </PillButton>
                  <PillButton
                    tone="zinc"
                    icon={<FiWifi />}
                    onClick={() => {
                      setActiveTab('ingest');
                      applyPreset('mobile-irl');
                    }}
                  >
                    Optimize for mobile IRL
                  </PillButton>
                  <PillButton
                    tone="zinc"
                    icon={<FiActivity />}
                    onClick={() => {
                      setActiveTab('ingest');
                      applyPreset('ultra-low-latency');
                    }}
                  >
                    Optimize for chat interactivity
                  </PillButton>
                </div>
              </Card>

              <Card title="Stream info" icon={<FiTag className="text-emerald-300" />}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Title" hint="Shown to viewers">
                    <Input
                      value={settings.title}
                      onChange={(v) => setSettings((p) => ({ ...p, title: v }))}
                      placeholder="What are you streaming today?"
                    />
                  </Field>
                  <Field label="Category" hint="Discovery + recommendations">
                    <Input
                      value={settings.category}
                      onChange={(v) => setSettings((p) => ({ ...p, category: v }))}
                      placeholder="Gaming, Music, IRL..."
                    />
                  </Field>

                  <Field label="Tags" hint="Press Enter to add">
                    <TagInput
                      tags={settings.tags}
                      onChange={(tags) => setSettings((p) => ({ ...p, tags }))}
                    />
                  </Field>

                  <Toggle
                    label="Mature content"
                    description="Hide from minors and mark as 18+ where required."
                    value={settings.isMature}
                    onChange={(v) => setSettings((p) => ({ ...p, isMature: v }))}
                    right={<Chip tone={settings.isMature ? 'rose' : 'zinc'}>{settings.isMature ? '18+' : 'Off'}</Chip>}
                  />
                </div>
              </Card>
            </>
          )}

          {activeTab === 'ingest' && (
            <>
              <Card title="Ingest & latency" icon={<FiUploadCloud className="text-emerald-300" />}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Region" hint="Auto picks nearest edge">
                    <Select
                      value={settings.region}
                      onChange={(v) => setSettings((p) => ({ ...p, region: v as Region }))}
                      options={[
                        { label: 'Auto', value: 'auto' },
                        { label: 'US-East', value: 'us-east' },
                        { label: 'US-West', value: 'us-west' },
                        { label: 'Europe', value: 'eu' },
                        { label: 'South America', value: 'sa' },
                        { label: 'Asia', value: 'asia' },
                      ]}
                    />
                  </Field>

                  <Field label="Latency mode" hint="Chat feel vs stability">
                    <Select
                      value={settings.latencyMode}
                      onChange={(v) => setSettings((p) => ({ ...p, latencyMode: v as LatencyMode }))}
                      options={[
                        { label: 'Ultra-low (interactive)', value: 'ultra-low' },
                        { label: 'Balanced (recommended)', value: 'balanced' },
                        { label: 'Quality-first', value: 'quality' },
                      ]}
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Toggle
                      label="Auto-recover on disconnect"
                      description="Reconnect with exponential backoff + safe scene recommendation."
                      value={settings.autoRecover}
                      onChange={(v) => setSettings((p) => ({ ...p, autoRecover: v }))}
                      right={<Chip tone={settings.autoRecover ? 'emerald' : 'zinc'}>{settings.autoRecover ? 'On' : 'Off'}</Chip>}
                    />
                  </div>

                  <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200">Smart ingest hint</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          If you stream on mobile networks, prefer <span className="text-zinc-200">Balanced</span> latency +{' '}
                          <span className="text-zinc-200">Auto-recover</span> to avoid dropouts.
                        </p>
                      </div>
                      <PillButton tone="zinc" icon={<FiChevronRight />} onClick={() => applyPreset('mobile-irl')}>
                        Apply Mobile IRL
                      </PillButton>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Edge health (demo)" icon={<FiGlobe className="text-emerald-300" />}>
                <EdgeHealth />
              </Card>
            </>
          )}

          {activeTab === 'quality' && (
            <>
              <Card title="Video quality" icon={<FiVideo className="text-emerald-300" />}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Resolution">
                    <Select
                      value={settings.resolution}
                      onChange={(v) => setSettings((p) => ({ ...p, resolution: v as StreamSettingsState['resolution'] }))}
                      options={[
                        { label: '1080p', value: '1080p' },
                        { label: '936p', value: '936p' },
                        { label: '900p', value: '900p' },
                        { label: '720p', value: '720p' },
                        { label: '480p', value: '480p' },
                      ]}
                    />
                  </Field>
                  <Field label="FPS">
                    <Select
                      value={String(settings.fps)}
                      onChange={(v) => setSettings((p) => ({ ...p, fps: Number(v) as 60 | 30 }))}
                      options={[
                        { label: '60 fps', value: '60' },
                        { label: '30 fps', value: '30' },
                      ]}
                    />
                  </Field>

                  <Field label="Target bitrate (kbps)" hint="Recommended: 4500–6500">
                    <Input
                      value={String(settings.targetBitrateKbps)}
                      type="number"
                      onChange={(v) => setSettings((p) => ({ ...p, targetBitrateKbps: clampInt(v, 500, 20000, 6500) }))}
                    />
                  </Field>
                  <Field label="Max bitrate (kbps)" hint="Keep headroom for spikes">
                    <Input
                      value={String(settings.maxBitrateKbps)}
                      type="number"
                      onChange={(v) => setSettings((p) => ({ ...p, maxBitrateKbps: clampInt(v, 500, 25000, 8000) }))}
                    />
                  </Field>

                  <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-start gap-3">
                      <FiCpu className="mt-0.5 text-zinc-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200">Auto encoder hints</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          We’ll later wire this to your OBS profile and suggest settings based on encoder load, dropped frames,
                          and network jitter.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Chip tone="zinc">Dropped frames: 0.2%</Chip>
                          <Chip tone="zinc">CPU: 38%</Chip>
                          <Chip tone="zinc">Jitter: 12ms</Chip>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="VOD & clips" icon={<FiLink className="text-emerald-300" />}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="VOD visibility">
                    <Select
                      value={settings.vodPolicy}
                      onChange={(v) => setSettings((p) => ({ ...p, vodPolicy: v as VodPolicy }))}
                      options={[
                        { label: 'Off', value: 'off' },
                        { label: 'Subscribers', value: 'subs' },
                        { label: 'Followers', value: 'followers' },
                        { label: 'Everyone', value: 'everyone' },
                      ]}
                    />
                  </Field>
                  <Field label="Keep VODs">
                    <Select
                      value={String(settings.saveVodDays)}
                      onChange={(v) => setSettings((p) => ({ ...p, saveVodDays: Number(v) as StreamSettingsState['saveVodDays'] }))}
                      options={[
                        { label: '1 day', value: '1' },
                        { label: '7 days', value: '7' },
                        { label: '14 days', value: '14' },
                        { label: '30 days', value: '30' },
                      ]}
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Toggle
                      label="Allow clips"
                      description="Enable viewers to clip moments from your stream."
                      value={settings.allowClips}
                      onChange={(v) => setSettings((p) => ({ ...p, allowClips: v }))}
                      right={<Chip tone={settings.allowClips ? 'emerald' : 'zinc'}>{settings.allowClips ? 'On' : 'Off'}</Chip>}
                    />
                  </div>

                  <Field label="Min followers to clip" hint="Reduces clip spam">
                    <Input
                      value={String(settings.clipMinFollowers)}
                      type="number"
                      onChange={(v) => setSettings((p) => ({ ...p, clipMinFollowers: clampInt(v, 0, 5000, 25) }))}
                    />
                  </Field>

                  <div className="md:col-span-1 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-center gap-2 text-sm text-zinc-200">
                      <FiClipboard className="text-zinc-400" />
                      Clip policy snapshot
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">
                      {settings.allowClips ? 'Clips enabled' : 'Clips disabled'} • Min followers {settings.clipMinFollowers} • VOD{' '}
                      {settings.vodPolicy}
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {activeTab === 'safety' && (
            <>
              <Card title="Chat safety & liability controls" icon={<FiShield className="text-emerald-300" />}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Chat delay" hint="Helps reactive moderation">
                    <Select
                      value={String(settings.chatDelay)}
                      onChange={(v) => setSettings((p) => ({ ...p, chatDelay: Number(v) as ChatDelay }))}
                      options={[
                        { label: '0s (off)', value: '0' },
                        { label: '2s', value: '2' },
                        { label: '5s', value: '5' },
                        { label: '10s', value: '10' },
                        { label: '20s', value: '20' },
                      ]}
                    />
                  </Field>

                  <Field label="Link filter" hint="Warn/block unsafe URLs">
                    <Select
                      value={settings.linkFilter}
                      onChange={(v) => setSettings((p) => ({ ...p, linkFilter: v as StreamSettingsState['linkFilter'] }))}
                      options={[
                        { label: 'Off', value: 'off' },
                        { label: 'Warn', value: 'warn' },
                        { label: 'Block', value: 'block' },
                      ]}
                    />
                  </Field>

                  <Field label="Caps filter" hint="Caps spam control">
                    <Select
                      value={settings.capsFilter}
                      onChange={(v) => setSettings((p) => ({ ...p, capsFilter: v as StreamSettingsState['capsFilter'] }))}
                      options={[
                        { label: 'Off', value: 'off' },
                        { label: 'Warn', value: 'warn' },
                        { label: 'Block', value: 'block' },
                      ]}
                    />
                  </Field>

                  <div className="md:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Toggle
                      label="Require email verified"
                      description="Reduces throwaway account raids."
                      value={settings.requireEmailVerified}
                      onChange={(v) => setSettings((p) => ({ ...p, requireEmailVerified: v }))}
                      right={<Chip tone={settings.requireEmailVerified ? 'emerald' : 'rose'}>{settings.requireEmailVerified ? 'On' : 'Off'}</Chip>}
                    />
                    <Toggle
                      label="Require phone verified"
                      description="Strong deterrent; may reduce growth."
                      value={settings.requirePhoneVerified}
                      onChange={(v) => setSettings((p) => ({ ...p, requirePhoneVerified: v }))}
                      right={<Chip tone={settings.requirePhoneVerified ? 'emerald' : 'zinc'}>{settings.requirePhoneVerified ? 'On' : 'Off'}</Chip>}
                    />
                  </div>

                  <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-start gap-3">
                      <FiAlertTriangle className="mt-0.5 text-amber-300" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200">Compliance posture (starter)</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          These controls are meant to reduce platform liability: link spam, harassment, and account abuse. Later we
                          can wire Guardian Mod + audit logs for moderator actions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Safety presets" icon={<FiShield className="text-emerald-300" />}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <PresetTile
                    title="Balanced"
                    desc="Great default for growth."
                    tone="zinc"
                    onClick={() =>
                      setSettings((p) => ({
                        ...p,
                        chatDelay: 2,
                        linkFilter: 'warn',
                        capsFilter: 'warn',
                        requireEmailVerified: true,
                        requirePhoneVerified: false,
                      }))
                    }
                  />
                  <PresetTile
                    title="Hardened"
                    desc="Stronger anti-raid stance."
                    tone="emerald"
                    onClick={() =>
                      setSettings((p) => ({
                        ...p,
                        chatDelay: 5,
                        linkFilter: 'block',
                        capsFilter: 'block',
                        requireEmailVerified: true,
                        requirePhoneVerified: true,
                      }))
                    }
                  />
                  <PresetTile
                    title="Open"
                    desc="Lowest friction (riskier)."
                    tone="rose"
                    onClick={() =>
                      setSettings((p) => ({
                        ...p,
                        chatDelay: 0,
                        linkFilter: 'off',
                        capsFilter: 'off',
                        requireEmailVerified: false,
                        requirePhoneVerified: false,
                      }))
                    }
                  />
                </div>
              </Card>
            </>
          )}

          {activeTab === 'keys' && (
            <>
              <Card
                title="Stream keys"
                icon={<FiLock className="text-emerald-300" />}
                right={<Chip tone="zinc">Rotation ready</Chip>}
              >
                <div className="space-y-3">
                  {streamKeys.map((k) => (
                    <div
                      key={k.id}
                      className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-200">{k.label}</p>
                          <Chip tone={k.status === 'active' ? 'emerald' : k.status === 'rotated' ? 'amber' : 'rose'}>
                            {k.status}
                          </Chip>
                          <span className="text-xs text-zinc-500">created {formatAgo(k.createdAt)}</span>
                          {k.lastUsedAt && <span className="text-xs text-zinc-500">• last used {formatAgo(k.lastUsedAt)}</span>}
                        </div>
                        <p className="mt-1 truncate font-mono text-xs text-zinc-400">{k.masked}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <PillButton tone="zinc" icon={<FiClipboard />} onClick={() => copyMasked(k.masked)}>
                          Copy
                        </PillButton>
                        <PillButton
                          tone="zinc"
                          icon={<FiRefreshCw />}
                          disabled={k.status !== 'active'}
                          onClick={() => rotateKey(k.id)}
                        >
                          Rotate
                        </PillButton>
                        <PillButton
                          tone="rose"
                          icon={<FiLock />}
                          disabled={k.status === 'revoked'}
                          onClick={() => revokeKey(k.id)}
                        >
                          Revoke
                        </PillButton>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200">Key hygiene tip</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          Rotate after sharing your OBS profile, switching PCs, or suspicious activity. Revoke keys you no longer use.
                        </p>
                      </div>
                      <PillButton tone="emerald" icon={<FiRefreshCw />} onClick={() => rotateKey(streamKeys.find((k) => k.status === 'active')?.id || streamKeys[0].id)}>
                        Rotate active
                      </PillButton>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="OBS quick actions (demo)" icon={<FiUploadCloud className="text-emerald-300" />}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <ActionTile title="Copy ingest URL" icon={<FiLink />} onClick={() => copyMasked('rtmp://ingest.wegolive.app/live')} />
                  <ActionTile title="Copy stream key" icon={<FiClipboard />} onClick={() => copyMasked('wg_live_key_masked')} />
                  <ActionTile title="Auto-config OBS" icon={<FiSliders />} onClick={() => setSettings((p) => ({ ...p, obsAutoConfig: true }))} />
                </div>
              </Card>
            </>
          )}

          {activeTab === 'advanced' && (
            <>
              <Card title="Advanced toggles" icon={<FiSettings className="text-emerald-300" />}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Toggle
                    label="Stream preview mode"
                    description="See a private preview feed before going live."
                    value={settings.streamPreview}
                    onChange={(v) => setSettings((p) => ({ ...p, streamPreview: v }))}
                    right={<Chip tone={settings.streamPreview ? 'sky' : 'zinc'}>{settings.streamPreview ? 'On' : 'Off'}</Chip>}
                  />
                  <Toggle
                    label="Go-live checklist"
                    description="Stops accidental goes-live with missing audio/alerts."
                    value={settings.goLiveChecklist}
                    onChange={(v) => setSettings((p) => ({ ...p, goLiveChecklist: v }))}
                    right={<Chip tone={settings.goLiveChecklist ? 'emerald' : 'zinc'}>{settings.goLiveChecklist ? 'On' : 'Off'}</Chip>}
                  />
                  <Toggle
                    label="OBS auto-configuration"
                    description="Suggests profile settings based on your machine."
                    value={settings.obsAutoConfig}
                    onChange={(v) => setSettings((p) => ({ ...p, obsAutoConfig: v }))}
                    right={<Chip tone={settings.obsAutoConfig ? 'emerald' : 'zinc'}>{settings.obsAutoConfig ? 'On' : 'Off'}</Chip>}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex items-start gap-3">
                    <FiShield className="mt-0.5 text-zinc-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200">Audit-ready roadmap</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Next steps: save profiles per game, version settings, export/import presets, and attach moderation policies to streams.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Chip tone="zinc">Profiles</Chip>
                        <Chip tone="zinc">Versioning</Chip>
                        <Chip tone="zinc">Policy attach</Chip>
                        <Chip tone="zinc">Audit log</Chip>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Right rail */}
        <div className="col-span-12 min-w-0 xl:col-span-4 space-y-4">
          <Card title="Health snapshot" icon={<FiActivity className="text-emerald-300" />}>
            <div className="space-y-2">
              {health.map((m) => (
                <div key={m.label} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{m.label}</p>
                    <p className="mt-1 text-xs text-zinc-400">{m.hint}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Chip tone={m.status === 'good' ? 'emerald' : m.status === 'warn' ? 'amber' : 'rose'}>{m.value}</Chip>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Presets" icon={<FiZap className="text-emerald-300" />}>
            <div className="space-y-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left hover:bg-zinc-900 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-200">{p.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">{p.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.recommendedFor.slice(0, 3).map((r) => (
                          <Chip key={r} tone="zinc">
                            {r}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <FiChevronRight className="mt-1 shrink-0 text-zinc-500" />
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Save status" icon={<FiCheck className="text-emerald-300" />}>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200">Changes</p>
                  <p className="mt-1 text-xs text-zinc-400">Save to persist settings (API wiring later).</p>
                </div>
                <PillButton tone="emerald" icon={<FiSave />} onClick={save}>
                  Save
                </PillButton>
              </div>

              {savedToast === 'saved' && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-200">
                  <FiCheck />
                  Saved
                </div>
              )}
            </div>
          </Card>

          <Card title="Shareable config (demo)" icon={<FiLink className="text-emerald-300" />}>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs text-zinc-400">
                Export a lightweight “settings profile” for collaboration. (Later: share to staff, attach to scenes, version control.)
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <PillButton tone="zinc" icon={<FiClipboard />} onClick={() => copyMasked(JSON.stringify(minifySettings(settings)))}>
                  Copy JSON
                </PillButton>
                <PillButton tone="zinc" icon={<FiUploadCloud />} onClick={() => {}}>
                  Import
                </PillButton>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
  Components
────────────────────────────────────────────────────────────────────────────── */
function QuickCheck({ ok, title, desc }: { ok: boolean; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-start gap-3">
        <span
          className={cx(
            'mt-0.5 grid h-6 w-6 place-items-center rounded-full border',
            ok ? 'border-emerald-700 bg-emerald-600/15 text-emerald-200' : 'border-amber-700 bg-amber-600/10 text-amber-200'
          )}
        >
          {ok ? <FiCheck /> : <FiAlertTriangle />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-200">{title}</p>
          <p className="mt-1 text-xs text-zinc-400">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function PresetTile({
  title,
  desc,
  tone,
  onClick,
}: {
  title: string;
  desc: string;
  tone: 'zinc' | 'emerald' | 'rose';
  onClick: () => void;
}) {
  const map: Record<string, string> = {
    zinc: 'border-zinc-800 hover:border-zinc-700',
    emerald: 'border-emerald-800/60 hover:border-emerald-700',
    rose: 'border-rose-800/60 hover:border-rose-700',
  };
  return (
    <button
      onClick={onClick}
      className={cx('rounded-2xl border bg-zinc-950 p-4 text-left transition hover:bg-zinc-900', map[tone])}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-200">{title}</p>
          <p className="mt-1 text-xs text-zinc-400">{desc}</p>
        </div>
        <FiChevronRight className="mt-0.5 shrink-0 text-zinc-500" />
      </div>
    </button>
  );
}

function ActionTile({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-left transition hover:bg-zinc-900"
    >
      <div className="flex items-center gap-3">
        <span className="text-zinc-300">{icon}</span>
        <span className="text-sm font-medium text-zinc-200">{title}</span>
      </div>
      <FiChevronRight className="text-zinc-500" />
    </button>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...tags, t].slice(0, 10));
    setDraft('');
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200"
          >
            {t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== t))}
              className="text-zinc-400 hover:text-white"
              aria-label={`Remove tag ${t}`}
            >
              ×
            </button>
          </span>
        ))}

        <div className="flex min-w-[180px] flex-1 items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Add tag…"
            className="w-full bg-transparent px-2 py-1 text-sm text-zinc-200 outline-none"
          />
          <button
            type="button"
            onClick={add}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Add
          </button>
        </div>
      </div>
      <div className="mt-2 px-2 text-xs text-zinc-500">Up to 10 tags • Helps discovery + recommendations</div>
    </div>
  );
}

function EdgeHealth() {
  const rows = [
    { region: 'US-East', ping: 18, loss: 0.1, status: 'good' as const },
    { region: 'US-West', ping: 48, loss: 0.3, status: 'good' as const },
    { region: 'Europe', ping: 92, loss: 0.6, status: 'warn' as const },
    { region: 'Asia', ping: 160, loss: 1.4, status: 'bad' as const },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="grid grid-cols-12 gap-0 border-b border-zinc-800 px-3 py-2 text-xs text-zinc-500">
        <div className="col-span-5">Region</div>
        <div className="col-span-3 text-right">Ping</div>
        <div className="col-span-2 text-right">Loss</div>
        <div className="col-span-2 text-right">Status</div>
      </div>
      {rows.map((r) => (
        <div key={r.region} className="grid grid-cols-12 gap-0 px-3 py-2 text-sm text-zinc-200">
          <div className="col-span-5">{r.region}</div>
          <div className="col-span-3 text-right">{r.ping}ms</div>
          <div className="col-span-2 text-right">{r.loss}%</div>
          <div className="col-span-2 flex justify-end">
            <Chip tone={r.status === 'good' ? 'emerald' : r.status === 'warn' ? 'amber' : 'rose'}>{r.status}</Chip>
          </div>
        </div>
      ))}
      <div className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-500">
        Demo table — later we can probe edges from the client and recommend the best region.
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
  Helpers
────────────────────────────────────────────────────────────────────────────── */
function clampInt(raw: string, min: number, max: number, fallback: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function minifySettings(s: StreamSettingsState) {
  return {
    title: s.title,
    category: s.category,
    tags: s.tags,
    mature: s.isMature,
    region: s.region,
    latency: s.latencyMode,
    recover: s.autoRecover,
    bitrate: { target: s.targetBitrateKbps, max: s.maxBitrateKbps },
    video: { res: s.resolution, fps: s.fps },
    vod: { policy: s.vodPolicy, days: s.saveVodDays },
    clips: { enabled: s.allowClips, minFollowers: s.clipMinFollowers },
    safety: {
      delay: s.chatDelay,
      emailVerified: s.requireEmailVerified,
      phoneVerified: s.requirePhoneVerified,
      link: s.linkFilter,
      caps: s.capsFilter,
    },
    advanced: { preview: s.streamPreview, checklist: s.goLiveChecklist, obsAuto: s.obsAutoConfig },
  };
}
