// apps/web/components/dashboard/MyStreamsPage.tsx
'use client';

/* ──────────────────────────────────────────────────────────────────────────────
   MyStreamsPage: Creator studio with preview, screen share + cam PIP, chat,
   guests, mixer, health, and hotkeys. Organized for easy enhancement.
   ─────────────────────────────────────────────────────────────────────────── */

import React, { useId, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiActivity, FiBell, FiCheck, FiCopy, FiCpu, FiExternalLink, FiFilm, FiHelpCircle,
  FiImage, FiLayers, FiLink, FiMic, FiMicOff, FiMonitor, FiPlay, FiPlus, FiSettings,
  FiSliders, FiStopCircle, FiUsers, FiVideo, FiX, FiVolume2, FiVolumeX, FiCamera, FiCameraOff,
  FiSquare, FiLoader
} from 'react-icons/fi';

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 1) CONSTANTS & TYPES                                                       │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
type LayoutPreset = 'solo' | 'wide' | 'studio';
type TransitionType = 'cut' | 'fade';
type SourceKind = 'camera' | 'screen';

type MixerState = {
  mic: { vol: number; mute: boolean };
  system: { vol: number; mute: boolean };
  music: { vol: number; mute: boolean };
  guests: { vol: number; mute: boolean };
};

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 2) TINY UTILS (no deps)                                                    │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
// Why: predictable helpers across the file.
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const rand  = (a: number, b: number) => Math.round(a + Math.random() * (b - a));
const fmt   = (sec: number) =>
  `${String(Math.floor(sec/3600)).padStart(2,'0')}:${String(Math.floor((sec%3600)/60)).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}`;

const attachVideo = (el: HTMLVideoElement | null, stream: MediaStream | null) => {
  if (!el) return;
  // @ts-ignore – standard pattern for assigning a stream
  el.srcObject = stream || null;
  if (stream) el.play().catch(() => {});
};
const stopAll = (s: MediaStream | null) => { try { s?.getTracks().forEach(t => t.stop()); } catch {} };

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 3) PERSISTENCE HOOK                                                        │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
// Page 3 — Enhanced persistence hook
// ------------------------------------------------------------------

type Updater<T> = T | ((prev: T) => T);

type UseLocalStorageOptions<T> = {
  /** Storage key prefix (helps avoid collisions across apps) */
  prefix?: string;
  /** Version of the stored shape; bump to force migrate/reset */
  version?: number;
  /** Migrate previously stored value to the new shape/version */
  migrate?: (stored: T, fromVersion: number) => T;
  /** Time-to-live in milliseconds. If expired, value resets to initial. */
  ttlMs?: number;
  /** Sync across tabs using the 'storage' event (default: true) */
  sync?: boolean;
  /** Custom (de)serializer if you don’t want JSON */
  serialize?: (value: StoredEnvelope<T>) => string;
  deserialize?: (raw: string) => StoredEnvelope<T>;
  /** Custom storage implementation (for tests or SSR fallbacks) */
  storage?: Storage | null;
  /** Called when a storage error occurs (quota, JSON, etc.) */
  onError?: (err: unknown) => void;
};

type StoredEnvelope<T> = {
  v?: number;          // version
  t?: number;          // timestamp (ms since epoch)
  e?: number | null;   // expiresAt (ms since epoch) or null
  d: T;                // data
};

type UseLocalStorageReturn<T> = [
  T,
  (next: Updater<T>) => void,
  {
    /** Remove the value from storage and reset to initial */
    remove: () => void;
    /** Whether the currently loaded value was expired and reset */
    expired: boolean;
    /** Last write timestamp (ms) or null if none */
    lastUpdated: number | null;
    /** Underlying storage key actually used */
    key: string;
  }
];

/**
 * SSR-safe, typed localStorage hook with versioning, migration, TTL, and cross-tab sync.
 *
 * Usage:
 *   const [settings, setSettings, meta] = useLocalStorage('settings', { theme: 'dark' }, { version: 2, migrate: ... });
 */
export function useLocalStorage<T>(
  key: string,
  initial: T,
  options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
  const {
    prefix = '',
    version,
    migrate,
    ttlMs,
    sync = true,
    serialize = (env) => JSON.stringify(env),
    deserialize = (raw) => JSON.parse(raw),
    storage = typeof window !== 'undefined' ? window.localStorage : null,
    onError,
  } = options;

  const fullKey = prefix ? `${prefix}:${key}` : key;
  const isClient = typeof window !== 'undefined' && !!storage;

  // Track meta
  const [expired, setExpired] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // We initialize state immediately to avoid hydration mismatch,
  // but we rehydrate from storage on mount (client only).
  const [state, setState] = useState<T>(initial);

  const initialRef = useRef(initial);
  const mounted = useRef(false);

  const readFromStorage = (): { value: T; expired: boolean; lastUpdated: number | null } => {
    if (!isClient) return { value: initialRef.current, expired: false, lastUpdated: null };

    try {
      const raw = storage!.getItem(fullKey);
      if (!raw) return { value: initialRef.current, expired: false, lastUpdated: null };

      const env = deserialize(raw) as StoredEnvelope<T> | null;
      if (!env || typeof env !== 'object' || !('d' in env)) {
        // Corrupt or old format: reset
        return { value: initialRef.current, expired: false, lastUpdated: null };
      }

      // TTL check
      if (env.e && Date.now() > env.e) {
        // Expired—remove it and return initial
        storage!.removeItem(fullKey);
        return { value: initialRef.current, expired: true, lastUpdated: env.t ?? null };
      }

      // Version/migration
      if (typeof version === 'number' && env.v !== version) {
        if (migrate && typeof env.v === 'number') {
          const migrated = migrate(env.d as T, env.v);
          const envelope = makeEnvelope(migrated, version, ttlMs);
          storage!.setItem(fullKey, serialize(envelope));
          return { value: migrated, expired: false, lastUpdated: envelope.t ?? null };
        }
        // No migrate provided—reset to initial
        const envelope = makeEnvelope(initialRef.current, version, ttlMs);
        storage!.setItem(fullKey, serialize(envelope));
        return { value: initialRef.current, expired: false, lastUpdated: envelope.t ?? null };
      }

      return {
        value: env.d as T,
        expired: false,
        lastUpdated: env.t ?? null,
      };
    } catch (err) {
      onError?.(err);
      return { value: initialRef.current, expired: false, lastUpdated: null };
    }
  };

  const writeToStorage = (nextValue: T) => {
    if (!isClient) return;
    try {
      const envelope = makeEnvelope(nextValue, version, ttlMs);
      storage!.setItem(fullKey, serialize(envelope));
      setLastUpdated(envelope.t ?? null);
    } catch (err) {
      onError?.(err);
    }
  };

  // Initial client rehydrate
  useEffect(() => {
    if (!isClient || mounted.current) return;
    mounted.current = true;

    const { value, expired: wasExpired, lastUpdated } = readFromStorage();
    setState(value);
    setExpired(wasExpired);
    setLastUpdated(lastUpdated ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, fullKey]);

  // Cross-tab synchronization
  useEffect(() => {
    if (!isClient || !sync) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key !== fullKey) return;
      // Another tab changed the value—rehydrate
      const { value, expired: wasExpired, lastUpdated } = readFromStorage();
      setState(value);
      setExpired(wasExpired);
      setLastUpdated(lastUpdated ?? null);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, fullKey, sync]);

  // Public setter supports functional update
  const set = (next: Updater<T>) => {
    setState((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      writeToStorage(resolved);
      setExpired(false);
      return resolved;
    });
  };

  const remove = () => {
    try {
      storage?.removeItem(fullKey);
    } catch (err) {
      onError?.(err);
    }
    setState(initialRef.current);
    setExpired(false);
    setLastUpdated(null);
  };

  return [state, set, { remove, expired, lastUpdated, key: fullKey }];
}

