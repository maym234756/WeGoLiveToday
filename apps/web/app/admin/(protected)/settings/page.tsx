import { Section } from '@/app/admin/_components/Section'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Section title="Platform settings">
        <form className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-zinc-300">Site name</span>
              <input className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-emerald-500" defaultValue="WeGoLive" />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-zinc-300">Support email</span>
              <input className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-emerald-500" defaultValue="support@wegolive.com" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-zinc-300">Token provider key</span>
              <input className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none" placeholder="••••••••••••••••" />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-zinc-300">Minimum payout (USD)</span>
              <input type="number" className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none" defaultValue={50} />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500">Save</button>
            <span className="text-xs text-zinc-500">Configuration is local for now — wire to your store later.</span>
          </div>
        </form>
      </Section>
    </div>
  )
}
