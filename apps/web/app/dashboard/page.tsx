// apps/web/app/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import type { Metadata } from 'next';
import Link from 'next/link';
import DashboardBrowse from '@/components/dashboard/Browse';
import TokenBadge from '@/components/TokenBadge';
import AdultContentToggle from '@/components/AdultContent';



export type LiveCard = {
  id: string;
  title: string;
  host: string;
  viewers: number;
  tag: 'Featured' | 'IRL' | 'Coding' | 'Music' | 'Gaming' | 'Art';
  thumb?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleRedirect = async () => {
      const isGuest = searchParams.get('guest') === 'true';

      // Allow guests to stay on the generic dashboard
      if (isGuest) return;

      // Fetch authenticated user
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        router.push('/login');
        return;
      }

      // Redirect logged‑in user to their personal dashboard
      router.push(`/dashboard/${data.user.id}`);
    };

    handleRedirect();
  }, [router, searchParams]);

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Top header with CTAs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">WeGoLiveToday</h1>
            <p className="mt-1 text-sm text-zinc-400"></p>
          </div>

          <div className="flex items-center gap-2">
            <TokenBadge />
            <AdultContentToggle />
            <Link
              href="/go-live"
              className="btn btn-ghost border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/70"
            >
              Go live
            </Link>
            <Link href="/tokens" className="btn btn-primary">
              Purchase Tokens
            </Link>
          </div>
        </div>

        {/* Interactive browse UI */}
        <section className="mt-6">
          <DashboardBrowse initialStreams={[]} />
        </section>
      </div>
    </main>
  );
}
