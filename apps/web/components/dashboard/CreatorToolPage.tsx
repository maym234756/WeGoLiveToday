// apps/web/components/dashboard/CreatorToolsPage.tsx
'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  FiActivity, FiBell, FiBookOpen, FiCalendar, FiCheck, FiChevronRight, FiClipboard,
  FiCloud, FiDownload, FiFilm, FiGrid, FiHeadphones, FiHelpCircle, FiHome,
  FiImage, FiLayers, FiLink, FiMic, FiMicOff, FiMonitor, FiMusic, FiPlay,
  FiPlus, FiRefreshCw, FiScissors, FiSettings, FiSliders, FiSmile, FiStar,
  FiTag, FiTrendingUp, FiType, FiUpload, FiVideo, FiX, FiZap
} from 'react-icons/fi';

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 1) LIGHTWEIGHT PRIMITIVES (local to keep this file drop-in ready)          │
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
    <section className={`bg-zinc-900 border border-zinc-800 rounded-xl min-w-0 ${className}`}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-zinc-800 text-zinc-300 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="truncate">{title}</span>
        </div>

        {right && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end min-w-0">
            {right}
          </div>
        )}
      </header>

      <div className={`p-4 min-w-0 ${bodyClass}`}>{children}</div>
    </section>
  );
}

function Chip({
  color = 'emerald',
  children,
}: {
  color?: 'emerald' | 'zinc' | 'rose' | 'amber' | 'sky';
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-600/20 text-emerald-300 ring-emerald-500/30',
    zinc: 'bg-zinc-700/30 text-zinc-300 ring-zinc-500/30',
    rose: 'bg-rose-600/20 text-rose-300 ring-rose-500/30',
    amber: 'bg-amber-600/20 text-amber-300 ring-amber-500/30',
    sky: 'bg-sky-600/20 text-sky-300 ring-sky-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ring-1 inline-flex items-center ${map[color]}`}>
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'zinc' | 'emerald' | 'rose' | 'sky';
  icon?: React.ReactNode;
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
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm transition disabled:opacity-60 max-w-full ${styles[tone]}`}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  right,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
  type?: React.HTMLInputTypeAttribute;
}) {
  const id = useMemo(() => `in-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm text-zinc-400">
        {label}
      </label>
      <div className="mt-1 relative min-w-0">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 pr-10 outline-none focus:border-emerald-600"
        />
        {right && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            {right}
          </div>
        )}
      </div>
    </div>
  );
}


/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 2) PAGE                                                                    │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
export default function CreatorToolsPage() {
  const [active, setActive] = useState<
    'all' | 'video' | 'overlays' | 'audio' | 'automation' | 'growth'
  >('all');

  return (
    <main className="min-h-screen w-full min-w-0 bg-black text-white max-w-none px-2 sm:px-4 lg:px-6 py-6 sm:py-8 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl font-bold text-emerald-400 truncate">🛠 Creator Tools</span>
          <Chip>Studio</Chip>
          <Chip color="sky">Pro</Chip>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {(['all', 'video', 'overlays', 'audio', 'automation', 'growth'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setActive(k)}
              className={`text-xs px-3 py-1 rounded-md ${
                active === k ? 'bg-zinc-800' : 'hover:bg-zinc-800'
              } capitalize`}
            >
              {k}
            </button>
          ))}
          <Pill icon={<FiHelpCircle />} tone="zinc">
            Docs
          </Pill>
          <Pill icon={<FiSettings />} tone="zinc">
            Settings
          </Pill>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-12 gap-4 min-w-0">
        {/* LEFT COLUMN */}
        <div className="col-span-12 xl:col-span-7 space-y-4 min-w-0">
          {(active === 'all' || active === 'video') && <ClipStudioCard />}
          {(active === 'all' || active === 'overlays') && <OverlayStudioCard />}
          {(active === 'all' || active === 'audio') && <SoundboardCard />}
          {(active === 'all' || active === 'automation') && <MacrosCard />}
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-12 xl:col-span-5 space-y-4 min-w-0">
          {(active === 'all' || active === 'automation') && <AutoSceneCard />}
          {(active === 'all' || active === 'video') && <ABThumbnailCard />}
          {(active === 'all' || active === 'growth') && <SponsorToolkitCard />}
          {(active === 'all' || active === 'growth') && <SchedulerCard />}
          {(active === 'all' || active === 'audio') && <CaptionsCard />}
          {(active === 'all' || active === 'growth') && <EmoteMakerCard />}
          <StreamChecklistCard />
          <AssetLibraryCard />
        </div>
      </div>
    </main>
  );
}



