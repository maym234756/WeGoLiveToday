// apps/web/app/guest-dashboard/page.tsx
'use client';

export const dynamic = 'force-dynamic';


import Link from 'next/link';
import DashboardBrowse from '@/components/dashboard/Browse';
import TokenBadge from '@/components/TokenBadge';
import AdultContentToggle from '@/components/AdultContent';

export default function GuestDashboard() {
  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Welcome to WeGoLiveToday 👋
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              You’re browsing as a guest. Sign up to go live or chat.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TokenBadge />
            <AdultContentToggle />
            <Link
              href="/signup"
              className="btn btn-ghost border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/70"
            >
              Create Account
            </Link>
          </div>
        </div>

        <section className="mt-6">
          <DashboardBrowse initialStreams={[]} />
        </section>
      </div>
    </main>
  );
}
