'use client';

// apps/web/components/dashboard/ViewerRewardsPage.tsx

import React, { useMemo, useState } from 'react';
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiFilter,
  FiGift,
  FiHash,
  FiLock,
  FiMinusCircle,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShield,
  FiTag,
  FiTrendingUp,
  FiUsers,
  FiXCircle,
} from 'react-icons/fi';

/* ───────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────── */
type RewardCategory = 'Chat' | 'Fun' | 'Moderation' | 'Shoutouts' | 'IRL' | 'Perks';
type Fulfillment = 'instant' | 'manual' | 'code';
type Risk = 'low' | 'med' | 'high';
type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled';

type Reward = {
  id: string;
  name: string;
  category: RewardCategory;
  cost: number; // points
  enabled: boolean;
  stock: number | null; // null = unlimited
  cooldownMins: number;
  fulfillment: Fulfillment;
  risk: Risk;
  notes?: string;
  createdAt: number;
};

type Campaign = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: 'watch_time' | 'chat' | 'streak' | 'raid' | 'gift';
  points: number;
  capPerDay: number;
  cooldownMins: number;
  description: string;
};

type Redemption = {
  id: string;
  viewer: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  status: RedemptionStatus;
  createdAt: number;
  flagged?: boolean;
};

/* ───────────────────────────────────────────────────────────────
   Tiny UI primitives (local & drop-in friendly)
──────────────────────────────────────────────────────────────── */
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
    <section className={`rounded-xl border border-zinc-800 bg-zinc-900 ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 text-zinc-200">
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
  children,
  tone = 'zinc',
}: {
  children: React.ReactNode;
  tone?: 'zinc' | 'emerald' | 'rose' | 'amber' | 'sky';
}) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-800 text-zinc-200 ring-zinc-700',
    emerald: 'bg-emerald-600/20 text-emerald-200 ring-emerald-600/30',
    rose: 'bg-rose-600/20 text-rose-200 ring-rose-600/30',
    amber: 'bg-amber-600/20 text-amber-200 ring-amber-600/30',
    sky: 'bg-sky-600/20 text-sky-200 ring-sky-600/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${map[tone]}`}>
      {children}
    </span>
  );
}

