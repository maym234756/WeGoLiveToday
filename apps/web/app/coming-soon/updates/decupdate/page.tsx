'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import CountdownTimer from '@/components/CountdownTimer';
import { motion } from 'framer-motion';
import GoBackButton from '@/components/GoBackButton';


export default function DecemberUpdatePage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  const launchProgress = 28;

  useEffect(() => {
    const checkAccess = async () => {
      const storedName = localStorage.getItem('waitlist_name');
      if (!storedName) return router.push('/coming-soon');

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('notify_signups')
        .select('id, name')
        .eq('name', storedName)
        .single();

      if (data && !error) {
        setAuthorized(true);
        setUserName(data.name || '');
      } else {
        router.push('/coming-soon');
      }

      setLoading(false);
    };

    checkAccess();
  }, [router]);

  if (loading || !authorized) return null;

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white px-4 py-12 flex justify-center"
      initial={{ rotateY: -90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      exit={{ rotateY: 90, opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="max-w-3xl w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl p-8 animate-fade-in">

        {/* 🎉 Welcome Header */}
        <h1 className="text-3xl md:text-4xl font-bold text-emerald-400 mb-3">
          December 2025 Update 🎉 {userName && <span className="text-white">Welcome back, {userName}!</span>}
        </h1>

        <p className="text-zinc-300 text-lg mb-6 leading-relaxed">
          You're viewing the latest update for <strong>We Go Live Today</strong> — launching December 31, 2025.
          Here's a preview of what’s new, what’s shipped, and what’s coming next.
        </p>

        {/* 📢 Update Highlights */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">📢 Update Highlights</h2>
          <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
            <li>🎨 Streaming Customization Page (Mobile + Desktop)</li>
            <li>🔔 Go Live Notifications</li>
            <li>📊 Creator Analytics (KPI, Trends, Metrics)</li>
            <li>💸 Instant Payment Processing (Multi-platform & smoother payouts)</li>
          </ul>
        </div>

        {/* ✅ Launched So Far */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">✅ What’s Been Launched</h2>
          <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
            <li>⚙️ Platform Skeleton</li>
            <li>👤 Creator Profiles</li>
            <li>🔴 Go Live Feature (with live tools)</li>
            <li>💬 Live Chat</li>
            <li>🔐 Login Page</li>
            <li>🆕 Signup Page</li>
          </ul>
        </div>

        {/* 🛠 Updated Roadmap */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">🛠 Updated Roadmap</h2>
          <div className="grid md:grid-cols-3 gap-6 text-zinc-300 text-sm">
            <div>
              <h3 className="text-white font-medium mb-1">🔧 Building Now</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>1v1 Collaboration Streaming</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">⏭ Up Next</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Scheduled Streaming</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">💡 Later Ideas</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Tipping & Support Tools</li>
              </ul>
            </div>
          </div>
        </div>

        <CountdownTimer
          targetDate="2025-02-04T00:00:00"
          startCountdownOn="2024-12-31T00:00:00"
        />


        {/* 📊 Launch Progress Bar */}
        <div className="mb-10">
          <h2 className="text-sm text-zinc-400 mb-2 text-center">Progress Toward Launch</h2>
          <div className="w-full bg-zinc-800 h-4 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-700 ease-in-out"
              style={{ width: `${launchProgress}%` }}
            ></div>
          </div>
          <p className="text-center text-sm mt-2 text-zinc-400">{launchProgress}% complete</p>
        </div>

        {/* ℹ️ Footer Disclaimer */}
        <p className="text-center text-xs text-zinc-500 mt-6">
          Note: These updates represent only a portion of what we’re building. More will be revealed soon.
        </p>

        <GoBackButton />


        {/* Back Button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => router.push('/coming-soon')}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md transition"
          >
            ← Back to Coming Soon
          </button>
        </div>
      </div>
    </motion.main>
  );
}
