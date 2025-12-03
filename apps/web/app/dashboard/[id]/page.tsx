'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ChatInput from '@/components/ChatInput';
import DashboardBrowse from '@/components/dashboard/Browse';
import TokenBadge from '@/components/TokenBadge';
import AdultContentToggle from '@/components/AdultContent';
import LogoutButton from '@/components/LogoutButton';
import UpgradeModal from '@/components/UpgradeModal';
import Image from 'next/image';

export default function UserDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = useParams();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const upgraded = searchParams.get('upgraded');

      if (upgraded === 'true') {
        // Refresh after successful Stripe upgrade and show banner
        await supabase.auth.refreshSession();
        setShowSuccessBanner(true);
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const refreshedUser = sessionData?.session?.user;

      if (!refreshedUser || sessionError) {
        router.push('/login');
        return;
      }

      if (refreshedUser.id !== id) {
        router.push(`/dashboard/${refreshedUser.id}`);
        return;
      }

      setUser(refreshedUser);
      setIsPro(refreshedUser.user_metadata?.pro === true);
      setLoading(false);
    };

    fetchUser();
  }, [id, router, searchParams]);

  // Auto-hide success banner after 60s
  useEffect(() => {
    if (!showSuccessBanner) return;
    const timer = setTimeout(() => setShowSuccessBanner(false), 60000);
    return () => clearTimeout(timer);
  }, [showSuccessBanner]);

  if (loading) {
    return <div className="p-6 text-white">Loading your dashboard...</div>;
  }

  const firstName = user?.user_metadata?.firstName || '';
  const lastName = user?.user_metadata?.lastName || '';
  const gender = user?.user_metadata?.gender?.toLowerCase();
  const title = gender === 'female' ? 'Mrs.' : 'Mr.';
  const displayName = `${title} ${lastName || firstName || 'Guest'}`;
  const email = user?.email;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Good morning';
    if (hour < 18) return '☀️ Good afternoon';
    return '🌙 Good evening';
  };

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ✅ Success Banner */}
        {showSuccessBanner && (
          <div className="mb-4 flex items-center justify-between rounded bg-emerald-700/30 border border-emerald-400 px-4 py-3 text-emerald-100">
            <span>
              🎉 You’ve successfully upgraded to <strong>WeGoLiveToday +</strong>!
            </span>
            <button
              className="text-emerald-200 hover:text-white ml-4"
              onClick={() => setShowSuccessBanner(false)}
            >
              ✖
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {/* 👇 Icon added beside greeting */}
            <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
              <Image
                src="/favicon.ico" // change to '/wgl-bolt.png' if you prefer your PNG
                alt="WeGoLiveToday"
                width={20}
                height={20}
                priority
                className="inline-block"
              />
              {getGreeting()}, {displayName}
            </h1>

            <p className="mt-1 text-sm text-zinc-400">{email}</p>
            <p className="mt-1 text-md font-semibold text-emerald-400">
              {isPro ? 'WeGoLiveToday +' : 'WeGoLiveToday'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <TokenBadge />
            <AdultContentToggle />

            <Link
              href="/creators/apply"
              className="btn btn-ghost border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/70"
            >
              Become a Streamer
            </Link>

            <Link href="/tokens" className="btn btn-primary">
              Purchase Tokens
            </Link>

            <UpgradeModal />
            <LogoutButton />
          </div>
        </div>

        {/* Pro Feature Notice */}
        {!isPro ? (
          <div className="mt-6 p-4 border border-yellow-600 rounded bg-yellow-900/30 text-yellow-300">
            Some features are locked. Upgrade to unlock better video quality, unlimited texting,
            colored names, profile banners, and more.
          </div>
        ) : (
          <div className="mt-6 p-4 border border-emerald-500 rounded bg-emerald-900/20 text-emerald-200">
            ✅ Pro Features Unlocked! Enjoy 1080p video, unlimited chat, profile banners, and more.
          </div>
        )}

        {/* 🔒 Hidden Pro Features (Visible if Pro) */}
        {isPro && (
          <section className="mt-6">
            <div className="rounded bg-zinc-800/50 p-4 text-white border border-zinc-700">
              <h2 className="text-lg font-semibold mb-2">💎 Exclusive Pro Dashboard</h2>
              <ul className="list-disc pl-5 text-sm text-zinc-300 space-y-1">
                <li>Stream in up to 1080p resolution</li>
                <li>Unlimited chat & no cooldown</li>
                <li>Colored name customization</li>
                <li>Profile banner feature</li>
                <li>Priority placement on homepage</li>
              </ul>
            </div>
          </section>
        )}

        {/* 🧪 Mock Live Stream Card */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Featured Live</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/live/demo"
              className="group relative rounded overflow-hidden border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-all"
            >
              <div className="aspect-video bg-black flex items-center justify-center text-zinc-400 text-sm">
                🔴 LIVE - Creator_Miles
              </div>
              <div className="p-3 text-white">
                <h3 className="font-semibold text-base">Late Night Chat & Chill</h3>
                <p className="text-xs text-zinc-400">Streaming Now • 120 viewers</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Chat Component (Pro unlockable) */}
        <ChatInput isPro={isPro} />

        {/* Browse All Streams */}
        <section className="mt-8">
          <DashboardBrowse initialStreams={[]} />
        </section>
      </div>
    </main>
  );
}