function PillButton({
  children,
  onClick,
  tone = 'zinc',
  icon,
  className = '',
  disabled,
  pressed,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'zinc' | 'emerald' | 'rose' | 'sky';
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  pressed?: boolean;
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
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition disabled:opacity-60 ${styles[tone]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-zinc-400">{children}</div>;
}

function Input({
  value,
  onChange,
  placeholder,
  right,
  type = 'text',
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 pr-10 text-sm text-zinc-100 outline-none focus:border-emerald-600"
      />
      {right ? <div className="absolute inset-y-0 right-2 flex items-center">{right}</div> : null}
    </div>
  );
}

function Toggle({
  value,
  onChange,
  label,
  hint,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left hover:border-emerald-600"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-200">{label}</div>
        {hint ? <div className="mt-0.5 text-xs text-zinc-400">{hint}</div> : null}
      </div>
      <div
        className={`mt-0.5 h-6 w-11 rounded-full border transition ${
          value ? 'border-emerald-600 bg-emerald-600/30' : 'border-zinc-700 bg-zinc-900'
        }`}
      >
        <div
          className={`h-5 w-5 translate-y-[2px] rounded-full bg-white transition ${
            value ? 'translate-x-[22px]' : 'translate-x-[2px]'
          }`}
        />
      </div>
    </button>
  );
}

/* ───────────────────────────────────────────────────────────────
   Utils
──────────────────────────────────────────────────────────────── */
function fmtInt(n: number) {
  return n.toLocaleString();
}
function timeAgo(ts: number) {
  const ms = Date.now() - ts;
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function riskTone(r: Risk): 'emerald' | 'amber' | 'rose' {
  if (r === 'low') return 'emerald';
  if (r === 'med') return 'amber';
  return 'rose';
}
function statusTone(s: RedemptionStatus): 'zinc' | 'emerald' | 'rose' | 'sky' {
  if (s === 'approved' || s === 'fulfilled') return 'emerald';
  if (s === 'rejected') return 'rose';
  if (s === 'pending') return 'sky';
  return 'zinc';
}

/* ───────────────────────────────────────────────────────────────
   Mock data (swap to API later)
──────────────────────────────────────────────────────────────── */
const seedRewards: Reward[] = [
  {
    id: 'r1',
    name: 'Highlight my message',
    category: 'Chat',
    cost: 75,
    enabled: true,
    stock: null,
    cooldownMins: 5,
    fulfillment: 'instant',
    risk: 'low',
    notes: 'Pins message for 10 seconds above chat.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
  },
  {
    id: 'r2',
    name: 'Play SFX (approved list)',
    category: 'Fun',
    cost: 150,
    enabled: true,
    stock: null,
    cooldownMins: 3,
    fulfillment: 'instant',
    risk: 'med',
    notes: 'Only plays pre-approved sounds; no uploads.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
  {
    id: 'r3',
    name: 'Ask a question (queue)',
    category: 'Shoutouts',
    cost: 200,
    enabled: true,
    stock: null,
    cooldownMins: 10,
    fulfillment: 'manual',
    risk: 'low',
    notes: 'Adds viewer to Q&A queue with priority.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
  },
  {
    id: 'r4',
    name: 'Request a song (safe)',
    category: 'Perks',
    cost: 250,
    enabled: false,
    stock: null,
    cooldownMins: 15,
    fulfillment: 'manual',
    risk: 'high',
    notes: 'Off by default (DMCA risk). Enable only if you have licensing.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    id: 'r5',
    name: 'Time-out vote (mod gated)',
    category: 'Moderation',
    cost: 300,
    enabled: true,
    stock: null,
    cooldownMins: 30,
    fulfillment: 'manual',
    risk: 'high',
    notes: 'Creates a mod-only prompt; never auto-punishes.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: 'r6',
    name: 'Limited “First!” badge',
    category: 'Perks',
    cost: 500,
    enabled: true,
    stock: 50,
    cooldownMins: 1440,
    fulfillment: 'code',
    risk: 'low',
    notes: 'One per day; limited stock for scarcity.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
];

const seedCampaigns: Campaign[] = [
  {
    id: 'c1',
    name: 'Watch-time drip',
    enabled: true,
    trigger: 'watch_time',
    points: 5,
    capPerDay: 300,
    cooldownMins: 10,
    description: 'Earn points every 10 minutes while actively watching.',
  },
  {
    id: 'c2',
    name: 'First chat bonus',
    enabled: true,
    trigger: 'chat',
    points: 25,
    capPerDay: 25,
    cooldownMins: 1440,
    description: 'Rewards first message each day (anti-spam protected).',
  },
  {
    id: 'c3',
    name: 'Watch streak (3 days)',
    enabled: false,
    trigger: 'streak',
    points: 200,
    capPerDay: 200,
    cooldownMins: 1440,
    description: 'Bonus for consistent viewers across sessions.',
  },
  {
    id: 'c4',
    name: 'Raid welcome bonus',
    enabled: true,
    trigger: 'raid',
    points: 50,
    capPerDay: 150,
    cooldownMins: 60,
    description: 'Rewards new viewers arriving from raids (rate limited).',
  },
];

const seedRedemptions: Redemption[] = [
  {
    id: 'x1',
    viewer: 'NeonMako',
    rewardId: 'r3',
    rewardName: 'Ask a question (queue)',
    cost: 200,
    status: 'pending',
    flagged: false,
    createdAt: Date.now() - 1000 * 60 * 8,
  },
  {
    id: 'x2',
    viewer: 'KoiKage',
    rewardId: 'r2',
    rewardName: 'Play SFX (approved list)',
    cost: 150,
    status: 'fulfilled',
    flagged: false,
    createdAt: Date.now() - 1000 * 60 * 22,
  },
  {
    id: 'x3',
    viewer: 'SpammySam',
    rewardId: 'r1',
    rewardName: 'Highlight my message',
    cost: 75,
    status: 'rejected',
    flagged: true,
    createdAt: Date.now() - 1000 * 60 * 41,
  },
  {
    id: 'x4',
    viewer: 'VeraV',
    rewardId: 'r6',
    rewardName: 'Limited “First!” badge',
    cost: 500,
    status: 'approved',
    flagged: false,
    createdAt: Date.now() - 1000 * 60 * 95,
  },
];

/* ───────────────────────────────────────────────────────────────
   Page
──────────────────────────────────────────────────────────────── */
type Tab = 'overview' | 'rewards' | 'campaigns' | 'redemptions' | 'settings';

export default function ViewerRewardsPage() {
  const [tab, setTab] = useState<Tab>('overview');

  const [rewards, setRewards] = useState<Reward[]>(seedRewards);
  const [campaigns, setCampaigns] = useState<Campaign[]>(seedCampaigns);
  const [redemptions, setRedemptions] = useState<Redemption[]>(seedRedemptions);

  // Engine settings (mock)
  const [pointsName, setPointsName] = useState('Glow');
  const [pointsPerMinute, setPointsPerMinute] = useState(0.5);
  const [antiAbuseOn, setAntiAbuseOn] = useState(true);
  const [requireVerified, setRequireVerified] = useState(false);
  const [maxRedemptionsPerDay, setMaxRedemptionsPerDay] = useState(8);

  // Rewards controls
  const [rewardQuery, setRewardQuery] = useState('');
  const [rewardCategory, setRewardCategory] = useState<'All' | RewardCategory>('All');

  // Redemptions controls
  const [statusFilter, setStatusFilter] = useState<'all' | RedemptionStatus>('all');

  const stats = useMemo(() => {
    const enabledRewards = rewards.filter((r) => r.enabled).length;
    const totalRewards = rewards.length;
    const pending = redemptions.filter((r) => r.status === 'pending').length;

    // Mock “liability”: sum cost of approved/fulfilled redemptions in last 7 days
    const weekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
    const liability = redemptions
      .filter((r) => r.createdAt >= weekAgo && (r.status === 'approved' || r.status === 'fulfilled'))
      .reduce((acc, r) => acc + r.cost, 0);

    const flagged = redemptions.filter((r) => r.flagged).length;

    return { enabledRewards, totalRewards, pending, liability, flagged };
  }, [rewards, redemptions]);

  const filteredRewards = useMemo(() => {
    const q = rewardQuery.trim().toLowerCase();
    return rewards.filter((r) => {
      const matchesQ = !q || r.name.toLowerCase().includes(q);
      const matchesCat = rewardCategory === 'All' || r.category === rewardCategory;
      return matchesQ && matchesCat;
    });
  }, [rewards, rewardQuery, rewardCategory]);

  const filteredRedemptions = useMemo(() => {
    if (statusFilter === 'all') return redemptions.slice().sort((a, b) => b.createdAt - a.createdAt);
    return redemptions
      .filter((r) => r.status === statusFilter)
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [redemptions, statusFilter]);

  const selectedHighRiskRewards = useMemo(() => rewards.filter((r) => r.risk === 'high' && r.enabled), [rewards]);

  const tabButton = (key: Tab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
        tab === key
          ? 'border-emerald-600 bg-emerald-600/10 text-emerald-200'
          : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700'
      }`}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <div className="w-full min-w-0">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold text-emerald-300">🎁 Viewer Rewards</h1>
            <Chip tone="sky">
              <FiHash />
              {pointsName} Points
            </Chip>
            {antiAbuseOn ? (
              <Chip tone="emerald">
                <FiShield /> Anti-abuse on
              </Chip>
            ) : (
              <Chip tone="rose">
                <FiShield /> Anti-abuse off
              </Chip>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Build a rewards economy that’s fun <span className="text-zinc-300">and</span> safe: rate-limits, mod-gated actions,
            stock + cooldowns, and policy-friendly defaults.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PillButton tone="zinc" icon={<FiRefreshCw />} onClick={() => setRedemptions((r) => [...r])}>
            Refresh
          </PillButton>
          <PillButton tone="emerald" icon={<FiPlus />} onClick={() => setTab('rewards')}>
            New reward
          </PillButton>
        </div>
      </div>

      {/* Tabs (wraps clean on phone) */}
      <div className="mb-4 flex w-full flex-wrap gap-2">
        {tabButton('overview', 'Overview', <FiBarChart2 />)}
        {tabButton('rewards', 'Rewards', <FiGift />)}
        {tabButton('campaigns', 'Campaigns', <FiTrendingUp />)}
        {tabButton('redemptions', 'Redemptions', <FiActivity />)}
        {tabButton('settings', 'Settings', <FiSettings />)}
      </div>

      {/* Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-7">
            <Card
              title="Economy Snapshot"
              icon={<FiDollarSign className="text-emerald-300" />}
              right={<Chip tone="zinc">Live demo</Chip>}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Enabled rewards" value={`${stats.enabledRewards}/${stats.totalRewards}`} icon={<FiGift />} />
                <Stat label="Pending redemptions" value={fmtInt(stats.pending)} icon={<FiClock />} />
                <Stat label="Flagged activity" value={fmtInt(stats.flagged)} icon={<FiShield />} />
                <Stat label="7d points liability" value={`${fmtInt(stats.liability)} ${pointsName}`} icon={<FiAward />} />
              </div>

              {selectedHighRiskRewards.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-600/40 bg-amber-600/10 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="amber">
                      <FiLock /> High-risk enabled
                    </Chip>
                    <span className="text-sm text-amber-200">
                      You have {selectedHighRiskRewards.length} high-risk reward(s) enabled.
                    </span>
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-xs text-amber-200/90">
                    {selectedHighRiskRewards.slice(0, 3).map((r) => (
                      <li key={r.id}>
                        {r.name} — {r.notes ?? 'Review settings for safety.'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card title="Points Engine" icon={<FiHash className="text-emerald-300" />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Points name</Label>
                  <Input value={pointsName} onChange={setPointsName} placeholder="e.g. Glow, Sparks, Karma" />
                  <p className="text-xs text-zinc-500">
                    Branding matters. A custom name makes rewards feel native to your channel.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Base earn rate (points/minute)</Label>
                  <Input
                    value={String(pointsPerMinute)}
                    onChange={(v) => setPointsPerMinute(Number(v || 0))}
                    type="number"
                    placeholder="0.5"
                    right={<span className="text-xs text-zinc-400">/min</span>}
                  />
                  <p className="text-xs text-zinc-500">
                    Pair with caps to prevent farming. Campaigns can add bursts.
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Toggle
                  value={antiAbuseOn}
                  onChange={setAntiAbuseOn}
                  label="Anti-abuse guardrails"
                  hint="Rate-limit earns, detect spikes, and require eligibility checks."
                />
                <Toggle
                  value={requireVerified}
                  onChange={setRequireVerified}
                  label="Require verified accounts for redemptions"
                  hint="Optional friction that reduces abuse and chargebacks."
                />
              </div>

              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-200">Daily redemption cap</div>
                    <div className="text-xs text-zinc-400">
                      Limits spam + keeps stream pace manageable for you + mods.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PillButton tone="zinc" icon={<FiMinusCircle />} onClick={() => setMaxRedemptionsPerDay((n) => Math.max(0, n - 1))}>
                      -
                    </PillButton>
                    <Chip tone="zinc">{maxRedemptionsPerDay}/day</Chip>
                    <PillButton tone="zinc" icon={<FiPlus />} onClick={() => setMaxRedemptionsPerDay((n) => n + 1)}>
                      +
                    </PillButton>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Campaigns Highlights" icon={<FiTrendingUp className="text-emerald-300" />}>
              <div className="space-y-2">
                {campaigns.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-zinc-200">{c.name}</span>
                        <Chip tone={c.enabled ? 'emerald' : 'zinc'}>{c.enabled ? 'Enabled' : 'Disabled'}</Chip>
                        <Chip tone="sky">
                          <FiAward /> +{c.points}
                        </Chip>
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {c.description} • Cap {c.capPerDay}/day • Cooldown {c.cooldownMins}m
                      </div>
                    </div>
                    <PillButton
                      tone={c.enabled ? 'emerald' : 'zinc'}
                      onClick={() =>
                        setCampaigns((prev) => prev.map((x) => (x.id === c.id ? { ...x, enabled: !x.enabled } : x)))
                      }
                    >
                      {c.enabled ? 'On' : 'Off'}
                    </PillButton>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-4 xl:col-span-5">
            <Card title="Top Rewards" icon={<FiGift className="text-emerald-300" />}>
              <div className="space-y-2">
                {rewards
                  .slice()
                  .sort((a, b) => a.cost - b.cost)
                  .slice(0, 5)
                  .map((r) => (
                    <div key={r.id} className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-zinc-200">{r.name}</span>
                          <Chip tone="zinc">
                            <FiTag /> {r.category}
                          </Chip>
                          <Chip tone={riskTone(r.risk)}>
                            <FiShield /> {r.risk}
                          </Chip>
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          Cost {r.cost} {pointsName} • Cooldown {r.cooldownMins}m • {r.fulfillment}
                          {r.stock === null ? '' : ` • Stock ${r.stock}`}
                        </div>
                      </div>

                      <PillButton
                        tone={r.enabled ? 'emerald' : 'zinc'}
                        onClick={() => setRewards((prev) => prev.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)))}
                      >
                        {r.enabled ? 'Enabled' : 'Disabled'}
                      </PillButton>
                    </div>
                  ))}
              </div>
            </Card>

            <Card
              title="Recent Redemptions"
              icon={<FiActivity className="text-emerald-300" />}
              right={<Chip tone="zinc">{fmtInt(redemptions.length)} total</Chip>}
            >
              <div className="space-y-2">
                {redemptions
                  .slice()
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .slice(0, 6)
                  .map((x) => (
                    <div key={x.id} className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-200">{x.viewer}</span>
                        <Chip tone={statusTone(x.status)}>{x.status}</Chip>
                        {x.flagged ? (
                          <Chip tone="rose">
                            <FiShield /> flagged
                          </Chip>
                        ) : null}
                        <span className="ml-auto text-xs text-zinc-500">{timeAgo(x.createdAt)}</span>
                      </div>
                      <div className="text-sm text-zinc-300">{x.rewardName}</div>
                      <div className="text-xs text-zinc-400">
                        Cost {x.cost} {pointsName}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'rewards' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <Card
              title="Rewards Library"
              icon={<FiGift className="text-emerald-300" />}
              right={
                <Chip tone="zinc">
                  <FiFilter /> {rewardCategory === 'All' ? 'All' : rewardCategory}
                </Chip>
              }
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Input
                    value={rewardQuery}
                    onChange={setRewardQuery}
                    placeholder="Search rewards…"
                    right={<FiSearch className="text-zinc-500" />}
                  />
                </div>
                <select
                  value={rewardCategory}
                  onChange={(e) => setRewardCategory(e.target.value as any)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-600 sm:w-52"
                >
                  <option value="All">All categories</option>
                  <option value="Chat">Chat</option>
                  <option value="Fun">Fun</option>
                  <option value="Moderation">Moderation</option>
                  <option value="Shoutouts">Shoutouts</option>
                  <option value="IRL">IRL</option>
                  <option value="Perks">Perks</option>
                </select>
              </div>

              <div className="mt-3 space-y-2">
                {filteredRewards.map((r) => (
                  <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-zinc-200">{r.name}</span>
                          <Chip tone="zinc">
                            <FiTag /> {r.category}
                          </Chip>
                          <Chip tone={riskTone(r.risk)}>
                            <FiShield /> {r.risk}
                          </Chip>
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {r.cost} {pointsName} • {r.fulfillment} • cooldown {r.cooldownMins}m
                          {r.stock === null ? '' : ` • stock ${r.stock}`}
                        </div>
                        {r.notes ? <div className="mt-1 text-xs text-zinc-500">{r.notes}</div> : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <PillButton
                          tone={r.enabled ? 'emerald' : 'zinc'}
                          onClick={() => setRewards((prev) => prev.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)))}
                        >
                          {r.enabled ? 'Enabled' : 'Disabled'}
                        </PillButton>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredRewards.length === 0 ? (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-400">
                    No rewards match your search.
                  </div>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="xl:col-span-7">
            <Card title="Smart Defaults (Safety First)" icon={<FiShield className="text-emerald-300" />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <InfoBox
                  title="Mod-gated high impact"
                  icon={<FiLock />}
                  body="Anything that can punish, spam, or impact others should require mod approval (default)."
                />
                <InfoBox
                  title="Cooldown + daily caps"
                  icon={<FiClock />}
                  body="Prevents chat floods and keeps redemptions fun instead of annoying."
                />
                <InfoBox
                  title="Stock for scarcity"
                  icon={<FiGift />}
                  body="Limited stock creates hype without requiring high prices."
                />
                <InfoBox
                  title="Risk labels"
                  icon={<FiShield />}
                  body="Tag risky items (DMCA / moderation actions) to avoid liability surprises."
                />
              </div>

              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-sm font-semibold text-zinc-200">Pro move: “Reward lanes”</div>
                <div className="mt-1 text-xs text-zinc-400">
                  Keep <span className="text-zinc-200">Chat</span> rewards cheap (frequent), <span className="text-zinc-200">Fun</span> mid,
                  <span className="text-zinc-200">Perks</span> high (rare), and gate <span className="text-zinc-200">Moderation</span> with approvals.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'campaigns' && (
        <Card title="Campaigns" icon={<FiTrendingUp className="text-emerald-300" />}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-zinc-200">{c.name}</span>
                      <Chip tone={c.enabled ? 'emerald' : 'zinc'}>{c.enabled ? 'Enabled' : 'Disabled'}</Chip>
                      <Chip tone="sky">
                        <FiAward /> +{c.points}
                      </Chip>
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">{c.description}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Chip tone="zinc">
                        <FiUsers /> trigger: {c.trigger}
                      </Chip>
                      <Chip tone="zinc">
                        <FiClock /> cooldown: {c.cooldownMins}m
                      </Chip>
                      <Chip tone="zinc">
                        <FiFilter /> cap: {c.capPerDay}/day
                      </Chip>
                    </div>
                  </div>

                  <PillButton
                    tone={c.enabled ? 'emerald' : 'zinc'}
                    onClick={() =>
                      setCampaigns((prev) => prev.map((x) => (x.id === c.id ? { ...x, enabled: !x.enabled } : x)))
                    }
                  >
                    {c.enabled ? 'On' : 'Off'}
                  </PillButton>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-200">
              <FiShield className="text-emerald-300" />
              Anti-farm notes
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-400">
              <li>Ignore background tabs / inactive viewers (watch-time requires activity).</li>
              <li>Cap daily points per viewer and per campaign.</li>
              <li>Cooldowns prevent macro spam; flagged users can be auto-paused.</li>
            </ul>
          </div>
        </Card>
      )}

      {tab === 'redemptions' && (
        <Card
          title="Redemptions Inbox"
          icon={<FiActivity className="text-emerald-300" />}
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="zinc">{fmtInt(filteredRedemptions.length)} shown</Chip>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-600"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="text-xs text-zinc-400">
                <tr className="border-b border-zinc-800">
                  <th className="py-2 pr-3">Viewer</th>
                  <th className="py-2 pr-3">Reward</th>
                  <th className="py-2 pr-3">Cost</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-zinc-200">
                {filteredRedemptions.map((x) => (
                  <tr key={x.id} className="border-b border-zinc-900/60">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{x.viewer}</span>
                        {x.flagged ? (
                          <Chip tone="rose">
                            <FiShield /> flagged
                          </Chip>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{x.rewardName}</td>
                    <td className="py-2 pr-3">
                      {x.cost} {pointsName}
                    </td>
                    <td className="py-2 pr-3">
                      <Chip tone={statusTone(x.status)}>{x.status}</Chip>
                    </td>
                    <td className="py-2 pr-3 text-zinc-400">{timeAgo(x.createdAt)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => updateRedemption(setRedemptions, x.id, 'approved')}
                          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 hover:border-emerald-600"
                        >
                          <FiCheckCircle className="inline" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRedemption(setRedemptions, x.id, 'rejected')}
                          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 hover:border-rose-600"
                        >
                          <FiXCircle className="inline" /> Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRedemption(setRedemptions, x.id, 'fulfilled')}
                          className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 hover:border-sky-600"
                        >
                          Fulfill
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredRedemptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-zinc-400">
                      No redemptions in this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <InfoBox
              title="Queue discipline"
              icon={<FiUsers />}
              body="Pending stays human-reviewed for anything with impact: shoutouts, moderation prompts, and anything risky."
            />
            <InfoBox
              title="Flagging + audit trail"
              icon={<FiShield />}
              body="Mark suspicious behavior and keep a record—helps protect you and the platform."
            />
          </div>
        </Card>
      )}

      {tab === 'settings' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <Card title="Safety & Liability" icon={<FiShield className="text-emerald-300" />}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Toggle
                  value={antiAbuseOn}
                  onChange={setAntiAbuseOn}
                  label="Enable anti-abuse detection"
                  hint="Detect rapid earn spikes, repeated redemption spam, and suspicious patterns."
                />
                <Toggle
                  value={requireVerified}
                  onChange={setRequireVerified}
                  label="Verified-only redemptions"
                  hint="Optional, but strong protection against throwaway abuse."
                />
              </div>

              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <FiLock className="text-emerald-300" />
                  Default high-risk policy
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-400">
                  <li>Moderation rewards never auto-ban/timeout — they create a mod prompt.</li>
                  <li>DMCA-prone rewards disabled by default.</li>
                  <li>External link rewards should be “approve-only” and sandboxed.</li>
                </ul>
              </div>
            </Card>
          </div>

          <div className="xl:col-span-5">
            <Card title="Channel Experience" icon={<FiUsers className="text-emerald-300" />}>
              <div className="space-y-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className="text-sm font-semibold text-zinc-200">Messaging</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    Keep rewards readable: show cost, cooldown, and whether it’s instant or mod-approved.
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className="text-sm font-semibold text-zinc-200">Mobile-friendly UX</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    Tables scroll horizontally only when needed; cards stack on small screens.
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className="text-sm font-semibold text-zinc-200">Your brand</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    Rename points (“{pointsName}”) and keep category lanes consistent.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   Small helpers
──────────────────────────────────────────────────────────────── */
function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-zinc-400">{label}</div>
        <div className="text-zinc-500">{icon}</div>
      </div>
      <div className="mt-1 text-lg font-bold text-zinc-100">{value}</div>
    </div>
  );
}

function InfoBox({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <span className="text-emerald-300">{icon}</span>
        {title}
      </div>
      <div className="mt-2 text-xs text-zinc-400">{body}</div>
    </div>
  );
}

function updateRedemption(
  setRedemptions: React.Dispatch<React.SetStateAction<Redemption[]>>,
  id: string,
  status: RedemptionStatus
) {
  setRedemptions((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
}