/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 3) FEATURE CARDS                                                           │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

/* — Clip Studio — trim + markers + export presets (UI demo) */
function ClipStudioCard() {
  const [start, setStart] = useState(10);
  const [end, setEnd] = useState(45);
  const [title, setTitle] = useState('Epic clutch round');
  const [preset, setPreset] = useState<'720p' | '1080p' | 'vertical'>('vertical');
  const dur = Math.max(0, end - start);

  return (
    <Card
      title="Clip Studio"
      icon={<FiScissors className="text-emerald-400" />}
      right={<Chip color="zinc">Local demo</Chip>}
    >
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7 min-w-0">
          <div className="aspect-video rounded-lg border border-zinc-800 bg-zinc-950 grid place-items-center text-zinc-500">
            Video preview
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Start {start}s</span>
              <span>End {end}s</span>
            </div>

            {/* stack on mobile, side-by-side on sm+ */}
            <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="range"
                min={0}
                max={120}
                value={start}
                onChange={(e) => setStart(parseInt(e.target.value, 10))}
                className="w-full sm:flex-1 accent-emerald-500"
              />
              <input
                type="range"
                min={0}
                max={120}
                value={end}
                onChange={(e) => setEnd(parseInt(e.target.value, 10))}
                className="w-full sm:flex-1 accent-emerald-500"
              />
            </div>

            <div className="text-xs text-zinc-400 mt-1">Length: {dur}s</div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 min-w-0 space-y-3">
          <LabeledInput label="Clip title" value={title} onChange={setTitle} />

          <div>
            <div className="text-sm text-zinc-400 mb-1">Export preset</div>

            {/* wrap buttons on mobile */}
            <div className="flex flex-wrap gap-2">
              {(['720p', '1080p', 'vertical'] as const).map((p) => (
                <Pill
                  key={p}
                  tone={preset === p ? 'emerald' : 'zinc'}
                  onClick={() => setPreset(p)}
                >
                  {p.toUpperCase()}
                </Pill>
              ))}
            </div>
          </div>

          {/* wrap action buttons on mobile */}
          <div className="flex flex-wrap gap-2">
            <Pill tone="emerald" icon={<FiDownload />}>
              Export
            </Pill>
            <Pill tone="zinc" icon={<FiUpload />}>
              Upload
            </Pill>
            <Pill tone="zinc" icon={<FiTag />}>
              Hashtags
            </Pill>
          </div>

          <div className="text-xs text-zinc-400">
            Pro idea: auto-detect hype moments to propose clip ranges.
          </div>
        </div>
      </div>
    </Card>
  );
}


