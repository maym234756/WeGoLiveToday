// components/dashboard/ChannelSettingsPage.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiUser, FiImage, FiGlobe, FiHash, FiTag, FiSettings, FiShield,
  FiUsers, FiBell, FiKey, FiRefreshCw, FiTrash2, FiCopy, FiSave,
  FiX, FiPlus, FiClock, FiLink, FiLock, FiInfo
} from 'react-icons/fi';

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 1) TYPES                                                                   │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

type Latency = 'normal' | 'low' | 'ultra-low';
type Visibility = 'public' | 'followers' | 'subscribers';
type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'ja' | 'ko';
type ContentLabel = 'mild-language' | 'mature' | 'games' | 'irl' | 'music' | 'sports';

type ModerationSettings = {
  automod: number;          // 0..100
  slowMode: boolean;
  slowModeSeconds: number;  // 3..300
  linksAllowed: boolean;
  followersOnly: boolean;
  blockedWords: string[];
  chatRules: string;
};

type DefaultStreamSettings = {
  title: string;
  category: string;
  tags: string;
  language: LanguageCode;
  latency: Latency;
  visibility: Visibility;
  labels: ContentLabel[];
};

type Branding = {
  displayName: string;
  description: string;
  avatarDataUrl?: string | null;
  bannerUrl?: string;
  colorHex: string;
};

type Role = { id: string; name: string; handle: string; role: 'Manager' | 'Moderator' | 'Editor' };

type Integrations = {
  alertboxUrl: string;
  webhookUrl: string;
  discordWebhook?: string;
};

type Security = {
  require2FA: boolean;
  streamKeyMasked: string;  // ****-**** style display
};

type Advanced = {
  vodRetentionDays: number;   // 0 disables VOD
  enableClipping: boolean;
  autoRecord: boolean;
  rerunOnEnd: boolean;
};

type ChannelSettings = {
  branding: Branding;
  defaults: DefaultStreamSettings;
  moderation: ModerationSettings;
  roles: Role[];
  integrations: Integrations;
  security: Security;
  advanced: Advanced;
};

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 2) LOCAL PERSISTENCE                                                       │
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
   │ 3) REUSABLE UI PRIMITIVES                                                  │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

function Card({
  title, icon, right, children, className = '', bodyClass = '',
}: {
  title: string; icon?: React.ReactNode; right?: React.ReactNode;
  children: React.ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden ${className}`}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-200">{icon}{title}</div>
        {right}
      </header>
      <div className={`p-4 ${bodyClass}`}>{children}</div>
    </section>
  );
}

function PillButton({
  children, onClick, tone = 'zinc', icon, disabled,
}: {
  children: React.ReactNode; onClick?: () => void; tone?: 'zinc'|'emerald'|'rose'|'amber';
  icon?: React.ReactNode; disabled?: boolean;
}) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    rose: 'bg-rose-600 hover:bg-rose-500 text-white',
    amber: 'bg-amber-600 hover:bg-amber-500 text-white',
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm transition ${map[tone]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {icon}{children}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string; }) {
  return (
    <label className="inline-flex items-center gap-3 select-none">
      {label && <span className="text-sm text-zinc-300">{label}</span>}
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange(!checked)}
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full p-1 transition ${checked ? 'bg-emerald-600' : 'bg-zinc-700'}`}
      >
        <span className={`block w-4 h-4 rounded-full bg-white transform transition ${checked ? 'translate-x-4' : ''}`} />
      </span>
    </label>
  );
}

function LabeledInput({
  label, value, onChange, placeholder, right, type = 'text', className,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; right?: React.ReactNode; type?: React.HTMLInputTypeAttribute; className?: string;
}) {
  const id = React.useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm text-zinc-400">{label}</label>
      <div className="mt-1 relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 pr-10 outline-none focus:border-emerald-600"
        />
        {right && <div className="absolute inset-y-0 right-2 flex items-center">{right}</div>}
      </div>
    </div>
  );
}

