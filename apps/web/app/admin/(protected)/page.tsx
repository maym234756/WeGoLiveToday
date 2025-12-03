// apps/web/app/admin/(protected)/page.tsx
import StatCard from '@/app/admin/_components/StatCard';
import { Section } from '@/app/admin/_components/Section';
import { fmtCurrency, fmtNumber, pct } from '@/lib/format';
import type { Metadata } from 'next';
import CompareToggle from '@/app/admin/_components/CompareToggle'

export const metadata: Metadata = {
  title: 'Overview · Admin — WeGoLive',
};

// A small, fixed map of Tailwind height classes we can safely reference.
// This avoids inline styles (to satisfy axe/no-inline-styles) and also keeps
// Tailwind’s purge working since the strings are statically present.
const H = [
  'h-2','h-3','h-4','h-5','h-6','h-7','h-8','h-9','h-10','h-11',
  'h-12','h-13','h-14','h-15','h-16','h-17','h-18','h-19','h-20',
  'h-21','h-22','h-23','h-24','h-25','h-26','h-27','h-28',
] as const;

// Map a 10–100 “percent-like” number into one of the height classes above.
function heightClassFromPercent(x: number) {
  const clamped = Math.max(10, Math.min(100, Math.round(x)));
  const idx = Math.max(0, Math.min(H.length - 1, Math.round((clamped / 100) * (H.length - 1))));
  return H[idx];
}

type Trend = 'up' | 'down' | 'flat';

export default async function AdminOverview() {
  // Fake sample metrics – wire to DB/analytics later
  const today = {
    revenue: 1842,
    expenses: 1120,
    margin: 0.39,              // (rev - exp) / rev
    mrr: 48_200,               // recurring
    arpu: 7.9,
    cac: 3.2,
    churn: 0.021,
    netIncome: 722,            // revenue - expenses
    bank: 122_000,
    burn: 18_400,              // monthly expenses - rev (or target)
    runwayMonths: 6.6,
  };

  const kpi: Array<{ label: string; value: string; hint: string; trend?: Trend }> = [
    { label: 'Revenue (24h)', value: fmtCurrency(today.revenue), hint: '+$220 vs prev day', trend: 'up' },
    { label: 'Expenses (24h)', value: fmtCurrency(today.expenses), hint: '-$60 vs prev day', trend: 'down' },
    {
      label: 'Net income (24h)',
      value: fmtCurrency(today.netIncome),
      hint: today.margin > 0 ? 'profitable' : 'loss',
      trend: today.netIncome > 0 ? 'up' : 'down',
    },
    { label: 'Gross margin', value: pct(today.margin), hint: 'target ≥ 25%', trend: 'flat' },
    { label: 'MRR', value: fmtCurrency(today.mrr), hint: '+3.4% MoM', trend: 'up' },
    { label: 'ARPU', value: fmtCurrency(today.arpu), hint: 'per active user', trend: 'flat' },
    { label: 'CAC', value: fmtCurrency(today.cac), hint: 'last 14 days avg', trend: 'down' },
    { label: 'Churn', value: pct(today.churn), hint: '14-day rolling', trend: 'down' },
    { label: 'Bank', value: fmtCurrency(today.bank), hint: `Runway ~${today.runwayMonths.toFixed(1)} mo`, trend: 'flat' },
    { label: 'Burn multiple', value: (today.burn / today.mrr).toFixed(2), hint: 'target ≤ 1.5', trend: 'down' },
  ];

  // Example mini-series for bar chart (10..100). Replace with real analytics later.
  const miniBars = Array.from({ length: 18 }, () => Math.floor(Math.random() * 91) + 10);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpi.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">

      </div>

      {/* Recent broadcasts table */}
      <Section title="Recent broadcasts">
        <div className="overflow-auto">
          <table
            className="min-w-[720px] w-full text-sm"
            aria-label="Recent broadcasts table"
          >
            <caption className="sr-only">Recent broadcasts</caption>
            <thead className="text-left text-zinc-400">
              <tr className="border-b border-zinc-800">
                <th scope="col" className="py-2 pr-3">Title</th>
                <th scope="col" className="py-2 pr-3">Creator</th>
                <th scope="col" className="py-2 pr-3">Category</th>
                <th scope="col" className="py-2 pr-3">Peak viewers</th>
                <th scope="col" className="py-2 pr-3">Tokens</th>
                <th scope="col" className="py-2 pr-3">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="hover:bg-zinc-900/40">
                  <th scope="row" className="py-2 pr-3 font-medium text-zinc-200">
                    Stream #{i + 1}
                  </th>
                  <td className="py-2 pr-3">creator{i + 1}</td>
                  <td className="py-2 pr-3">IRL</td>
                  <td className="py-2 pr-3">{fmtNumber(400 + Math.random() * 900)}</td>
                  <td className="py-2 pr-3">{fmtNumber(120 + Math.random() * 500)}</td>
                  <td className="py-2 pr-3">2h ago</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
