import { Section } from '@/app/admin/_components/Section'
import { fmtCurrency, fmtNumber } from '@/lib/format'

export default function TokensAdminPage() {
  return (
    <div className="space-y-6">
      <Section title="Token economy">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="text-xs text-zinc-400">Sold (24h)</div>
            <div className="mt-1 text-2xl font-semibold text-white">{fmtNumber(84_200)}</div>
            <div className="mt-1 text-xs text-emerald-400">+9.2% vs prev day</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="text-xs text-zinc-400">Redeemed (24h)</div>
            <div className="mt-1 text-2xl font-semibold text-white">{fmtNumber(71_600)}</div>
            <div className="mt-1 text-xs text-zinc-400">utilization 85%</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="text-xs text-zinc-400">Revenue (24h)</div>
            <div className="mt-1 text-2xl font-semibold text-white">{fmtCurrency(3_920)}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="text-xs text-zinc-400">Avg price / 100</div>
            <div className="mt-1 text-2xl font-semibold text-white">{fmtCurrency(1.99)}</div>
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="text-left text-zinc-400">
              <tr className="border-b border-zinc-800">
                <th className="py-2 pr-3">Bundle</th>
                <th className="py-2 pr-3">Tokens</th>
                <th className="py-2 pr-3">Price</th>
                <th className="py-2 pr-3">Sold (30d)</th>
                <th className="py-2 pr-3">Revenue</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {[
                { name: 'Starter', tokens: 500, price: 9.99, sold: 5200, status: 'active' },
                { name: 'Fan', tokens: 1200, price: 19.99, sold: 3200, status: 'active' },
                { name: 'Pro', tokens: 3000, price: 44.99, sold: 1800, status: 'active' },
                { name: 'Whale', tokens: 10000, price: 129.99, sold: 180, status: 'testing' },
              ].map((b) => (
                <tr key={b.name} className="hover:bg-zinc-900/40">
                  <td className="py-2 pr-3">{b.name}</td>
                  <td className="py-2 pr-3">{fmtNumber(b.tokens)}</td>
                  <td className="py-2 pr-3">{fmtCurrency(b.price)}</td>
                  <td className="py-2 pr-3">{fmtNumber(b.sold)}</td>
                  <td className="py-2 pr-3">{fmtCurrency(b.sold * b.price)}</td>
                  <td className="py-2 pr-3">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