// Helpers
function makeEnvelope<T>(value: T, version?: number, ttlMs?: number): StoredEnvelope<T> {
  const now = Date.now();
  return {
    v: typeof version === 'number' ? version : undefined,
    t: now,
    e: typeof ttlMs === 'number' ? now + ttlMs : null,
    d: value,
  };
}


/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 4) UI PRIMITIVES                                                           │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

/* tiny class helper (optional) */
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/* ── Card ─────────────────────────────────────────────────────────────────── */

function Card({
  title,
  icon,
  right,
  children,
  className = '',
  bodyClass = '',
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={cx('bg-zinc-900 border border-zinc-800 rounded-xl min-w-0', className)}>
      {(title || icon || right) && (
        <header
          className={cx(
            'px-4 py-3 border-b border-zinc-800 text-zinc-300 min-w-0',
            // Mobile: allow wrapping; Desktop: inline
            'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            {/* Title can be long; prevent overflow */}
            <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {title}
            </div>
          </div>

          {/* Right side can wrap under title on mobile */}
          {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
        </header>
      )}

      <div className={cx('p-4 min-w-0', bodyClass)}>{children}</div>
    </section>
  );
}

/* ── Chip ─────────────────────────────────────────────────────────────────── */

function Chip({
  color = 'emerald',
  children,
}: {
  color?: 'emerald' | 'zinc' | 'rose' | 'amber';
  children: React.ReactNode;
}) {
  const map: Record<'emerald' | 'zinc' | 'rose' | 'amber', string> = {
    emerald: 'bg-emerald-600/20 text-emerald-300 ring-emerald-500/30',
    zinc: 'bg-zinc-700/30 text-zinc-300 ring-zinc-500/30',
    rose: 'bg-rose-600/20 text-rose-300 ring-rose-500/30',
    amber: 'bg-amber-600/20 text-amber-300 ring-amber-500/30',
  };

  return (
    <span className={cx('inline-flex items-center px-2 py-0.5 rounded text-xs ring-1', map[color])}>
      {children}
    </span>
  );
}

/* ── Pill (button) ────────────────────────────────────────────────────────── */

function Pill({
  children,
  onClick,
  tone = 'zinc',
  icon,
  disabled,
  loading,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'zinc' | 'emerald' | 'rose';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
}) {
  const styles: Record<'zinc' | 'emerald' | 'rose', string> = {
    zinc: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm transition',
        'max-w-full min-w-0',
        styles[tone],
        (disabled || loading) && 'opacity-60 cursor-not-allowed'
      )}
    >
      {loading && <FiLoader className="animate-spin shrink-0" aria-hidden />}
      {icon && <span className="shrink-0">{icon}</span>}
      {/* Truncate long labels so they never push width */}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

/* ── LabeledInput ─────────────────────────────────────────────────────────── */

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  right,
  type = 'text',
  className,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  right?: React.ReactNode;
  type?: React.InputHTMLAttributes<HTMLInputElement>['type'];
  className?: string;
}) {
  const id = useId();

  return (
    <div className={cx('min-w-0', className)}>
      <label htmlFor={id} className="text-sm text-zinc-400">
        {label}
      </label>

      <div className="mt-1 relative min-w-0">
        <input
          id={id}
          type={type}
          readOnly={readOnly}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 pr-10 outline-none focus:border-emerald-600"
        />
        {right && <div className="absolute inset-y-0 right-2 flex items-center">{right}</div>}
      </div>
    </div>
  );
}

/* ── Modal ────────────────────────────────────────────────────────────────── */

function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const backdropRef = useRef<HTMLDivElement | null>(null);

  // close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onMouseDown={onBackdrop}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 grid place-items-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cx(
          'w-full sm:max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden',
          'max-h-[90vh] flex flex-col'
        )}
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800 min-w-0">
          <div className="flex items-center gap-2 text-zinc-300 min-w-0">
            <FiUsers className="text-emerald-400 shrink-0" />
            <div className="min-w-0 truncate">{title}</div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded shrink-0"
            aria-label="Close"
          >
            <FiX />
          </button>
        </header>

        {/* Scroll the body if content is tall */}
        <div className="p-4 overflow-y-auto min-w-0 flex-1">{children}</div>

        {footer && (
          <div className="px-4 py-3 border-t border-zinc-800 flex flex-wrap items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ActionTile ───────────────────────────────────────────────────────────── */

function ActionTile({
  children,
  color,
  text,
  onClick,
}: {
  children: React.ReactNode;
  color: string; // e.g. "from-emerald-600 to-emerald-500"
  text?: 'zinc' | 'white';
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'w-full min-h-20 h-auto rounded-lg bg-gradient-to-b hover:opacity-95 px-4 py-3 text-left',
        text === 'zinc' ? 'text-zinc-100' : 'text-white',
        color
      )}
    >
      {children}
    </button>
  );
}

