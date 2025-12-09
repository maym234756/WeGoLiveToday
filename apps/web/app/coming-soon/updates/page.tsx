'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function ComingSoonUpdates() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
        .select('id')
        .eq('email', email)
        .single();

      if (data && !error) {
        setAuthorized(true);
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
      <div className="max-w-3xl w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-lg p-8 animate-fade-in">

        {/* 🎉 Welcome Block */}
        <h1 className="text-3xl md:text-4xl font-bold text-emerald-400 mb-2">
          You’re in 🎉
        </h1>
        <p className="text-zinc-300 text-lg mb-6">
          Welcome to early access for <strong>We Go Live Today</strong>.<br />
          This is where we’ll share what we’re building — before anyone else sees it.
        </p>

        {/* 📌 Right now / Next / Later Roadmap */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">🛠 Roadmap Overview</h2>

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
                <li>Follow / favorite creators</li>
                <li>Notifications when someone goes live</li>
                <li>Basic analytics for creators</li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-1">💡 Later Ideas</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Collab streams</li>
                <li>Tipping / support</li>
                <li>Mobile app</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 📢 What is WGLT */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">📺 What is We Go Live Today?</h2>
          <p className="text-zinc-400 text-sm">
            We Go Live Today is a streaming platform focused on what’s happening <strong>right now</strong>.
            Instead of digging through old VODs, viewers see what’s live today — and creators get tools built for frequent streaming and discovery.
          </p>
        </div>

        {/* 📬 Call for Feedback */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-2">💬 Help Shape This</h2>
          <p className="text-zinc-400 text-sm mb-2">
            Are you a creator, viewer, or both? We'd love to hear from you.
          </p>
          <p className="text-zinc-400 text-sm">
            Just reply to the welcome email and let us know:
            <br />– What you stream or love to watch
            <br />– One thing you wish other platforms did better
          </p>
        </div>

        {/* 🔙 Back Button */}
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
