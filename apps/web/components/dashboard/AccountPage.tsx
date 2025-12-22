// apps/web/components/dashboard/AccountPage.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  FiAlertTriangle,
  FiBell,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiCopy,
  FiDownload,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiGlobe,
  FiKey,
  FiLink,
  FiLock,
  FiLogOut,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiSave,
  FiShield,
  FiSmartphone,
  FiTrash2,
  FiUpload,
  FiUser,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 1) TYPES                                                                    │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
type SecurityLevel = 'low' | 'med' | 'high';

type SessionDevice = {
  id: string;
  label: string;
  location: string;
  lastActiveLabel: string;
  risk: SecurityLevel;
  current?: boolean;
};

type ConnectedApp = {
  id: string;
  name: string;
  scopes: string[];
  createdLabel: string;
  lastUsedLabel: string;
  risk: SecurityLevel;
};

type NotificationPrefs = {
  productUpdates: boolean;
  securityAlerts: boolean;
  payouts: boolean;
  followerMilestones: boolean;
  modActions: boolean;
};

type PrivacyPrefs = {
  showEmailToMods: boolean;
  allowDMsFromFollowers: boolean;
  showOnlineStatus: boolean;
  publicProfile: boolean;
};

type ProfileForm = {
  displayName: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  timezone: string;
  website: string;
  bio: string;
};

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 2) SMALL UI PRIMITIVES (drop-in, consistent style)                          │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
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
    <section className={`rounded-xl border border-zinc-800 bg-zinc-950 ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-zinc-200">
          {icon}
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
        {right}
      </header>
      <div className={`px-4 py-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

function Chip({
  children,
  tone = 'zinc',
  className = '',
}: {
  children: React.ReactNode;
  tone?: 'zinc' | 'emerald' | 'amber' | 'rose' | 'sky';
  className?: string;
}) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-800 text-zinc-200 ring-zinc-700',
    emerald: 'bg-emerald-600/20 text-emerald-300 ring-emerald-600/30',
    amber: 'bg-amber-600/20 text-amber-300 ring-amber-600/30',
    rose: 'bg-rose-600/20 text-rose-300 ring-rose-600/30',
    sky: 'bg-sky-600/20 text-sky-300 ring-sky-600/30',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${map[tone]} ${className}`}>
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
  tone?: 'zinc' | 'emerald' | 'rose' | 'sky';
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white',
    rose: 'bg-rose-600 hover:bg-rose-500 border-rose-600 text-white',
    sky: 'bg-sky-600 hover:bg-sky-500 border-sky-600 text-white',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${map[tone]} ${className}`}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
  tone = 'emerald',
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  tone?: 'emerald' | 'sky' | 'rose';
}) {
  const on = value;
  const knob = on ? 'translate-x-5' : 'translate-x-0';
  const track = on
    ? tone === 'emerald'
      ? 'bg-emerald-600/70'
      : tone === 'sky'
      ? 'bg-sky-600/70'
      : 'bg-rose-600/70'
    : 'bg-zinc-800';
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-zinc-400">{description}</p> : null}
      </div>
      <button
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${track}`}
      >
        <span className={`absolute left-0 top-0 m-0.5 h-5 w-5 rounded-full bg-white transition ${knob}`} />
      </button>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  right,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  right?: React.ReactNode;
  hint?: string;
}) {
  const id = useMemo(() => `in-${Math.random().toString(36).slice(2, 10)}`, []);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-xs font-medium text-zinc-400">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 pr-10 text-sm text-zinc-100 outline-none focus:border-emerald-600"
        />
        {right ? <div className="absolute inset-y-0 right-2 flex items-center">{right}</div> : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function DividerLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-zinc-800" />
      <span className="text-xs text-zinc-500">{children}</span>
      <div className="h-px flex-1 bg-zinc-800" />
    </div>
  );
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 3) MOCK DATA (swap for API later)                                           │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function riskToChip(risk: SecurityLevel) {
  if (risk === 'high') return <Chip tone="rose">High risk</Chip>;
  if (risk === 'med') return <Chip tone="amber">Medium</Chip>;
  return <Chip tone="emerald">Low</Chip>;
}

const seedDevices: SessionDevice[] = [
  { id: 'd1', label: 'Chrome on Windows', location: 'Washington, DC', lastActiveLabel: 'Active now', risk: 'low', current: true },
  { id: 'd2', label: 'iPhone • Safari', location: 'Arlington, VA', lastActiveLabel: '2h ago', risk: 'med' },
  { id: 'd3', label: 'Unknown device', location: 'Unknown', lastActiveLabel: '6d ago', risk: 'high' },
];

const seedApps: ConnectedApp[] = [
  { id: 'a1', name: 'OBS Overlay Bridge', scopes: ['overlay', 'events'], createdLabel: 'Installed 3w ago', lastUsedLabel: 'Today', risk: 'med' },
  { id: 'a2', name: 'Guardian Mod', scopes: ['chat:read', 'chat:moderate'], createdLabel: 'Installed 2d ago', lastUsedLabel: '1h ago', risk: 'high' },
  { id: 'a3', name: 'Now Playing', scopes: ['music', 'overlay'], createdLabel: 'Installed 2m ago', lastUsedLabel: 'Yesterday', risk: 'low' },
];

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 4) PAGE                                                                     │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
export default function AccountPage() {
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  // Load minimal identity (swap to your profiles table later)
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(true);

  // Profile form
  const [profile, setProfile] = useState<ProfileForm>({
    displayName: 'Creator',
    username: 'creator',
    email: '',
    phone: '',
    country: 'United States',
    timezone: 'America/New_York',
    website: '',
    bio: 'Building something awesome on WeGoLive.',
  });

  // UX state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: 'ok' | 'warn' | 'bad'; msg: string } | null>(null);

  // Security state
  const [twoFA, setTwoFA] = useState(false);
  const [devices, setDevices] = useState<SessionDevice[]>(seedDevices);
  const [apps, setApps] = useState<ConnectedApp[]>(seedApps);

  // Preferences
  const [notif, setNotif] = useState<NotificationPrefs>({
    productUpdates: true,
    securityAlerts: true,
    payouts: true,
    followerMilestones: true,
    modActions: true,
  });

  const [privacy, setPrivacy] = useState<PrivacyPrefs>({
    showEmailToMods: false,
    allowDMsFromFollowers: true,
    showOnlineStatus: true,
    publicProfile: true,
  });

  // Password inputs (demo UI)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwVisible, setPwVisible] = useState({ current: false, next: false, confirm: false });

  // Danger zone confirmations
  const [confirmText, setConfirmText] = useState('');
  const confirmMatches = confirmText.trim().toLowerCase() === 'delete';

  // “Security score” (mock, deterministic)
  const securityScore = useMemo(() => {
    let score = 55;
    if (twoFA) score += 20;
    if (notif.securityAlerts) score += 5;
    const riskyDevice = devices.some((d) => d.risk === 'high');
    const riskyApps = apps.some((a) => a.risk === 'high');
    if (!riskyDevice) score += 10;
    if (!riskyApps) score += 10;
    if (privacy.publicProfile) score -= 3;
    return Math.max(0, Math.min(100, score));
  }, [twoFA, notif.securityAlerts, devices, apps, privacy.publicProfile]);

  const scoreLabel = securityScore >= 85 ? 'Excellent' : securityScore >= 70 ? 'Good' : securityScore >= 55 ? 'Fair' : 'At risk';
  const scoreTone = securityScore >= 85 ? 'emerald' : securityScore >= 70 ? 'sky' : securityScore >= 55 ? 'amber' : 'rose';

  // Load supabase user/session
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const id = data.session?.user?.id ?? null;
        if (!mounted) return;

        setUserId(id);
        setProfile((p) => ({
          ...p,
          email: data.session?.user?.email ?? p.email,
          username: (data.session?.user?.user_metadata as any)?.username ?? p.username,
          displayName: (data.session?.user?.user_metadata as any)?.display_name ?? p.displayName,
        }));
      } finally {
        if (mounted) setLoadingIdentity(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Clear toasts on nav
  useEffect(() => {
    setToast(null);
  }, [pathname]);

  const showToast = (tone: 'ok' | 'warn' | 'bad', msg: string) => {
    setToast({ tone, msg });
    window.setTimeout(() => setToast(null), 2600);
  };

  const onSaveProfile = async () => {
    setSaving(true);
    try {
      // This is a demo save. Replace with your real DB write.
      // If you want, you can also update Supabase auth metadata:
      // await supabase.auth.updateUser({ data: { username: profile.username, display_name: profile.displayName } })

      await new Promise((r) => setTimeout(r, 500));
      showToast('ok', 'Account saved');
    } catch {
      showToast('bad', 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('ok', 'Copied');
    } catch {
      showToast('warn', 'Copy failed');
    }
  };

  const revokeApp = (id: string) => {
    setApps((prev) => prev.filter((a) => a.id !== id));
    showToast('ok', 'Access revoked');
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      showToast('ok', 'Signed out');
    } catch {
      showToast('bad', 'Sign out failed');
    }
  };

  const terminateDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    showToast('ok', 'Session ended');
  };

  const terminateAllOther = () => {
    setDevices((prev) => prev.filter((d) => d.current));
    showToast('ok', 'Ended other sessions');
  };

  const onChangePassword = async () => {
    if (pw.next.length < 8) return showToast('warn', 'Password must be at least 8 characters');
    if (pw.next !== pw.confirm) return showToast('warn', 'Passwords do not match');
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 650));
      setPw({ current: '', next: '', confirm: '' });
      showToast('ok', 'Password updated');
    } catch {
      showToast('bad', 'Password update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0">
      {/* Toast */}
      {toast ? (
        <div className="fixed left-1/2 top-4 z-[80] w-[92%] max-w-md -translate-x-1/2">
          <div
            className={`rounded-xl border px-4 py-3 text-sm backdrop-blur ${
              toast.tone === 'ok'
                ? 'border-emerald-700 bg-emerald-950/60 text-emerald-200'
                : toast.tone === 'warn'
                ? 'border-amber-700 bg-amber-950/60 text-amber-200'
                : 'border-rose-700 bg-rose-950/60 text-rose-200'
            }`}
          >
            {toast.msg}
          </div>
        </div>
      ) : null}

      <main className="w-full min-w-0 max-w-none overflow-x-hidden bg-black text-white">
        <div className="w-full min-w-0 px-2 py-4 sm:px-4 sm:py-6">
          {/* Header */}
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FiUser className="text-emerald-400" />
                <h1 className="truncate text-lg font-bold text-zinc-100 sm:text-xl">Account</h1>
                {loadingIdentity ? <Chip tone="zinc">Loading…</Chip> : <Chip tone="sky">Connected</Chip>}
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Profile, security, privacy, sessions, and connected apps — all in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button tone="zinc" icon={<FiCopy />} onClick={() => onCopy(userId ?? 'guest')}>
                Copy User ID
              </Button>
              <Button tone="zinc" icon={<FiLogOut />} onClick={signOut}>
                Sign out
              </Button>
            </div>
          </div>

          {/* Top grid */}
          <div className="grid min-w-0 grid-cols-12 gap-4">
            {/* LEFT: Profile */}
            <div className="col-span-12 min-w-0 xl:col-span-7">
              <Card
                title="Profile"
                icon={<FiEdit3 className="text-emerald-400" />}
                right={
                  <div className="flex items-center gap-2">
                    <Chip tone="zinc">Public handle: @{profile.username}</Chip>
                    <Button tone="emerald" icon={<FiSave />} onClick={onSaveProfile} disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                }
              >
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <LabeledInput
                    label="Display name"
                    value={profile.displayName}
                    onChange={(v) => setProfile((p) => ({ ...p, displayName: v }))}
                    placeholder="Your creator name"
                    right={<FiUser className="text-zinc-500" />}
                  />
                  <LabeledInput
                    label="Username"
                    value={profile.username}
                    onChange={(v) => setProfile((p) => ({ ...p, username: v.replace(/\s+/g, '').toLowerCase() }))}
                    placeholder="creator"
                    hint="Lowercase, no spaces."
                    right={<span className="text-xs text-zinc-500">@</span>}
                  />
                  <LabeledInput
                    label="Email"
                    value={profile.email}
                    onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
                    placeholder="you@email.com"
                    type="email"
                    right={<FiMail className="text-zinc-500" />}
                  />
                  <LabeledInput
                    label="Phone"
                    value={profile.phone}
                    onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
                    placeholder="+1 (___) ___-____"
                    type="tel"
                    right={<FiPhone className="text-zinc-500" />}
                  />
                  <LabeledInput
                    label="Country"
                    value={profile.country}
                    onChange={(v) => setProfile((p) => ({ ...p, country: v }))}
                    placeholder="United States"
                    right={<FiMapPin className="text-zinc-500" />}
                  />
                  <LabeledInput
                    label="Timezone"
                    value={profile.timezone}
                    onChange={(v) => setProfile((p) => ({ ...p, timezone: v }))}
                    placeholder="America/New_York"
                    right={<FiClock className="text-zinc-500" />}
                  />
                  <div className="sm:col-span-2">
                    <LabeledInput
                      label="Website"
                      value={profile.website}
                      onChange={(v) => setProfile((p) => ({ ...p, website: v }))}
                      placeholder="https://…"
                      right={<FiGlobe className="text-zinc-500" />}
                      hint="Shown on your public profile (if enabled)."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-400">Bio</label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                      className="mt-1 w-full min-w-0 resize-none rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600"
                      rows={4}
                      placeholder="Tell people what your channel is about…"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Tip: Add your schedule + what viewers can expect.
                    </p>
                  </div>
                </div>

                <DividerLabel>Identity & verification</DividerLabel>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-sm font-medium text-zinc-200">Creator verification</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Optional: verify identity for payouts, brand deals, and higher trust.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button tone="zinc" icon={<FiUpload />}>
                        Upload ID (demo)
                      </Button>
                      <Button tone="zinc" icon={<FiDownload />}>
                        Export profile (demo)
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-sm font-medium text-zinc-200">Shareable profile link</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Your public profile URL and deep-links.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-xs text-zinc-300">
                        <FiLink className="text-zinc-500" />
                        <span className="truncate">wegolive.today/@{profile.username}</span>
                      </div>
                      <Button tone="zinc" icon={<FiCopy />} onClick={() => onCopy(`wegolive.today/@${profile.username}`)}>
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* RIGHT: Security / Preferences */}
            <div className="col-span-12 min-w-0 xl:col-span-5">
              <div className="space-y-4">
                <Card
                  title="Security health"
                  icon={<FiShield className="text-emerald-400" />}
                  right={<Chip tone={scoreTone as any}>{scoreLabel} • {securityScore}/100</Chip>}
                >
                  <div className="space-y-3">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200">Two-factor authentication</p>
                          <p className="mt-0.5 text-xs text-zinc-400">
                            Protect logins and reduce account takeover risk.
                          </p>
                        </div>
                        <Button
                          tone={twoFA ? 'zinc' : 'emerald'}
                          icon={twoFA ? <FiCheck /> : <FiKey />}
                          onClick={() => setTwoFA((v) => !v)}
                        >
                          {twoFA ? 'Enabled' : 'Enable'}
                        </Button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                        <div className="rounded-md border border-zinc-800 bg-black/30 p-2">
                          <div className="flex items-center gap-2 text-zinc-300">
                            <FiSmartphone className="text-zinc-400" /> Authenticator
                          </div>
                          <p className="mt-1">TOTP / Passkeys ready (wire later)</p>
                        </div>
                        <div className="rounded-md border border-zinc-800 bg-black/30 p-2">
                          <div className="flex items-center gap-2 text-zinc-300">
                            <FiMail className="text-zinc-400" /> Recovery
                          </div>
                          <p className="mt-1">Backup codes + email recovery</p>
                        </div>
                      </div>
                    </div>

                    <DividerLabel>Password</DividerLabel>

                    <div className="grid grid-cols-1 gap-3">
                      <LabeledInput
                        label="Current password"
                        value={pw.current}
                        onChange={(v) => setPw((p) => ({ ...p, current: v }))}
                        type={pwVisible.current ? 'text' : 'password'}
                        right={
                          <button
                            aria-label="Toggle password visibility"
                            onClick={() => setPwVisible((p) => ({ ...p, current: !p.current }))}
                            className="text-zinc-500 hover:text-zinc-200"
                          >
                            {pwVisible.current ? <FiEyeOff /> : <FiEye />}
                          </button>
                        }
                      />
                      <LabeledInput
                        label="New password"
                        value={pw.next}
                        onChange={(v) => setPw((p) => ({ ...p, next: v }))}
                        type={pwVisible.next ? 'text' : 'password'}
                        hint="Use 12+ characters, include a phrase, avoid reuse."
                        right={
                          <button
                            aria-label="Toggle password visibility"
                            onClick={() => setPwVisible((p) => ({ ...p, next: !p.next }))}
                            className="text-zinc-500 hover:text-zinc-200"
                          >
                            {pwVisible.next ? <FiEyeOff /> : <FiEye />}
                          </button>
                        }
                      />
                      <LabeledInput
                        label="Confirm password"
                        value={pw.confirm}
                        onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
                        type={pwVisible.confirm ? 'text' : 'password'}
                        right={
                          <button
                            aria-label="Toggle password visibility"
                            onClick={() => setPwVisible((p) => ({ ...p, confirm: !p.confirm }))}
                            className="text-zinc-500 hover:text-zinc-200"
                          >
                            {pwVisible.confirm ? <FiEyeOff /> : <FiEye />}
                          </button>
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button tone="emerald" icon={<FiLock />} onClick={onChangePassword} disabled={saving}>
                          Update password
                        </Button>
                        <Button tone="zinc" icon={<FiRefreshCw />} onClick={() => setPw({ current: '', next: '', confirm: '' })}>
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Notifications" icon={<FiBell className="text-emerald-400" />}>
                  <div className="grid grid-cols-1 gap-2">
                    <Toggle
                      label="Security alerts"
                      description="Login attempts, new devices, risky app access."
                      value={notif.securityAlerts}
                      onChange={(v) => setNotif((n) => ({ ...n, securityAlerts: v }))}
                      tone="rose"
                    />
                    <Toggle
                      label="Payouts & invoices"
                      description="Revenue payouts, chargebacks, invoice notices."
                      value={notif.payouts}
                      onChange={(v) => setNotif((n) => ({ ...n, payouts: v }))}
                      tone="emerald"
                    />
                    <Toggle
                      label="Follower milestones"
                      description="New followers, streaks, milestone nudges."
                      value={notif.followerMilestones}
                      onChange={(v) => setNotif((n) => ({ ...n, followerMilestones: v }))}
                      tone="sky"
                    />
                    <Toggle
                      label="Mod actions"
                      description="Timeouts, bans, escalations from your mod team."
                      value={notif.modActions}
                      onChange={(v) => setNotif((n) => ({ ...n, modActions: v }))}
                      tone="sky"
                    />
                    <Toggle
                      label="Product updates"
                      description="New features, beta invites, release notes."
                      value={notif.productUpdates}
                      onChange={(v) => setNotif((n) => ({ ...n, productUpdates: v }))}
                      tone="emerald"
                    />
                  </div>
                </Card>

                <Card title="Privacy" icon={<FiUsers className="text-emerald-400" />}>
                  <div className="grid grid-cols-1 gap-2">
                    <Toggle
                      label="Public profile"
                      description="Allow your profile to be discoverable."
                      value={privacy.publicProfile}
                      onChange={(v) => setPrivacy((p) => ({ ...p, publicProfile: v }))}
                      tone="emerald"
                    />
                    <Toggle
                      label="Show online status"
                      description="Let followers see when you’re live/online."
                      value={privacy.showOnlineStatus}
                      onChange={(v) => setPrivacy((p) => ({ ...p, showOnlineStatus: v }))}
                      tone="sky"
                    />
                    <Toggle
                      label="Allow DMs from followers"
                      description="DMs are rate-limited and filtered."
                      value={privacy.allowDMsFromFollowers}
                      onChange={(v) => setPrivacy((p) => ({ ...p, allowDMsFromFollowers: v }))}
                      tone="emerald"
                    />
                    <Toggle
                      label="Show email to moderators"
                      description="Recommended OFF unless you run a business team."
                      value={privacy.showEmailToMods}
                      onChange={(v) => setPrivacy((p) => ({ ...p, showEmailToMods: v }))}
                      tone="rose"
                    />
                  </div>

                  <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-start gap-2">
                      <FiZap className="mt-0.5 text-emerald-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200">Smart privacy defaults</p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          WeGoLive can auto-tighten privacy when you enable “Safety Mode” (coming soon).
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Sessions + Apps */}
          <div className="mt-4 grid min-w-0 grid-cols-12 gap-4">
            <div className="col-span-12 min-w-0 xl:col-span-7">
              <Card
                title="Active sessions"
                icon={<FiSmartphone className="text-emerald-400" />}
                right={
                  <Button tone="zinc" icon={<FiX />} onClick={terminateAllOther}>
                    End other sessions
                  </Button>
                }
              >
                <div className="space-y-2">
                  {devices.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-zinc-200">{d.label}</p>
                          {d.current ? <Chip tone="sky">Current</Chip> : null}
                          {riskToChip(d.risk)}
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {d.location} • {d.lastActiveLabel}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button tone="zinc" icon={<FiChevronRight />}>
                          Details
                        </Button>
                        {!d.current ? (
                          <Button tone="rose" icon={<FiX />} onClick={() => terminateDevice(d.id)}>
                            End
                          </Button>
                        ) : (
                          <Button tone="zinc" icon={<FiCheck />} disabled>
                            Active
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {devices.some((d) => d.risk === 'high') ? (
                    <div className="mt-2 rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-sm text-rose-200">
                      <div className="flex items-start gap-2">
                        <FiAlertTriangle className="mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-medium">High-risk session detected</p>
                          <p className="mt-0.5 text-xs text-rose-200/80">
                            End unknown sessions, then enable 2FA and change your password.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>

            <div className="col-span-12 min-w-0 xl:col-span-5">
              <Card title="Connected apps" icon={<FiKey className="text-emerald-400" />}>
                <div className="space-y-2">
                  {apps.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-zinc-200">{a.name}</p>
                            {riskToChip(a.risk)}
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-400">
                            {a.createdLabel} • Last used {a.lastUsedLabel}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {a.scopes.map((s) => (
                              <Chip key={s} tone="zinc">
                                {s}
                              </Chip>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button tone="zinc" icon={<FiChevronRight />}>
                            Review
                          </Button>
                          <Button tone="rose" icon={<FiTrash2 />} onClick={() => revokeApp(a.id)}>
                            Revoke
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-sm font-medium text-zinc-200">Developer tokens (demo)</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      For your Creator Store apps, scoped tokens keep permissions safe.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button tone="zinc" icon={<FiRefreshCw />}>
                        Rotate token
                      </Button>
                      <Button tone="zinc" icon={<FiCopy />} onClick={() => onCopy('wglt_demo_token_********')}>
                        Copy token
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Danger zone */}
          <div className="mt-4">
            <Card
              title="Danger zone"
              icon={<FiAlertTriangle className="text-rose-400" />}
              className="border-rose-900/60"
            >
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-sm font-medium text-zinc-200">Delete account</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    This is permanent. All channel data, payouts history, and settings will be removed (demo UI).
                  </p>
                  <div className="mt-3 space-y-2">
                    <LabeledInput
                      label='Type "delete" to confirm'
                      value={confirmText}
                      onChange={setConfirmText}
                      placeholder="delete"
                      right={confirmMatches ? <FiCheck className="text-emerald-400" /> : <FiX className="text-zinc-500" />}
                    />
                    <Button
                      tone="rose"
                      icon={<FiTrash2 />}
                      disabled={!confirmMatches}
                      onClick={() => showToast('warn', 'Demo only — wire to backend later')}
                      className="w-full"
                    >
                      Delete my account
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-sm font-medium text-zinc-200">Export my data</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Download a portable snapshot of your profile and settings (demo UI).
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button tone="zinc" icon={<FiDownload />} onClick={() => showToast('ok', 'Export queued (demo)')}>
                      Export JSON
                    </Button>
                    <Button tone="zinc" icon={<FiDownload />} onClick={() => showToast('ok', 'Export queued (demo)')}>
                      Export CSV
                    </Button>
                  </div>
                  <div className="mt-3 rounded-lg border border-zinc-800 bg-black/30 p-3 text-xs text-zinc-400">
                    <p className="flex items-center gap-2">
                      <FiShield className="text-emerald-400" /> Privacy note: exports are signed and expire.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="py-6 text-center text-xs text-zinc-600">
            AccountPage • demo UI (wire to Supabase tables / API when ready)
          </div>
        </div>
      </main>
    </div>
  );
}