export { Card, Chip, Pill, LabeledInput, Modal, ActionTile };



/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 5) PAGE                                                                    │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
export default function MyStreamsPage() {
  /* Live state */
  const [live, setLive] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  /* Persisted UI state */
  const [micOn, setMicOn]         = useLocalStorage('streams.micOn', true);
  const [camOn, setCamOn]         = useLocalStorage('streams.camOn', true);
  const [pipOn, setPipOn]         = useLocalStorage('streams.pip', true);
  const [activeSource, setActiveSource] = useLocalStorage<SourceKind>('streams.source', 'camera');
  const [layout, setLayout]       = useLocalStorage<LayoutPreset>('streams.layout', 'studio');
  const [scene, setScene]         = useLocalStorage<number>('streams.scene', 0);
  const [transition, setTransition] = useLocalStorage<TransitionType>('streams.transition', 'fade');
  const [duration, setDuration]   = useLocalStorage<number>('streams.fadeMs', 400);
  const [info, setInfo]           = useLocalStorage('streams.info', { title: '', category: '', tags: 'chill, talk-show' });
  const [mixer, setMixer]         = useLocalStorage<MixerState>('streams.mixer', {
    mic: { vol: 80, mute: false }, system: { vol: 60, mute: false }, music: { vol: 40, mute: false }, guests: { vol: 70, mute: false },
  });

  /* Stream profiles (affect getUserMedia constraints) */
  type Profile = 'mobile' | 'standard' | 'high';
  const [profile, setProfile] = useLocalStorage<Profile>('streams.profile', 'standard');
  const profileConstraints: Record<Profile, { w: number; h: number; fps: number }> = {
    mobile:   { w:  854, h:  480, fps: 30 },
    standard: { w: 1280, h:  720, fps: 30 },
    high:     { w: 1920, h: 1080, fps: 60 },
  };

  /* Device inventory + selection (persisted) */
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [camId, setCamId] = useLocalStorage<string | null>('streams.camId', null);
  const [micId, setMicId] = useLocalStorage<string | null>('streams.micId', null);

  const refreshDevices = async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setCams(list.filter(d => d.kind === 'videoinput'));
      setMics(list.filter(d => d.kind === 'audioinput'));
    } catch { /* ignore */ }
  };
  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
  }, []);

  /* Media refs */
  const camStreamRef     = useRef<MediaStream | null>(null);
  const screenStreamRef  = useRef<MediaStream | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const videoRef         = useRef<HTMLVideoElement | null>(null);
  const camPipRef        = useRef<HTMLVideoElement | null>(null);

  const [isSharing, setIsSharing] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  /* Health sim */
  const [health, setHealth] = useState({ bitrate: 6500, fps: 60, cpu: 22, drops: 0 });
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      setHealth(h => ({
        bitrate: clamp(h.bitrate + rand(-400, 400), 2500, 8000),
        fps:     clamp(h.fps + rand(-5, 5), 30, 60),
        cpu:     clamp(h.cpu + rand(-3, 3), 8, 85),
        drops:   Math.random() < 0.07 ? h.drops + rand(1, 12) : h.drops,
      }));
    }, 1200);
    return () => clearInterval(t);
  }, [live]);

  /* Timer */
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [live]);

  /* Leave guard */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!live) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [live]);

  /* Hotkeys */
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === '?' || e.key === '/') setHelpOpen(v => !v);
      if (e.key === 'g' || e.key === 'G') onToggleGoLive();
      if (e.key === 'm' || e.key === 'M') toggleMic();
      if (e.key === 'v' || e.key === 'V') toggleCam();
      if (e.key === 'c' || e.key === 'C') setTransition('cut');
      if (e.key === 'f' || e.key === 'F') setTransition('fade');
      if (/^[1-4]$/.test(e.key)) setScene(parseInt(e.key, 10) - 1);
      if (e.key === 'p' || e.key === 'P') setPipOn(p => !p);
      if (e.key === 's' || e.key === 'S') (isSharing ? stopScreenShare : startScreenShare)();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSharing, live]);

  /* Scenes */
  const scenes = useMemo(() => ['Main', 'Just Chatting', 'BRB', 'Ending'], []);
  const statusChip = live ? <Chip color="rose">LIVE • {fmt(elapsed)}</Chip> : <Chip color="zinc">OFFLINE</Chip>;
  const healthChip = live ? <Chip color={health.cpu > 70 ? 'amber' : 'emerald'}><FiCpu className="inline mr-1" /> {health.bitrate} kbps · {health.fps} fps · {health.cpu}% CPU</Chip> : null;

  /* Helpers */
  const buildCamConstraints = () => {
    const pf = profileConstraints[profile];
    const video: MediaTrackConstraints = {
      width:  { ideal: pf.w },
      height: { ideal: pf.h },
      frameRate: { ideal: pf.fps },
      ...(camId ? { deviceId: { exact: camId } } : {}),
    };
    const audio: MediaTrackConstraints | boolean = micId ? { deviceId: { exact: micId } } : true;
    return { video, audio };
  };

  /* Media builders */
  const rebuildPreviewStream = (source: SourceKind) => {
    const cam = camStreamRef.current;
    const scr = screenStreamRef.current;

    const videoTrack =
      source === 'screen'
        ? scr?.getVideoTracks().find(t => t.readyState === 'live')
        : cam?.getVideoTracks().find(t => t.readyState === 'live');

    const audioTrack = cam?.getAudioTracks().find(t => t.readyState === 'live'); // mic from cam

    const out = new MediaStream([]);
    if (videoTrack) out.addTrack(videoTrack);
    if (audioTrack) out.addTrack(audioTrack);
    previewStreamRef.current = out;

    attachVideo(videoRef.current, out);
    if (cam && camPipRef.current) attachVideo(camPipRef.current, cam);
  };

  const startCamera = async () => {
    const constraints = buildCamConstraints();
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // attach & persist
    camStreamRef.current = stream;

    // Respect toggles
    stream.getAudioTracks().forEach(t => (t.enabled = micOn));
    stream.getVideoTracks().forEach(t => (t.enabled = camOn));

    // Auto-recover if the camera track ends (device unplugged / app took control)
    stream.getVideoTracks().forEach(vt => {
      vt.addEventListener('ended', async () => {
        try {
          if (!live) return;
          const s = await navigator.mediaDevices.getUserMedia(buildCamConstraints());
          stopAll(camStreamRef.current);
          camStreamRef.current = s;
          rebuildPreviewStream(activeSource === 'screen' ? 'screen' : 'camera');
        } catch { /* ignore */ }
      });
    });
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 60 } },
        audio: false,
      });
      screenStreamRef.current = stream;
      setIsSharing(true);
      setActiveSource('screen');
      rebuildPreviewStream('screen');

      const [v] = stream.getVideoTracks();
      v?.addEventListener('ended', () => stopScreenShare());
    } catch (e: any) {
      setMediaError(e?.message || 'Screen share was blocked/canceled');
    }
  };
  const stopScreenShare = () => {
    stopAll(screenStreamRef.current);
    screenStreamRef.current = null;
    setIsSharing(false);
    setPipOn(false);
    setActiveSource('camera');
    rebuildPreviewStream('camera');
  };

  /* Preflight (permissions + devices) */
  const preflight = async () => {
    try {
      // If labels are blank, permissions likely not granted yet; get a dummy stream to unlock labels
      if (!cams.length && !mics.length) {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        await refreshDevices();
      }
      if (cams.length === 0) throw new Error('No camera found');
      if (mics.length === 0) throw new Error('No microphone found');
      return true;
    } catch (e: any) {
      setMediaError(e?.message || 'Permissions blocked or devices unavailable');
      return false;
    }
  };

  const startStream = async () => {
    setMediaError(null);
    const ok = await preflight();
    if (!ok) return;

    try {
      await startCamera();
      setActiveSource('camera');
      rebuildPreviewStream('camera');
      setLive(true);
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError' ? 'Camera/Mic permission denied' :
        err?.name === 'NotFoundError'   ? 'Selected device not found' :
        err?.message || 'Unable to access camera/microphone';
      setMediaError(msg);
      setLive(false);
    }
  };

  const stopStream = () => {
    stopAll(previewStreamRef.current);  previewStreamRef.current = null;
    stopAll(screenStreamRef.current);   screenStreamRef.current  = null;
    stopAll(camStreamRef.current);      camStreamRef.current     = null;
    attachVideo(videoRef.current, null);
    attachVideo(camPipRef.current, null);
    setIsSharing(false);
    setActiveSource('camera');
    setLive(false);
    setElapsed(0);
  };

  const onToggleGoLive = async () => (live ? stopStream() : startStream());

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    camStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = next));
  };
  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    camStreamRef.current?.getVideoTracks().forEach(t => (t.enabled = next));
  };

  /* Preview fade control */
  const [fadeKey, setFadeKey] = useState(0);
  const switchScene = (i: number) => {
    if (transition === 'cut') { setScene(i); return; }
    setFadeKey(k => k + 1);
    setTimeout(() => setScene(i), duration / 2);
  };

  /* Screenshot */
  const takeScreenshot = () => {
    const vid = videoRef.current; if (!vid) return;
    const canvas = document.createElement('canvas');
    canvas.width = vid.videoWidth || 1280; canvas.height = vid.videoHeight || 720;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png'); a.download = `wegolive-${Date.now()}.png`; a.click();
  };

  /* 3-2-1 countdown before go-live (optional button) */
  const [counting, setCounting] = useState<number | null>(null);
  const goLiveWithCountdown = async () => {
    if (live) return stopStream();
    setCounting(3);
    const tick = async (n: number) => {
      if (n <= 0) { setCounting(null); await startStream(); return; }
      setTimeout(() => { setCounting(n - 1); tick(n - 1); }, 1000);
    };
    tick(3);
  };

  /* Chat popout – simple demo window */
  const popoutChat = () => {
    const w = window.open('', 'wegolive-chat', 'width=360,height=560');
    if (!w) return;
    w.document.title = 'Chat • WeGoLive';
    w.document.body.style.cssText = 'margin:0;background:#0a0a0a;color:#e5e7eb;font-family:system-ui,Segoe UI,Roboto,Inter,sans-serif';
    w.document.body.innerHTML = `
      <div style="padding:12px 12px 0;font-weight:600;color:#34d399">Chat</div>
      <div id="log" style="height:480px;overflow:auto;padding:12px"></div>
      <div style="display:flex;gap:6px;padding:12px">
        <input id="msg" style="flex:1;background:#0f0f10;border:1px solid #27272a;color:#e5e7eb;border-radius:8px;padding:8px" placeholder="Send a message"/>
        <button id="send" style="background:#10b981;color:#fff;border:none;border-radius:8px;padding:8px 12px">Send</button>
      </div>`;
    const log = w.document.getElementById('log')!;
    const msg = w.document.getElementById('msg') as HTMLInputElement;
    const send = w.document.getElementById('send')!;
    send.addEventListener('click', () => {
      const p = w.document.createElement('div');
      p.textContent = msg.value || 'Hello!';
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
      msg.value = '';
    });
  };

  /* ────────────────────────────── RENDER ────────────────────────────── */
  return (
    <main className="min-h-screen bg-black text-white w-full max-w-none min-w-0 px-2 sm:px-4 lg:px-6 py-6 sm:py-8 overflow-x-hidden">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between min-w-0">
        {/* Left: Title + status */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-2xl font-bold text-emerald-400">🎬 My Streams</span>
            {statusChip}
            {healthChip}
          </div>

          {mediaError && (
            <div className="mt-2 text-rose-400 text-sm break-words">
              {mediaError}
            </div>
          )}
        </div>

        {/* Right: Controls (wrap + stack on phone) */}
        <div className="min-w-0 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          {/* Layout preset buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {(['solo', 'wide', 'studio'] as LayoutPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setLayout(p)}
                className={`text-[10px] sm:text-xs px-3 py-1 rounded-md ${
                  layout === p ? 'bg-zinc-800' : 'hover:bg-zinc-800'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Stream profile */}
          <select
            className="bg-zinc-900 border border-zinc-700 rounded-md text-xs px-2 py-1 w-full sm:w-auto"
            value={profile}
            onChange={(e) => setProfile(e.target.value as Profile)}
            title="Capture profile"
          >
            <option value="mobile">MOBILE (480p30)</option>
            <option value="standard">STANDARD (720p30)</option>
            <option value="high">HIGH (1080p60)</option>
          </select>

          {/* ✅ Mobile device pickers (since desktop ones are hidden on small screens) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:hidden">
            <select
              className="bg-zinc-900 border border-zinc-700 rounded-md text-xs px-2 py-2 w-full min-w-0"
              value={camId ?? ''}
              onChange={(e) => setCamId(e.target.value || null)}
              title="Camera"
            >
              <option value="">Default Camera</option>
              {cams.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || 'Camera'}
                </option>
              ))}
            </select>

            <select
              className="bg-zinc-900 border border-zinc-700 rounded-md text-xs px-2 py-2 w-full min-w-0"
              value={micId ?? ''}
              onChange={(e) => setMicId(e.target.value || null)}
              title="Microphone"
            >
              <option value="">Default Mic</option>
              {mics.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || 'Microphone'}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop device pickers */}
          <div className="hidden md:flex items-center gap-2">
            <select
              className="bg-zinc-900 border border-zinc-700 rounded-md text-xs px-2 py-1"
              value={camId ?? ''}
              onChange={(e) => setCamId(e.target.value || null)}
              title="Camera"
            >
              <option value="">Default Camera</option>
              {cams.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || 'Camera'}
                </option>
              ))}
            </select>

            <select
              className="bg-zinc-900 border border-zinc-700 rounded-md text-xs px-2 py-1"
              value={micId ?? ''}
              onChange={(e) => setMicId(e.target.value || null)}
              title="Microphone"
            >
              <option value="">Default Mic</option>
              {mics.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || 'Microphone'}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              title="Hotkeys"
              className="text-zinc-400 hover:text-zinc-100"
              onClick={() => setHelpOpen(true)}
            >
              <FiHelpCircle />
            </button>

            <Pill
              tone={live ? 'rose' : 'emerald'}
              icon={live ? <FiStopCircle /> : <FiPlay />}
              onClick={onToggleGoLive}
            >
              {live ? 'End Stream' : 'Go Live'}
            </Pill>

            <Pill tone="zinc" icon={<FiPlay />} onClick={goLiveWithCountdown}>
              3-2-1
            </Pill>

            <Pill icon={<FiSliders />} tone="zinc">
              Settings
            </Pill>
          </div>
        </div>
      </div>

      {/* Desktop grid (fixed) */}
      <div className="hidden lg:grid grid-cols-12 gap-6 auto-rows-[minmax(0,1fr)] min-w-0">
        {/* LEFT column */}
        <div className="col-span-7 min-w-0 min-h-0 flex flex-col gap-6">
          {PreviewCard({
            live,
            micOn,
            camOn,
            toggleMic,
            toggleCam,
            takeScreenshot,
            isSharing,
            startScreenShare,
            stopScreenShare,
            pipOn,
            setPipOn,
            activeSource,
            setActiveSource,
            rebuildPreviewStream,
            scenes,
            scene,
            switchScene,
            fadeKey,
            transition,
            duration,
            setDuration,
            setTransition,
            videoRef,
            camPipRef,
            counting,
          })}

          <div className="grid grid-cols-5 gap-6 min-w-0">
            {StreamInfoCard(info, setInfo, 3)}
            {QuickActionsCard(2)}
          </div>
        </div>

        {/* RIGHT column */}
        <div className="col-span-5 min-w-0 min-h-0 flex flex-col gap-6">
          <div className="min-h-0">{ChatCard({ popoutChat })}</div>
          <div className="min-h-0">{GuestsCard()}</div>
          <div className="min-h-0">{AudioMixerCard(mixer, setMixer)}</div>
          <div className="min-h-0">{HealthCard(health)}</div>
        </div>
      </div>

      {/* Mobile stack */}
      <div className="lg:hidden space-y-4 min-w-0">
        {PreviewCard({
          live,
          micOn,
          camOn,
          toggleMic,
          toggleCam,
          takeScreenshot,
          isSharing,
          startScreenShare,
          stopScreenShare,
          pipOn,
          setPipOn,
          activeSource,
          setActiveSource,
          rebuildPreviewStream,
          scenes,
          scene,
          switchScene,
          fadeKey,
          transition,
          duration,
          setDuration,
          setTransition,
          videoRef,
          camPipRef,
          counting,
        })}
        {ChatCard({ popoutChat })}
        {GuestsCard()}
        {StreamInfoCard(info, setInfo, 1)}
        {AudioMixerCard(mixer, setMixer)}
        {HealthCard(health)}
      </div>

      {/* Hotkeys help */}
      {helpOpen && (
        <Modal title="Hotkeys" onClose={() => setHelpOpen(false)}>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-zinc-300">
            <li>
              <kbd className="px-2 py-1 bg-zinc-800 rounded">G</kbd> Toggle Go Live
            </li>
            <li>
              <kbd className="px-2 py-1 bg-zinc-800 rounded">M</kbd> Toggle Mic
            </li>
            <li>
              <kbd className="px-2 py-1 bg-zinc-800 rounded">V</kbd> Toggle Cam
            </li>
            <li>
              <kbd className="px-2 py-1 bg-zinc-800 rounded">S</kbd> Start/Stop Screen Share
            </li>
            <li>
              <kbd className="px-2 py-1 bg-zinc-800 rounded">P</kbd> Toggle PIP
            </li>
            <li>
              <kbd className="px-2 py-1 bg-zinc-800 rounded">1..4</kbd> Switch Scene
            </li>
            <li>
              <kbd className="px-2 py-1 bg-zinc-800 rounded">C</kbd> Cut
            </li>
            <li>
              <kbd className="px-2 py-1 bg-zinc-800 rounded">F</kbd> Fade
            </li>
            <li>
              <kbd className="px-2 py-1 bg-zinc-800 rounded">?</kbd> Toggle Help
            </li>
          </ul>
        </Modal>
      )}
    </main>
  );
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 6) FEATURE RENDERERS (pure functions, easy to move/split)                  │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

/* ──────────────────────── tiny UI atoms used by cards ───────────────────── */

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2 text-sm text-zinc-400 flex items-center gap-2">
      {icon} {children}
    </div>
  );
}

function Badge({ tone = 'zinc', children }: { tone?: 'zinc'|'emerald'|'amber'|'rose'; children: React.ReactNode }) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-800 text-zinc-200',
    emerald: 'bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-500/30',
    amber: 'bg-amber-600/20 text-amber-300 ring-1 ring-amber-500/30',
    rose: 'bg-rose-600/20 text-rose-300 ring-1 ring-rose-500/30',
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${map[tone]}`}>{children}</span>;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[11px]">{children}</kbd>;
}

function Meter({ value, className = '' }: { value: number; className?: string }) {
  // value: 0..100
  return (
    <div className={`h-2 rounded-full bg-zinc-800 overflow-hidden ${className}`}>
      <div
        className={`h-full ${value > 70 ? 'bg-emerald-500' : value > 40 ? 'bg-emerald-600/80' : 'bg-emerald-700/70'}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function SceneButton({
  active, label, onClick,
}: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative aspect-video rounded-md border text-[11px] sm:text-xs bg-zinc-950 hover:border-zinc-700
        ${active ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-zinc-800'}`}
      aria-pressed={active}
    >
      {/* fake thumbnail gridlines for a “preview” vibe */}
      <div className="absolute inset-0 opacity-[0.07] grid grid-cols-4 grid-rows-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="border border-zinc-100/20" />
        ))}
      </div>
      <div className="absolute inset-0 grid place-items-center text-zinc-500 px-1 text-center">{label}</div>
      {active && <FiCheck className="absolute top-1 right-1 text-emerald-400" />}
    </button>
  );
}