function Select<T extends string>({
  label, value, onChange, options, className,
}: {
  label: string; value: T; onChange: (v: T) => void; options: Array<{label: string; value: T}>;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm text-zinc-400">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><FiInfo /> {children}</p>;
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 4) DEFAULT STATE                                                           │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

const DEFAULTS: ChannelSettings = {
  branding: {
    displayName: 'Guest Creator',
    description: '',
    avatarDataUrl: null,
    bannerUrl: '',
    colorHex: '#10b981',
  },
  defaults: {
    title: 'Welcome to my stream!',
    category: 'Just Chatting',
    tags: 'chill, talk-show',
    language: 'en',
    latency: 'low',
    visibility: 'public',
    labels: ['irl'],
  },
  moderation: {
    automod: 35,
    slowMode: false,
    slowModeSeconds: 8,
    linksAllowed: true,
    followersOnly: false,
    blockedWords: ['spoiler', 'buy followers'],
    chatRules: 'Be kind. No harassment. Respect the mods.',
  },
  roles: [
    { id: 'u1', name: 'Nova', handle: '@nova', role: 'Moderator' },
  ],
  integrations: {
    alertboxUrl: '',
    webhookUrl: '',
    discordWebhook: '',
  },
  security: {
    require2FA: true,
    streamKeyMasked: 'sk_live_****_****_****',
  },
  advanced: {
    vodRetentionDays: 14,
    enableClipping: true,
    autoRecord: true,
    rerunOnEnd: false,
  },
};

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 5) PAGE                                                                    │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

