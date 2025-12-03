'use client'

import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'

/**
 * Simple creator studio dashboard with a customizable layout.
 * - Reorder widgets with Move Up / Move Down (in "Edit layout" mode)
 * - Hide/show widgets (except those locked)
 * - Layout persists in localStorage
 */

type WidgetId =
  | 'revenue'
  | 'goLive'
  | 'streamInfo'
  | 'schedule'
  | 'goals'
  | 'alerts'
  | 'payouts'

const DEFAULT_ORDER: WidgetId[] = [
  'revenue',     // locked – always visible
  'goLive',
  'streamInfo',
  'schedule',
  'goals',
  'alerts',
  'payouts',
]

const LOCKED: WidgetId[] = ['revenue']                // always on
const STORAGE_KEY = 'studio.layout.v1'

export default function StudioDashboardPage() {
  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_ORDER)
  const [hidden, setHidden] = useState<WidgetId[]>([])
  const [edit, setEdit] = useState(false)

// Demo metrics (wire to your API later)
const stats = useMemo(
  () => ({
    tokensCurrent: 2000,  
    revenueCurrent:600,         // <— NEW: current token balance
    tokensToday: 780,
    tokens30d: 5680,
    totalSubscription: 1432,
    subscriptionRate: 15,
    subscriptionProfit: 19332,
    CreatorSubTake: 10,
    DollarPerToken: 3 *0.1,
    estUsdToday: 23400 * 0.01,     // example: 1 token = $0.01
    estUsd30d: 48210 * 0.01,
    pendingPayout: 0.00,
    balance: 600.00,
    rtmpUrl: 'rtmp://live.wegolive.com/app',
    streamKeyMasked: 'sk_live_************fA9Z',
  }),
  []
)


  // load prefs
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      if (Array.isArray(saved.order)) setOrder(saved.order)
      if (Array.isArray(saved.hidden)) setHidden(saved.hidden)
    } catch {}
  }, [])

  // persist prefs
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden }))
  }, [order, hidden])

  function visible(id: WidgetId) {
    return LOCKED.includes(id) || !hidden.includes(id)
  }

  function toggleHidden(id: WidgetId) {
    if (LOCKED.includes(id)) return
    setHidden((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function move(id: WidgetId, dir: -1 | 1) {
    const idx = order.indexOf(id)
    const tgt = idx + dir
    if (idx < 0 || tgt < 0 || tgt >= order.length) return
    const copy = order.slice()
    const [item] = copy.splice(idx, 1)
    copy.splice(tgt, 0, item)
    setOrder(copy)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">Creator Studio</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEdit((e) => !e)}
            className={clsx(
              'rounded-md border px-3 py-2 text-sm',
              edit
                ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500'
                : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
            )}
          >
            {edit ? 'Done' : 'Edit layout'}
          </button>
        </div>
      </div>

      {/* Grid – responsive */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {order.map((id) =>
          visible(id) ? (
            <WidgetShell
              key={id}
              title={WIDGET_TITLES[id]}
              locked={LOCKED.includes(id)}
              edit={edit}
              onMoveUp={() => move(id, -1)}
              onMoveDown={() => move(id, +1)}
              onToggle={() => toggleHidden(id)}
            >
              <Widget id={id} stats={stats} />
            </WidgetShell>
          ) : null
        )}
      </div>
    </div>
  )
}

/* ---------------------------------- UI ---------------------------------- */

function WidgetShell(props: {
  title: string
  edit?: boolean
  locked?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  onToggle?: () => void
  children: React.ReactNode
}) {
  const { title, edit, locked, onMoveUp, onMoveDown, onToggle, children } = props
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/70">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-200">{title}</h2>
        {edit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
              onClick={onMoveUp}
              aria-label="Move widget up"
            >
              ↑
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
              onClick={onMoveDown}
              aria-label="Move widget down"
            >
              ↓
            </button>
            <button
              type="button"
              disabled={locked}
              className={clsx(
                'rounded-md border px-2 py-1 text-xs',
                locked
                  ? 'cursor-not-allowed border-zinc-800 bg-zinc-800 text-zinc-400'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
              )}
              onClick={onToggle}
              aria-label="Hide widget"
              title={locked ? 'This widget is required' : 'Hide widget'}
            >
              {locked ? 'Locked' : 'Hide'}
            </button>
          </div>
        )}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

const WIDGET_TITLES: Record<WidgetId, string> = {
  revenue: 'Revenue',
  goLive: 'Go live',
  streamInfo: 'Profile & branding',
  schedule: 'Schedule',
  goals: 'Goals',
  alerts: 'Alerts',
  payouts: 'Payouts',
}

/* ---------------------------- Individual widgets ---------------------------- */

function Widget({ id, stats }: { id: WidgetId; stats: any }) {
  switch (id) {
    case 'revenue':
      return <RevenueWidget stats={stats} />
    case 'goLive':
      return <GoLiveWidget stats={stats} />
    case 'streamInfo':
      return <StreamInfoWidget />
    case 'schedule':
      return <ScheduleWidget />
    case 'goals':
      return <GoalsWidget />
    case 'alerts':
      return <AlertsWidget />
    case 'payouts':
      return <PayoutsWidget stats={stats} />
    default:
      return null
  }
}

/* --- Revenue (locked) --- */
function RevenueWidget({ stats }: { stats: RevenueStats }) {
  return (
    <div
      className="
        grid gap-3 min-w-0
        grid-cols-[repeat(auto-fit,minmax(160px,1fr))]
        auto-rows-fr
      "
    >
      <StatCardMini label="Current tokens" value={stats.tokensCurrent.toLocaleString()} />
      <StatCardMini label="Current Profit" value={`$${stats.revenueCurrent.toFixed(2)}`} />
      <StatCardMini label="Today's tokens" value={stats.tokensToday.toLocaleString()} />
      <StatCardMini label="Todays Profit" value={`$${stats.estUsdToday.toLocaleString(2)}`}/>
      <StatCardMini label="Tokens (30d)" value={stats.tokens30d.toLocaleString()} />
      <StatCardMini label="Total Subscribers" value={stats.totalSubscription.toLocaleString()} />
      <StatCardMini label="Subscription Rate" value={`$${stats.subscriptionRate.toFixed()}`} />
      <StatCardMini label="Subscription Profit" value={`$${stats.subscriptionProfit.toLocaleString('en-US')}`}/>
      <StatCardMini label="Creator Sub Take %" value={`${stats.CreatorSubTake.toFixed()}%`} />
      <StatCardMini label="$ Per Token" value={`$${stats.DollarPerToken.toLocaleString('en-US')}`}/>

    </div>
  )
}


/* --- Go Live quick panel --- */
export function GoLiveWidget({ stats }: { stats: any }) {
  // form state
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("IRL")
  const [bitrate, setBitrate] = useState("auto")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [thumb, setThumb] = useState<File | null>(null)
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)

  const [lowLatency, setLowLatency] = useState(true)
  const [recordDvr, setRecordDvr] = useState(true)
  const [chatMode, setChatMode] = useState<"all" | "followers" | "subs">("all")

  const [isPreviewing, setIsPreviewing] = useState(false)

  const bitratePresets = useMemo(
    () => [
      { label: "Auto", value: "auto" },
      { label: "4500 kbps (1080p30)", value: "4500" },
      { label: "6000 kbps (1080p60)", value: "6000" },
      { label: "3000 kbps (720p60)", value: "3000" },
    ],
    []
  )

  function addTagFromInput() {
    const cleaned = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    if (!cleaned.length) return
    setTags((prev) => Array.from(new Set([...prev, ...cleaned])))
    setTagInput("")
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t))
  }

  function handleThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setThumb(file)
    setThumbUrl(file ? URL.createObjectURL(file) : null)
  }

  function onSubmitPreview(e: React.FormEvent) {
    e.preventDefault()
    setIsPreviewing(true)
    // TODO: call preview API with all form state
    setTimeout(() => {
      setIsPreviewing(false)
      alert("Preview started — wire to your ingest/encoder service.")
    }, 600)
  }

  function onGoLive() {
    // TODO: call go-live endpoint with form state
    alert("Going live… (wire to encoder/ingest transition)")
  }

  function onEndStream() {
    // TODO: stop the stream
    alert("End stream… (wire to stop endpoint)")
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Go live</h3>
        <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Ready
        </span>
      </div>

      {/* Outer grid: left (form) + right (thumbnail/options) */}
      <form
        onSubmit={onSubmitPreview}
        aria-label="Go live form"
        className="grid gap-6 lg:grid-cols-3"
      >
        {/* LEFT: Title / Category / Bitrate / Tags */}
        <div className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Title */}


            {/* Category */}
            <div>
              <label htmlFor="category" className="text-sm text-zinc-300">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-zinc-200 outline-none focus:border-emerald-500"
              >
                <option>IRL</option>
                <option>Gaming</option>
                <option>Music</option>
                <option>Coding</option>
                <option>Adult Content</option>
                <option>Podcast</option>
              </select>
            </div>



            {/* Tags */}
            <div className="sm:col-span-2">



              <p className="mt-1 text-xs text-zinc-400">
                Press <span className="font-medium">Enter</span> or click <span className="font-medium">Add</span> to create tags.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">

            <button
              type="button"
              onClick={onGoLive}
              className="h-10 min-w-[96px] rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Go live
            </button>
            <button
              type="button"
              onClick={onEndStream}
              className="h-10 min-w-[110px] rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              End stream
            </button>
          </div>
        </div>

        {/* RIGHT: Thumbnail + Stream options */}
        <div className="grid gap-4">
          {/* Thumbnail */}


          {/* Options */}

        </div>
      </form>
    </section>
  )
}