/* — Overlay Studio — quick slots + shareable URL for browser-source */
function OverlayStudioCard() {
  return (
    <Card
      title="Overlay Studio"
      icon={<FiLayers className="text-emerald-400" />}
      right={<Pill tone="zinc" icon={<FiLink />}>Copy overlay URL</Pill>}
    >
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-7">
          <div className="aspect-video rounded-lg border border-zinc-800 bg-zinc-950 relative">
            <div className="absolute top-3 left-3 text-xs bg-black/60 px-2 py-1 rounded">Canvas</div>
            <div className="absolute inset-0 grid place-items-center text-zinc-600">Drag layers (demo)</div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Pill tone="zinc" icon={<FiPlus />}>Add Text</Pill>
            <Pill tone="zinc" icon={<FiImage />}>Add Image</Pill>
            <Pill tone="zinc" icon={<FiMusic />}>Add Alert</Pill>
          </div>
        </div>
        <div className="col-span-12 md:col-span-5 space-y-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-sm text-zinc-400 mb-2">Layers</div>
            <ul className="space-y-2 text-sm">
              {['Text: Now Live', 'Image: Frame.png', 'Alert: New Follower'].map((l,i)=>(
                <li key={i} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5">
                  <span className="text-zinc-300">{l}</span>
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-zinc-400 hover:text-emerald-400"><FiChevronRight /></button>
                    <button className="text-xs text-zinc-400 hover:text-rose-400"><FiX /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="emerald" icon={<FiCloud />}>Publish</Pill>
            <Pill tone="zinc" icon={<FiRefreshCw />}>Reset</Pill>
          </div>
          <div className="text-xs text-zinc-400">Share this overlay as a browser source in OBS or your studio.</div>
        </div>
      </div>
    </Card>
  );
}

/* — Soundboard — trigger SFX; map to keys */
function SoundboardCard() {
  const [items, setItems] = useState([
    { id: 'gg', name: 'GG', key: 'G' },
    { id: 'hype', name: 'Hype', key: 'H' },
    { id: 'boo', name: 'Boo', key: 'B' },
  ]);

  return (
    <Card title="Soundboard" icon={<FiHeadphones className="text-emerald-400" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((s) => (
          <button
            key={s.id}
            className="w-full min-w-0 h-20 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-600 text-zinc-200 flex items-center justify-center gap-2 px-2"
          >
            <FiMusic />
            <span className="truncate">{s.name}</span>
            <span className="text-xs text-zinc-400">[{s.key}]</span>
          </button>
        ))}

        <button
          onClick={() =>
            setItems((prev) => [...prev, { id: `s${prev.length + 1}`, name: 'New SFX', key: '?' }])
          }
          className="w-full min-w-0 h-20 rounded-lg bg-zinc-900 border border-dashed border-zinc-700 text-zinc-300 hover:border-emerald-600 flex items-center justify-center gap-2 px-2"
        >
          <FiPlus />
          <span className="truncate">Add SFX</span>
        </button>
      </div>

      <div className="mt-3 text-xs text-zinc-400">
        Tip: map to stream deck or keyboard for instant reactions.
      </div>
    </Card>
  );
}

/* — Macros / Hotkeys — simple visual bindings */
function MacrosCard() {
  const [rows, setRows] = useState([
    { id: 'scene1', label: 'Cut to MAIN', key: '1' },
    { id: 'mute', label: 'Toggle Mic', key: 'M' },
    { id: 'clip', label: 'Create Marker', key: 'K' },
  ]);

  return (
    <Card title="Macros & Hotkeys" icon={<FiSliders className="text-emerald-400" />}>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2"
          >
            {/* Mobile: stack. Desktop: inline */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
              <div className="text-zinc-300 min-w-0">
                <span className="block truncate">{r.label}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Chip color="zinc">{r.key}</Chip>
                <button
                  type="button"
                  className="text-xs text-zinc-400 hover:text-rose-400"
                  aria-label={`Remove macro ${r.label}`}
                >
                  <FiX />
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() =>
            setRows((prev) => [
              ...prev,
              { id: `m${prev.length + 1}`, label: 'New macro', key: '?' },
            ])
          }
          className="w-full text-left text-sm text-zinc-300 rounded-md bg-zinc-900 border border-dashed border-zinc-700 px-3 py-2 hover:border-emerald-600"
        >
          <FiPlus className="inline mr-1" /> Add macro
        </button>
      </div>
    </Card>
  );
}


/* — Auto Scene Switcher — rules engine (UI) */
function AutoSceneCard() {
  const [enabled, setEnabled] = useState(true);
  const [rules, setRules] = useState([
    { id: 'game', when: 'Game launches', then: 'Switch to Game Scene' },
    { id: 'brb', when: 'Mic muted + idle 1m', then: 'Switch to BRB' },
  ]);

  return (
    <Card
      title="Auto Scene Switcher"
      icon={<FiGrid className="text-emerald-400" />}
      right={
        <Pill
          tone={enabled ? 'emerald' : 'zinc'}
          onClick={() => setEnabled((v) => !v)}
          icon={<FiZap />}
        >
          {enabled ? 'Enabled' : 'Disabled'}
        </Pill>
      }
    >
      <div className="space-y-2 min-w-0">
        {rules.map((r) => (
          <div
            key={r.id}
            className="bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm min-w-0"
          >
            {/* Stack nicely + prevent overflow */}
            <div className="flex flex-col gap-2">
              <div className="text-zinc-300 min-w-0">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Chip color="sky">WHEN</Chip>
                  <span className="truncate">{r.when}</span>
                </div>
              </div>

              <div className="text-zinc-300 min-w-0">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Chip color="emerald">THEN</Chip>
                  <span className="truncate">{r.then}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="w-full text-left text-sm text-zinc-300 rounded-md bg-zinc-900 border border-dashed border-zinc-700 px-3 py-2 hover:border-emerald-600"
        >
          <FiPlus className="inline mr-1" /> Add rule
        </button>
      </div>
    </Card>
  );
}


/* — A/B Thumbnail Tester — quick draft + rotate */
function ABThumbnailCard() {
  const [a, setA] = useState('🔥 Ranked Grind');
  const [b, setB] = useState('⚡ Road to Masters');

  return (
    <Card title="A/B Thumbnail & Title Tester" icon={<FiTrendingUp className="text-emerald-400" />}>
      {/* Mobile: 1 col. sm+: 2 cols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
        <div className="min-w-0">
          <div className="aspect-video bg-zinc-950 border border-zinc-800 rounded grid place-items-center text-zinc-600">
            A
          </div>

          {/* Optional: if you want Title A too, uncomment */}
          {/* <div className="mt-3">
            <LabeledInput label="Title A" value={a} onChange={setA} />
          </div> */}
        </div>

        <div className="min-w-0">
          <div className="aspect-video bg-zinc-950 border border-zinc-800 rounded grid place-items-center text-zinc-600">
            B
          </div>
          <div className="mt-3 min-w-0">
            <LabeledInput label="Title B" value={b} onChange={setB} />
          </div>
        </div>
      </div>

      {/* Wrap actions on mobile */}
      <div className="mt-3 flex flex-wrap items-center gap-2 min-w-0">
        <Pill tone="emerald" icon={<FiRefreshCw />}>
          Rotate during stream
        </Pill>
        <Chip color="zinc">Estimates only (demo)</Chip>
      </div>
    </Card>
  );
}


/* — Sponsor Toolkit — media kit + price calc (UI) */
function SponsorToolkitCard() {
  const [rate, setRate] = useState(75);

  return (
    <Card title="Sponsor Toolkit" icon={<FiStar className="text-emerald-400" />}>
      {/* Mobile: 1 col. sm+: 2 cols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
        <div className="min-w-0">
          <LabeledInput label="Channel niche" value="FPS / IRL" />
        </div>

        <div className="min-w-0">
          <LabeledInput label="Contact email" value="creator@wegolive.app" />
        </div>

        <div className="sm:col-span-2 min-w-0">
          <div className="text-sm text-zinc-400">Suggested CPM</div>

          {/* Mobile: stack slider + chip. sm+: inline */}
          <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
            <input
              type="range"
              min={25}
              max={200}
              value={rate}
              onChange={(e) => setRate(parseInt(e.target.value, 10))}
              className="w-full sm:flex-1 accent-emerald-500"
            />
            <div className="shrink-0">
              <Chip>${rate} CPM</Chip>
            </div>
          </div>
        </div>

        {/* Mobile: wrap buttons */}
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2 min-w-0">
          <Pill tone="zinc" icon={<FiClipboard />}>
            Copy media kit
          </Pill>
          <Pill tone="zinc" icon={<FiDownload />}>
            Export PDF
          </Pill>
        </div>
      </div>
    </Card>
  );
}


/* — Scheduler — plan streams + topics */
function SchedulerCard() {
  return (
    <Card title="Stream Scheduler" icon={<FiCalendar className="text-emerald-400" />}>
      {/* Mobile: 1 col. sm+: 2 cols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
        <div className="min-w-0">
          <LabeledInput label="Next stream date" value="Fri 8pm" />
        </div>

        <div className="min-w-0">
          <LabeledInput label="Topic" value="Ranked Push + Community Q&A" />
        </div>

        {/* Mobile: wrap buttons */}
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2 min-w-0">
          <Pill tone="emerald" icon={<FiBell />}>
            Notify followers
          </Pill>
          <Pill tone="zinc" icon={<FiLink />}>
            Share link
          </Pill>
        </div>
      </div>
    </Card>
  );
}


/* — Captions — toggle + mic source (UI) */
function CaptionsCard() {
  const [on, setOn] = useState(true);

  return (
    <Card title="Auto-Captions" icon={<FiType className="text-emerald-400" />}>
      {/* Mobile-safe: allow wrapping + avoid overflow */}
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <Pill
          tone={on ? 'emerald' : 'zinc'}
          onClick={() => setOn((v) => !v)}
          icon={on ? <FiMic /> : <FiMicOff />}
        >
          {on ? 'Enabled' : 'Disabled'}
        </Pill>

        <Chip color="zinc">EN (demo)</Chip>

        {/* Let this wrap instead of forcing width */}
        <div className="text-xs text-zinc-400 min-w-0 flex-1">
          Local demo UI — wire to your STT provider later.
        </div>
      </div>
    </Card>
  );
}


/* — Emote Maker — tiny canvas placeholder */
function EmoteMakerCard() {
  return (
    <Card title="Emote Maker (beta)" icon={<FiSmile className="text-emerald-400" />}>
      {/* Mobile: stack. md+: 8/4 split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-w-0">
        <div className="md:col-span-8 min-w-0">
          <div className="aspect-square rounded-lg border border-zinc-800 bg-zinc-950 grid place-items-center text-zinc-600">
            Canvas (draw / upload)
          </div>

          {/* Mobile-safe: wrap buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2 min-w-0">
            <Pill tone="zinc" icon={<FiUpload />}>
              Upload
            </Pill>
            <Pill tone="zinc" icon={<FiDownload />}>
              Export PNG
            </Pill>
          </div>
        </div>

        <div className="md:col-span-4 space-y-2 min-w-0">
          <div className="text-sm text-zinc-400">Sizes</div>

          {/* Allow wrap so chips don't overflow */}
          <div className="flex flex-wrap gap-2 min-w-0">
            {['112px', '56px', '28px'].map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>

          <div className="text-sm text-zinc-400">Background</div>

          {/* Allow wrap so pills don't overflow */}
          <div className="flex flex-wrap gap-2 min-w-0">
            <Pill tone="zinc">Transparent</Pill>
            <Pill tone="zinc">Dark</Pill>
            <Pill tone="zinc">Light</Pill>
          </div>
        </div>
      </div>
    </Card>
  );
}


/* — Stream Checklist — pre-flight list */
function StreamChecklistCard() {
  const items = [
    { id: 'title', txt: 'Update title & category', ok: true },
    { id: 'scenes', txt: 'Scenes & hotkeys set', ok: true },
    { id: 'alerts', txt: 'Alerts previewed', ok: false },
    { id: 'audio', txt: 'Mic levels healthy', ok: true },
  ];

  return (
    <Card title="Stream Checklist" icon={<FiHome className="text-emerald-400" />}>
      <ul className="space-y-2 min-w-0">
        {items.map((i) => (
          <li key={i.id} className="flex items-start gap-2 text-sm min-w-0">
            <span
              className={`w-5 h-5 shrink-0 rounded-full grid place-items-center border ${
                i.ok
                  ? 'bg-emerald-600 border-emerald-600'
                  : 'bg-zinc-800 border-zinc-700'
              }`}
            >
              {i.ok ? <FiCheck /> : null}
            </span>

            {/* Make text wrap/truncate safely on small screens */}
            <span className="text-zinc-300 min-w-0 break-words">{i.txt}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}


/* — Asset Library — quick stash */
function AssetLibraryCard() {
  return (
    <Card title="Asset Library" icon={<FiBookOpen className="text-emerald-400" />}>
      {/* Mobile: 1 col. sm+: 2 cols. lg+: 3 cols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
        {['overlay.png', 'brb.mp4', 'alert.wav'].map((f) => (
          <div
            key={f}
            className="min-w-0 rounded-md bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-300 flex items-center gap-2"
          >
            <FiFileIcon name={f} />
            <span className="min-w-0 truncate">{f}</span>
          </div>
        ))}

        <button
          type="button"
          className="w-full min-w-0 rounded-md bg-zinc-900 border border-dashed border-zinc-700 p-3 text-sm text-zinc-300 hover:border-emerald-600 flex items-center justify-center gap-2"
        >
          <FiPlus /> <span className="truncate">Add asset</span>
        </button>
      </div>
    </Card>
  );
}


/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 4) TINY HELPERS                                                            │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function FiFileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png' || ext === 'jpg') return <FiImage className="text-sky-400" />;
  if (ext === 'mp4' || ext === 'mov') return <FiVideo className="text-emerald-400" />;
  if (ext === 'wav' || ext === 'mp3') return <FiMusic className="text-amber-400" />;
  return <FiFileGeneric />;
}
function FiFileGeneric() {
  return <span className="inline-block w-4 h-4 rounded bg-zinc-700" />;
}