export default function ChannelSettingsPage() {
  const [settings, setSettings] = useLocalStorage<ChannelSettings>('channel.settings.v1', DEFAULTS);
  const [dirty, setDirty] = useState(false);
  useEffect(() => setDirty(true), [settings]); // any change marks dirty

  const set = <K extends keyof ChannelSettings>(key: K, value: ChannelSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  /* helpers for nested updates */
  const setBranding = (p: Partial<Branding>) => set('branding', { ...settings.branding, ...p });
  const setDefaults = (p: Partial<DefaultStreamSettings>) => set('defaults', { ...settings.defaults, ...p });
  const setModeration = (p: Partial<ModerationSettings>) => set('moderation', { ...settings.moderation, ...p });
  const setIntegrations = (p: Partial<Integrations>) => set('integrations', { ...settings.integrations, ...p });
  const setSecurity = (p: Partial<Security>) => set('security', { ...settings.security, ...p });
  const setAdvanced = (p: Partial<Advanced>) => set('advanced', { ...settings.advanced, ...p });

  const onReset = () => setSettings(DEFAULTS);
  const onSave = () => {
    // here you’d call your API; for now just “persisted” already via localStorage.
    setDirty(false);
  };

  /* avatar upload preview (no server) */
  const onPickAvatar: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setBranding({ avatarDataUrl: String(reader.result || '') });
    reader.readAsDataURL(f);
  };

  /* section: roles */
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteHandle, setInviteHandle] = useState('');
  const addRole = (role: Role['role']) => {
    const id = Math.random().toString(36).slice(2, 8);
    set('roles', [...settings.roles, { id, name: inviteHandle.replace('@',''), handle: inviteHandle || '@guest', role }]);
    setInviteHandle('');
    setInviteOpen(false);
  };
  const removeRole = (id: string) => set('roles', settings.roles.filter(r => r.id !== id));

  /* computed */
  const langOptions: Array<{ label: string; value: LanguageCode }> = useMemo(() => ([
    { label: 'English', value: 'en' }, { label: 'Español', value: 'es' },
    { label: 'Français', value: 'fr' }, { label: 'Deutsch', value: 'de' },
    { label: 'Português', value: 'pt' }, { label: 'Italiano', value: 'it' },
    { label: '日本語', value: 'ja' }, { label: '한국어', value: 'ko' },
  ]), []);

  return (
    <main className="min-h-screen bg-black text-white w-full max-w-none overflow-x-hidden py-6">
      {/* Header / actions */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-emerald-400 inline-flex items-center gap-2">
          <FiSettings /> Channel Settings
        </h1>
        <div className="flex items-center gap-2">
          <PillButton tone="zinc" icon={<FiRefreshCw />} onClick={onReset}>Reset</PillButton>
          <PillButton tone="emerald" icon={<FiSave />} onClick={onSave} disabled={!dirty}>Save changes</PillButton>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* LEFT STACK */}
        <div className="xl:col-span-7 space-y-4">
          {/* Branding */}
          <Card title="Profile & Branding" icon={<FiUser className="text-emerald-400" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* avatar */}
              <div className="sm:col-span-1">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 grid place-items-center">
                    {settings.branding.avatarDataUrl
                      ? <img src={settings.branding.avatarDataUrl} alt="avatar" className="w-full h-full object-cover" />
                      : <FiImage className="text-zinc-500" />}
                  </div>
                  <div className="space-x-2">
                    <label className="cursor-pointer text-sm px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 inline-flex items-center gap-2">
                      <FiImage /> Upload
                      <input type="file" className="hidden" accept="image/*" onChange={onPickAvatar} />
                    </label>
                    {settings.branding.avatarDataUrl && (
                      <button
                        className="text-sm px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700"
                        onClick={() => setBranding({ avatarDataUrl: null })}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* text fields */}
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabeledInput
                  label="Display name"
                  value={settings.branding.displayName}
                  onChange={(v) => setBranding({ displayName: v })}
                />
                <LabeledInput
                  label="Brand color"
                  value={settings.branding.colorHex}
                  onChange={(v) => setBranding({ colorHex: v })}
                  right={<div className="w-5 h-5 rounded-full border border-zinc-600" style={{ background: settings.branding.colorHex }} />}
                />
                <LabeledInput
                  label="Banner image URL"
                  value={settings.branding.bannerUrl || ''}
                  onChange={(v) => setBranding({ bannerUrl: v })}
                />
                <div className="sm:col-span-2">
                  <LabeledInput
                    label="Channel description"
                    value={settings.branding.description}
                    onChange={(v) => setBranding({ description: v })}
                    placeholder="Tell viewers what your channel is about"
                  />
                </div>
              </div>
            </div>
            <Hint>Upload stores locally for preview—wire to your storage/edge when ready.</Hint>
          </Card>

          {/* Stream Defaults */}
          <Card title="Stream Defaults" icon={<FiGlobe className="text-emerald-400" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabeledInput label="Default title" value={settings.defaults.title} onChange={(v) => setDefaults({ title: v })} />
              <LabeledInput label="Category" value={settings.defaults.category} onChange={(v) => setDefaults({ category: v })} />
              <LabeledInput label="Tags" value={settings.defaults.tags} onChange={(v) => setDefaults({ tags: v })} />
              <Select
                label="Language"
                value={settings.defaults.language}
                onChange={(v) => setDefaults({ language: v })}
                options={langOptions}
              />
              <Select
                label="Latency mode"
                value={settings.defaults.latency}
                onChange={(v) => setDefaults({ latency: v })}
                options={[
                  { label: 'Normal', value: 'normal' },
                  { label: 'Low', value: 'low' },
                  { label: 'Ultra-low', value: 'ultra-low' },
                ]}
              />
              <Select
                label="Visibility"
                value={settings.defaults.visibility}
                onChange={(v) => setDefaults({ visibility: v })}
                options={[
                  { label: 'Public', value: 'public' },
                  { label: 'Followers only', value: 'followers' },
                  { label: 'Subscribers only', value: 'subscribers' },
                ]}
              />
            </div>

            {/* content labels */}
            <div className="mt-4">
              <div className="text-sm text-zinc-400 mb-2">Content labels</div>
              <div className="flex flex-wrap gap-2">
                {(['mild-language','mature','games','irl','music','sports'] as ContentLabel[]).map(lbl => {
                  const active = settings.defaults.labels.includes(lbl);
                  return (
                    <button
                      key={lbl}
                      onClick={() => {
                        const setL = new Set(settings.defaults.labels);
                        active ? setL.delete(lbl) : setL.add(lbl);
                        setDefaults({ labels: Array.from(setL) as ContentLabel[] });
                      }}
                      className={`px-3 py-1.5 rounded-md text-sm border transition ${
                        active ? 'bg-emerald-600/20 border-emerald-600 text-emerald-300' : 'border-zinc-700 hover:bg-zinc-800'
                      }`}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Moderation */}
          <Card title="Moderation" icon={<FiShield className="text-emerald-400" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">Automod level</span>
                  <span className="text-sm text-zinc-400">{settings.moderation.automod}</span>
                </div>
                <input
                  type="range" min={0} max={100} value={settings.moderation.automod}
                  onChange={(e)=>setModeration({ automod: parseInt(e.target.value,10) })}
                  className="w-full accent-emerald-500"
                />
                <Hint>Higher values filter more toxicity, spam, and harassment.</Hint>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Allow links in chat</span>
                <Toggle checked={settings.moderation.linksAllowed} onChange={(v)=>setModeration({ linksAllowed: v })} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Followers-only mode</span>
                <Toggle checked={settings.moderation.followersOnly} onChange={(v)=>setModeration({ followersOnly: v })} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Slow mode</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={3} max={300}
                    value={settings.moderation.slowModeSeconds}
                    onChange={(e)=>setModeration({ slowModeSeconds: Math.max(3, Math.min(300, parseInt(e.target.value || '0',10))) })}
                    className="w-20 rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600"
                  />
                  <Toggle checked={settings.moderation.slowMode} onChange={(v)=>setModeration({ slowMode: v })} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm text-zinc-400">Blocked words (comma separated)</label>
                <input
                  value={settings.moderation.blockedWords.join(', ')}
                  onChange={(e)=>setModeration({ blockedWords: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })}
                  className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm text-zinc-400">Chat rules</label>
                <textarea
                  value={settings.moderation.chatRules}
                  onChange={(e)=>setModeration({ chatRules: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT STACK */}
        <div className="xl:col-span-5 space-y-4">
          {/* Roles & Permissions */}
          <Card
            title="Roles & Permissions"
            icon={<FiUsers className="text-emerald-400" />}
            right={<PillButton tone="emerald" icon={<FiPlus />} onClick={() => setInviteOpen(true)}>Invite</PillButton>}
          >
            {settings.roles.length === 0 ? (
              <p className="text-sm text-zinc-400">No collaborators yet.</p>
            ) : (
              <ul className="space-y-2">
                {settings.roles.map(r => (
                  <li key={r.id} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2">
                    <div>
                      <div className="text-zinc-100">{r.name} <span className="text-zinc-500">{r.handle}</span></div>
                      <div className="text-xs text-zinc-400">{r.role}</div>
                    </div>
                    <button className="text-sm px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700" onClick={()=>removeRole(r.id)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Integrations */}
          <Card title="Integrations" icon={<FiLink className="text-emerald-400" />}>
            <div className="grid grid-cols-1 gap-4">
              <LabeledInput
                label="Alertbox URL"
                value={settings.integrations.alertboxUrl}
                onChange={(v)=>setIntegrations({ alertboxUrl: v })}
                right={<MiniCopy text={settings.integrations.alertboxUrl} />}
              />
              <LabeledInput
                label="Webhook (POST)"
                value={settings.integrations.webhookUrl}
                onChange={(v)=>setIntegrations({ webhookUrl: v })}
                right={<MiniCopy text={settings.integrations.webhookUrl} />}
              />
              <LabeledInput
                label="Discord Webhook"
                value={settings.integrations.discordWebhook || ''}
                onChange={(v)=>setIntegrations({ discordWebhook: v })}
                right={<MiniCopy text={settings.integrations.discordWebhook || ''} />}
              />
              <Hint>Send live status, events, and alerts to your tools. Rotate secrets regularly.</Hint>
            </div>
          </Card>

          {/* Security */}
          <Card title="Security" icon={<FiLock className="text-emerald-400" />}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Require 2FA for changes</span>
                <Toggle checked={settings.security.require2FA} onChange={(v)=>setSecurity({ require2FA: v })} />
              </div>
              <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2">
                <div className="text-sm">
                  <div className="text-zinc-400">Stream key</div>
                  <div className="text-zinc-200 font-mono">{settings.security.streamKeyMasked}</div>
                </div>
                <div className="flex items-center gap-2">
                  <PillButton tone="zinc" icon={<FiCopy />} onClick={()=>navigator.clipboard.writeText('REDACTED')}>
                    Copy
                  </PillButton>
                  <PillButton tone="amber" icon={<FiRefreshCw />} onClick={() => setSecurity({ streamKeyMasked: maskNewKey() })}>
                    Rotate
                  </PillButton>
                </div>
              </div>
            </div>
          </Card>

          {/* Advanced */}
          <Card title="Advanced" icon={<FiSettings className="text-emerald-400" />}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">VOD retention (days)</span>
                <input
                  type="number" min={0} max={60}
                  value={settings.advanced.vodRetentionDays}
                  onChange={(e)=>setAdvanced({ vodRetentionDays: Math.max(0, Math.min(60, parseInt(e.target.value || '0',10))) })}
                  className="w-24 rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-emerald-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Enable clipping</span>
                <Toggle checked={settings.advanced.enableClipping} onChange={(v)=>setAdvanced({ enableClipping: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Auto record streams</span>
                <Toggle checked={settings.advanced.autoRecord} onChange={(v)=>setAdvanced({ autoRecord: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Rerun last VOD after end</span>
                <Toggle checked={settings.advanced.rerunOnEnd} onChange={(v)=>setAdvanced({ rerunOnEnd: v })} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <Modal
          title="Invite collaborator"
          onClose={() => setInviteOpen(false)}
          footer={
            <div className="flex items-center gap-2">
              <PillButton tone="zinc" icon={<FiX />} onClick={()=>setInviteOpen(false)}>Cancel</PillButton>
              <PillButton tone="emerald" icon={<FiUsers />} onClick={() => addRole('Moderator')} disabled={!inviteHandle}>Add as Moderator</PillButton>
              <PillButton tone="emerald" icon={<FiUsers />} onClick={() => addRole('Manager')} disabled={!inviteHandle}>Add as Manager</PillButton>
            </div>
          }
        >
          <LabeledInput
            label="User handle"
            value={inviteHandle}
            onChange={setInviteHandle}
            placeholder="@username"
          />
          <Hint>Invites are local for now—connect to your backend to send real invitations.</Hint>
        </Modal>
      )}
    </main>
  );
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 6) SMALL UTIL COMPONENTS                                                   │
   ╰────────────────────────────────────────────────────────────────────────────╯ */

function Modal({
  title, onClose, children, footer,
}: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-50">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-200"><FiUsers className="text-emerald-400" /> {title}</div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200"><FiX /></button>
        </header>
        <div className="p-4 space-y-3">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-zinc-800">{footer}</div>}
      </div>
    </div>
  );
}

function MiniCopy({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false), 1200);} catch {} }}
      className="text-xs text-zinc-300 hover:text-white inline-flex items-center gap-1"
      title="Copy"
    >
      <FiCopy /> {ok ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ╭────────────────────────────────────────────────────────────────────────────╮
   │ 7) UTILS                                                                   │
   ╰────────────────────────────────────────────────────────────────────────────╯ */
function maskNewKey() {
  const part = () => Math.random().toString(36).slice(2, 6);
  return `sk_live_${part()}_${part()}_${part()}`;
}