/* --- Branding / Profile --- */
function StreamInfoWidget() {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="about" className="text-sm text-zinc-300">
          About
        </label>
        <textarea
          id="about"
          className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-emerald-500"
          rows={4}
          placeholder="Tell viewers about your stream…"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="avatar" className="text-sm text-zinc-300">
            Avatar
          </label>
          <input
            id="avatar"
            type="file"
            accept="image/*"
            className="mt-1 block w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-200 hover:file:bg-zinc-700"
          />
        </div>
        <div>
          <label htmlFor="banner" className="text-sm text-zinc-300">
            Banner
          </label>
          <input
            id="banner"
            type="file"
            accept="image/*"
            className="mt-1 block w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-200 hover:file:bg-zinc-700"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Instagram" placeholder="@yourhandle or https://instagram.com/you" />
        <Labeled label="TikTok" placeholder="@yourhandle or https://tiktok.com/@you" />
        <Labeled label="YouTube" placeholder="https://youtube.com/@you" />
        <Labeled label="Twitter (X)" placeholder="@yourhandle or https://twitter.com/you" />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
          onClick={() => alert('Saved branding')}
        >
          Save
        </button>
        <button
          type="button"
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          onClick={() => alert('Preview profile')}
        >
          Preview
        </button>
      </div>
    </div>
  )
}