function SourceRow({
  icon, label, right, status,
}: {
  icon: React.ReactNode; label: string; right: React.ReactNode;
  status: 'active' | 'ready' | 'off';
}) {
  const badge =
    status === 'active' ? <Badge tone="emerald">Active</Badge> :
    status === 'ready'  ? <Badge tone="zinc">Ready</Badge> :
                          <Badge tone="rose">Off</Badge>;

  return (
    <li className="bg-zinc-950 border border-zinc-800 rounded-md px-2 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-zinc-300 inline-flex items-center gap-2 min-w-0">
          {icon}
          <span className="truncate">{label}</span>
        </span>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {badge}
          {right}
        </div>
      </div>
    </li>
  );
}

/* ───────────────────────────── Preview with sources ───────────────────────── */

function PreviewCard(opts: {
  live: boolean; micOn: boolean; camOn: boolean;
  toggleMic: () => void; toggleCam: () => void; takeScreenshot: () => void;

  isSharing: boolean; startScreenShare: () => void; stopScreenShare: () => void;
  pipOn: boolean; setPipOn: (v: boolean) => void;

  activeSource: SourceKind; setActiveSource: (s: SourceKind) => void;
  rebuildPreviewStream: (s: SourceKind) => void;

  scenes: string[]; scene: number; switchScene: (i:number)=>void;
  fadeKey: number; transition: TransitionType; duration: number;
  setDuration: (n: number) => void; setTransition: (t: TransitionType)=>void;

  videoRef: React.RefObject<HTMLVideoElement>;
  camPipRef: React.RefObject<HTMLVideoElement>;
  counting: number | null;
}) {
  const {
    live, micOn, camOn, toggleMic, toggleCam, takeScreenshot,
    isSharing, startScreenShare, stopScreenShare, pipOn, setPipOn,
    activeSource, setActiveSource, rebuildPreviewStream,
    scenes, scene, fadeKey, transition, duration, setDuration, setTransition,
    videoRef, camPipRef, counting
  } = opts;

  const switchTo = (s: SourceKind) => { setActiveSource(s); rebuildPreviewStream(s); };

  const TransitionControl = (
    <div className="flex flex-wrap items-center gap-2">
      <Chip color="zinc">Transition</Chip>
      <div className="inline-flex rounded-md overflow-hidden border border-zinc-700">
        <button
          className={`px-2 py-1 text-sm ${transition==='cut' ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
          onClick={() => setTransition('cut')}
        >
          Cut
        </button>
        <button
          className={`px-2 py-1 text-sm ${transition==='fade' ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
          onClick={() => setTransition('fade')}
        >
          Fade
        </button>
      </div>

      {transition==='fade' && (
        <select
          className="bg-zinc-900 border border-zinc-700 rounded-md text-sm px-2 py-1 w-full sm:w-auto"
          value={duration}
          onChange={(e)=>setDuration(parseInt(e.target.value,10))}
        >
          {[200,400,600,800].map(ms=> <option key={ms} value={ms}>{ms}ms</option>)}
        </select>
      )}
    </div>
  );

  return (
    <Card
      title="Stream Preview"
      icon={<FiVideo className="text-emerald-400" />}
      right={
        // Hide header-right controls on phones to avoid header overflow
        <div className="hidden sm:flex flex-wrap items-center gap-2 justify-end">
          <Pill tone="zinc" icon={<FiImage />} onClick={takeScreenshot}>Screenshot</Pill>
          {TransitionControl}
        </div>
      }
      bodyClass="pb-3"
    >
      {/* Mobile controls row (prevents header overflow on small screens) */}
      <div className="sm:hidden mb-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="zinc" icon={<FiImage />} onClick={takeScreenshot}>Screenshot</Pill>
        </div>
        {TransitionControl}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
        {/* Preview video */}
        <div className="lg:col-span-8 min-w-0">
          <div className="relative w-full aspect-video bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />

            {live && isSharing && (
              <video
                ref={camPipRef}
                autoPlay muted playsInline
                className={`absolute bottom-3 right-3 w-32 h-20 sm:w-48 sm:h-28 rounded-md border border-zinc-800 bg-black object-cover transition ${pipOn ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              />
            )}

            {/* Overlay / fade */}
            <div
              key={transition==='fade' ? fadeKey : scene}
              className={`absolute inset-0 grid place-items-center text-zinc-400 text-sm ${transition==='fade' ? 'opacity-0 animate-[fadeIn_var(--dur)_ease]' : ''}`}
              style={{ ['--dur' as any]: `${duration}ms` }}
            >
              {!live && 'Camera/Screen will show here'}
              {counting !== null && (
                <div className="text-5xl sm:text-6xl font-bold text-white bg-black/40 px-6 py-3 rounded-xl">
                  {counting}
                </div>
              )}
            </div>
            <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

            {live && <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded bg-rose-600">LIVE</span>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill tone="zinc" icon={<FiCopy />}>Copy Stream Key</Pill>
            <Pill tone="zinc" icon={<FiLink />}>Ingest URL</Pill>
            <Pill tone="zinc" icon={<FiBell />}>Alerts</Pill>

            <Pill tone="zinc" icon={micOn ? <FiMic /> : <FiMicOff />} onClick={toggleMic}>
              {micOn ? <>Mic On <span className="ml-1 opacity-70"><Kbd>M</Kbd></span></> : <>Mic Off <span className="ml-1 opacity-70"><Kbd>M</Kbd></span></>}
            </Pill>

            <Pill tone="zinc" icon={camOn ? <FiCamera /> : <FiCameraOff />} onClick={toggleCam}>
              {camOn ? <>Cam On <span className="ml-1 opacity-70"><Kbd>V</Kbd></span></> : <>Cam Off <span className="ml-1 opacity-70"><Kbd>V</Kbd></span></>}
            </Pill>
          </div>
        </div>

        {/* Scenes & Sources */}
        <div className="lg:col-span-4 min-w-0">
          <SectionTitle icon={<FiFilm />}>Scenes</SectionTitle>

          {/* 2 cols on phones, 3 on small+ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {scenes.map((label, i) => (
              <SceneButton key={i} label={label} active={scene === i} onClick={() => opts.switchScene(i)} />
            ))}
          </div>

          <SectionTitle icon={<FiSettings className="mt-4" />}>Sources</SectionTitle>
          <ul className="mt-2 space-y-2 text-sm">
            <SourceRow
              icon={<FiCamera />}
              label="Camera"
              status={activeSource === 'camera' && live ? 'active' : camOn ? 'ready' : 'off'}
              right={
                <div className="flex flex-wrap items-center gap-2">
                  <button className="text-xs text-zinc-400 hover:text-zinc-200" onClick={() => switchTo('camera')}>Use</button>
                  <button className="text-xs text-zinc-400 hover:text-zinc-200" onClick={toggleCam}>{camOn ? 'Disable' : 'Enable'}</button>
                </div>
              }
            />

            <SourceRow
              icon={<FiMonitor />}
              label="Screen"
              status={activeSource === 'screen' && live ? 'active' : isSharing ? 'ready' : 'off'}
              right={
                <div className="flex flex-wrap items-center gap-2">
                  {!isSharing ? (
                    <button className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1" onClick={startScreenShare}>
                      <FiSquare /> Start
                    </button>
                  ) : (
                    <>
                      <button className="text-xs text-zinc-400 hover:text-zinc-200" onClick={() => switchTo('screen')}>Use</button>
                      <button className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1" onClick={stopScreenShare}>
                        <FiStopCircle /> Stop
                      </button>
                    </>
                  )}
                </div>
              }
            />

            {isSharing && (
              <SourceRow
                icon={<FiLayers />}
                label="Camera PIP"
                status={pipOn ? 'ready' : 'off'}
                right={
                  <button className="text-xs text-zinc-400 hover:text-zinc-200" onClick={() => setPipOn(!pipOn)}>
                    {pipOn ? 'Hide' : 'Show'}
                  </button>
                }
              />
            )}

            <li className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-md px-2 py-2">
              <span className="text-zinc-300">Active source</span>
              <Chip color="emerald">{activeSource.toUpperCase()}</Chip>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

/* ───────────────────────────── Stream Info ─────────────────────────────── */

const COL_SPAN_MAP: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
};

function StreamInfoCard(info: any, setInfo: (v:any)=>void, colSpan = 3) {
  const spanClass = COL_SPAN_MAP[colSpan] ?? 'col-span-3';

  return (
    <Card title="Stream Info" icon={<FiSettings className="text-emerald-400" />} className={spanClass}>
      <div className="space-y-3">
        <LabeledInput
          label="Title"
          placeholder="What are we streaming today?"
          value={info.title}
          onChange={(v)=>setInfo({ ...info, title: v })}
        />

        {/* 1 col on phones, 2 on small+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledInput
            label="Category"
            placeholder="Game / IRL / Music"
            value={info.category}
            onChange={(v)=>setInfo({ ...info, category: v })}
          />
          <LabeledInput
            label="Tags"
            placeholder="chill, talk-show"
            value={info.tags}
            onChange={(v)=>setInfo({ ...info, tags: v })}
          />
        </div>
      </div>
    </Card>
  );
}

/* ───────────────────────────── Quick Actions ───────────────────────────── */

function QuickActionsCard(colSpan = 2) {
  const spanClass = COL_SPAN_MAP[colSpan] ?? 'col-span-2';

  return (
    <Card title="Quick Actions" icon={<FiActivity className="text-emerald-400" />} className={spanClass}>
      <div className="grid grid-cols-2 gap-2">
        <ActionTile color="from-fuchsia-600 to-fuchsia-500">Raid Channel</ActionTile>
        <ActionTile color="from-emerald-600 to-emerald-500">Manage Goals</ActionTile>
        <ActionTile color="from-zinc-800 to-zinc-700" text="zinc">Stream Together</ActionTile>
        <ActionTile color="from-zinc-800 to-zinc-700" text="zinc">Create Marker</ActionTile>
      </div>
    </Card>
  );
}

/* ───────────────────────────────── Chat ────────────────────────────────── */

function ChatCard({ popoutChat }: { popoutChat: () => void }) {
  return (
    <Card
      title="My Chat"
      icon={<FiActivity className="rotate-90 text-emerald-400" />}
      right={
        // Avoid header crunch on extra-small widths
        <div className="hidden sm:block">
          <Pill tone="zinc" icon={<FiExternalLink />} onClick={popoutChat}>Popout</Pill>
        </div>
      }
      className="h-[48vh]"
      bodyClass="h-full flex flex-col"
    >
      {/* Mobile popout button inside body */}
      <div className="sm:hidden mb-3">
        <Pill tone="zinc" icon={<FiExternalLink />} onClick={popoutChat}>Popout</Pill>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1" aria-live="polite" aria-label="Chat log">
        {[...Array(40)].map((_, i) => (
          <div key={i} className="text-sm text-zinc-300">
            <span className="text-emerald-400">@viewer{i}</span>: message #{i}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          aria-label="Message input"
          className="flex-1 rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600"
          placeholder="Send a message"
        />
        <button
          aria-label="Send message"
          className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-4 py-2"
        >
          Chat
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <span>Moderation:</span>
        <button className="hover:text-zinc-200">Clear</button>
        <button className="hover:text-zinc-200">Slow</button>
        <button className="hover:text-zinc-200">Sub-only</button>
      </div>
    </Card>
  );
}

/* ───────────────────────────── Guests / Collab ─────────────────────────── */

function GuestsCard() {
  return (
    <Card
      title="Collaboration"
      icon={<FiUsers className="text-emerald-400" />}
      right={
        <div className="hidden sm:block">
          <Pill tone="emerald" icon={<FiPlus />}>Invite</Pill>
        </div>
      }
    >
      {/* Mobile invite button inside body */}
      <div className="sm:hidden mb-3">
        <Pill tone="emerald" icon={<FiPlus />}>Invite</Pill>
      </div>

      {/* 1 col on phones, 2 on small+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="relative aspect-video rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="absolute inset-0 grid place-items-center text-zinc-600">Guest {i+1}</div>
            <div className="absolute bottom-2 left-2 flex gap-2">
              <button className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100"><FiMic /></button>
              <button className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100"><FiCamera /></button>
            </div>
          </div>
        ))}
      </div>

      {/* 1 col on phones, 2 on small+ */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-sm text-zinc-400 mb-2">Favorites</div>
          <div className="text-zinc-500 text-sm">You haven&apos;t added any collaborators yet.</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-sm text-zinc-400 mb-2">Permissions</div>
          <ul className="text-sm space-y-1 text-zinc-300 list-disc pl-5">
            <li>Moderate chat</li>
            <li>Manage overlays</li>
            <li>Invite other guests</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

/* ───────────────────────────── Audio Mixer ─────────────────────────────── */

function AudioMixerCard(mixer: MixerState, setMixer: (v: MixerState)=>void) {
  const Row = ({ id, label, icon }: { id: keyof MixerState; label: string; icon: React.ReactNode; }) => {
    const { vol, mute } = mixer[id];
    const setVol  = (n: number) => setMixer({ ...mixer, [id]: { vol: n, mute } });
    const setMute = (m: boolean) => setMixer({ ...mixer, [id]: { vol, mute: m } });

    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="text-sm text-zinc-300 inline-flex items-center gap-2 sm:w-32 w-full">
          {icon}{label}
        </span>

        <Meter value={mute ? 0 : vol} className="w-full sm:w-28" />

        <input
          aria-label={`${label} volume`}
          type="range" min={0} max={100} value={vol}
          onChange={(e)=>setVol(parseInt(e.target.value,10))}
          className="w-full sm:flex-1 accent-emerald-500"
        />

        <button
          onClick={()=>setMute(!mute)}
          className="w-10 h-10 rounded-md bg-zinc-800 hover:bg-zinc-700 grid place-items-center self-end sm:self-auto"
          aria-label={`${mute ? 'Unmute' : 'Mute'} ${label}`}
          title={mute ? 'Unmute' : 'Mute'}
        >
          {mute ? <FiVolumeX /> : <FiVolume2 />}
        </button>
      </div>
    );
  };

  return (
    <Card title="Audio Mixer" icon={<FiSliders className="text-emerald-400" />}>
      <div className="space-y-4">
        <Row id="mic"    label="Microphone" icon={<FiMic />} />
        <Row id="system" label="System"     icon={<FiMonitor />} />
        <Row id="music"  label="Music"      icon={<FiActivity />} />
        <Row id="guests" label="Guests"     icon={<FiUsers />} />
      </div>
    </Card>
  );
}

/* ───────────────────────────── Stream Health ───────────────────────────── */

function HealthCard(h: {bitrate:number; fps:number; cpu:number; drops:number;}) {
  const quality =
    h.bitrate >= 6000 ? { tone: 'emerald', label: 'Good' } :
    h.bitrate >= 3500 ? { tone: 'amber',   label: 'Fair' } :
                        { tone: 'rose',    label: 'Poor' };

  // naive latency estimate for preview (UI only)
  const latencyMs = Math.max(80, 2500 - Math.min(2000, h.bitrate / 4));

  const Bar = ({ v, max }: { v: number; max: number }) => (
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, (v/max)*100)}%` }} />
    </div>
  );

  return (
    <Card title="Stream Health" icon={<FiCpu className="text-emerald-400" />}>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-zinc-400">Bitrate</span>
          <span className="text-zinc-200 flex flex-wrap items-center gap-2 justify-end">
            {h.bitrate} kbps <Badge tone={quality.tone as any}>{quality.label}</Badge>
          </span>
        </div>
        <Bar v={h.bitrate} max={8000} />

        <div className="flex items-center justify-between"><span className="text-zinc-400">FPS</span><span className="text-zinc-200">{h.fps}</span></div>
        <Bar v={h.fps} max={60} />

        <div className="flex items-center justify-between"><span className="text-zinc-400">CPU</span><span className="text-zinc-200">{h.cpu}%</span></div>
        <Bar v={h.cpu} max={100} />

        <div className="flex items-center justify-between"><span className="text-zinc-400">Dropped Frames</span><span className="text-zinc-200">{h.drops}</span></div>
        <div className="flex items-center justify-between"><span className="text-zinc-400">Preview Latency</span><span className="text-zinc-200">{Math.round(latencyMs)} ms</span></div>
      </div>
    </Card>
  );
}
