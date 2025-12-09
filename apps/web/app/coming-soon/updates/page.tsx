'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function ComingSoonUpdates() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  // 🔍 Check Access + Load User Name
  useEffect(() => {
    const checkAccess = async () => {
      const email = localStorage.getItem('waitlist_email');
      if (!email) return router.push('/coming-soon');

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('notify_signups')
        .select('id, name')
        .eq('email', email)
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
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white px-4 py-12 flex justify-center">
      <div className="max-w-3xl w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl p-8 animate-fade-in">

        {/* 🎉 Personalized Welcome Section */}
        <h1 className="text-3xl md:text-4xl font-bold text-emerald-400 mb-3">
          You’re in 🎉 {userName && <span className="text-white">Welcome, {userName}!</span>}
        </h1>

        <p className="text-zinc-300 text-lg mb-6 leading-relaxed">
          You're officially in early access for <strong>We Go Live Today</strong>.  
          This space gives you first-look access to what we're building — before anyone else sees it.
        </p>


        {/* ============================
            ROADMAP – NOW / NEXT / LATER
        ============================ */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">🛠 Roadmap Overview</h2>

          <div className="grid md:grid-cols-3 gap-6 text-zinc-300 text-sm">

            <div>
              <h3 className="text-white font-medium mb-1">🔧 Building Now</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Creator profiles</li>
                <li>Basic go‑live flow</li>
                <li>Viewer watch page + chat</li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-1">⏭ Up Next</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Streamer Customization Page</li>
                <li>Go‑live notifications</li>
                <li>Creator analytics</li>
                <li>Instant payment processing</li>

              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-1">💡 Later Ideas</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Collab streams</li>
                <li>Tipping & support tools</li>
                <li>Mobile app</li>
              </ul>
            </div>

          </div>
        </div>


        {/* ============================
            WHAT IS WGLT
        ============================ */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-2">📺 What is We Go Live Today?</h2>

          <p className="text-zinc-400 text-sm leading-relaxed">
            We Go Live Today is a streaming platform built around what’s happening <strong>right now</strong>.
            Instead of digging through old VODs, viewers discover live events happening today — with creators
            getting tools focused on growth, visibility, and daily engagement.
          </p>
        </div>


{/* ============================ 
    FEEDBACK SECTION
============================ */}
<div className="mb-12">
  <h2 className="text-xl font-semibold text-white mb-2">💬 Help Shape This</h2>

  <p className="text-zinc-400 text-sm mb-4">
    Tell us what you'd love to see built. We'll get your feedback directly!
  </p>

  <form
    onSubmit={async (e) => {
      e.preventDefault();
      const input = (document.getElementById('feedback') as HTMLTextAreaElement).value;

      if (!input.trim()) return;

      const res = await fetch('/api/send-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (res.ok) {
        alert('✅ Feedback sent! Thanks for helping shape this.');
        (document.getElementById('feedback') as HTMLTextAreaElement).value = '';
      } else {
        alert('❌ Failed to send feedback. Please try again later.');
      }
    }}
    className="space-y-4"
  >
    <textarea
      id="feedback"
      required
      placeholder="Type your idea or suggestion here..."
      rows={4}
      className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
    />

    <button
      type="submit"
      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-md transition"
    >
      ✉️ Send Feedback
    </button>
  </form>
</div>



        {/* ============================
            BACK BUTTON
        ============================ */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push('/coming-soon')}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md transition"
          >
            ← Back to Coming Soon
          </button>
        </div>

      </div>
    </main>
  );
}