/* --- Schedule --- */
function ScheduleWidget() {
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        alert('Schedule saved (wire to backend)')
      }}
      aria-label="Streaming schedule form"
    >
      <Labeled label="Days" placeholder="Mon, Wed, Fri" />
      <Labeled label="Time" placeholder="7:00 PM – 10:00 PM" />
      <Labeled label="Timezone" placeholder="America/New_York" />
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
        >
          Save schedule
        </button>
      </div>
    </form>
  )
}

/* --- Goals --- */
function GoalsWidget() {
  return (
    <div className="space-y-4">
      <Goal label="Followers" current={8_420} target={10_000} />
      <Goal label="Monthly tokens" current={38_220} target={50_000} color="emerald" />
      <Goal label="Todays Goal" current={740} target={1000} color="violet" />
      <div className="flex gap-2">
        <button
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
          onClick={() => alert('Goals saved')}
        >
          Save goals
        </button>
        <button
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          onClick={() => alert('Reset progress')}
        >
          Reset progress
        </button>
      </div>
    </div>
  )
}

/* --- Alerts / Overlays --- */
function AlertsWidget() {
  return (
    <div className="space-y-3">
      <ToggleRow id="tkn" label="Token tips alert" defaultChecked />
      <ToggleRow id="sub" label="New subscriber alert" defaultChecked />
      <ToggleRow id="fllw" label="New follower alert" defaultChecked />
      <ToggleRow id="snd" label="Play sound" />
      <ToggleRow id="tts" label="Enable TTS for tips" />
      <div className="flex gap-2 pt-2">
        <button
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
          onClick={() => alert('Alerts saved')}
        >
          Save alerts
        </button>
        <button
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          onClick={() => alert('Open overlay in new window')}
        >
          Open overlay
        </button>
      </div>
    </div>
  )
}

/* --- Payouts --- */
function PayoutsWidget({ stats }: { stats: any }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCardMini label="Balance" value={`$${stats.balance.toFixed(2)}`} />
        <StatCardMini label="Pending payout" value={`$${stats.pendingPayout.toFixed(2)}`} />
      </div>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          alert('Payout requested (wire to payments provider)')
        }}
        aria-label="Payout request form"
      >
        <Labeled label="Amount (USD)" placeholder="100.00" />
        <Labeled label="Destination" placeholder="Bank **** 1234" />
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
          >
            Request payout
          </button>
        </div>
      </form>
    </div>
  )
}

/* --------------------------------- bits --------------------------------- */

function StatCardMini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-100">{value}</div>
    </div>
  )
}

function Labeled({
  label,
  value,
  placeholder,
  readonly,
  onCopy,
  after,
}: {
  label: string
  value?: string
  placeholder?: string
  readonly?: boolean
  onCopy?: () => void
  after?: React.ReactNode
}) {
  return (
    <div>
      <label className="text-sm text-zinc-300">{label}</label>
      <div className="mt-1 flex items-center">
        <input
          readOnly={readonly}
          defaultValue={value}
          placeholder={placeholder}
          className={clsx(
            'w-full rounded-md border px-3 py-2 outline-none',
            'border-zinc-800 bg-zinc-900 text-zinc-200',
            'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
          )}
        />
        {onCopy && (
          <button
            type="button"
            className="ml-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
            onClick={onCopy}
            aria-label="Copy to clipboard"
          >
            Copy
          </button>
        )}
        {after}
      </div>
    </div>
  )
}

function Goal({
  label,
  current,
  target,
  color = 'emerald',
}: {
  label: string
  current: number
  target: number
  color?: 'emerald' | 'violet' | 'cyan'
}) {
  const pct = Math.max(0, Math.min(100, Math.round((current / target) * 100)))
  const colorBar =
    color === 'emerald'
      ? 'bg-emerald-500'
      : color === 'violet'
      ? 'bg-violet-500'
      : 'bg-cyan-500'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm text-zinc-300">
        <span>{label}</span>
        <span className="text-zinc-400">
          {current.toLocaleString()} / {target.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full rounded bg-zinc-800">
        <div className={clsx('h-2 rounded', colorBar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ToggleRow({
  id,
  label,
  defaultChecked,
}: {
  id: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-600 focus:ring-emerald-500"
      />
      <span className="text-sm text-zinc-200">{label}</span>
    </label>
  )
}
