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

      if (!email) {
        router.push('/coming-soon');
        return;
      }

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
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-lg p-8 animate-fade-in">
        <h1 className="text-4xl font-extrabold mb-4 text-emerald-400">
          🚀 WeGoLiveToday Updates
        </h1>

        <p className="text-zinc-400 mb-6">
          Thanks for signing up! You're officially on the inside. Here's a peek at what's coming.
        </p>

        <ul className="space-y-4 text-zinc-300 list-disc list-inside">
          <li>✅ Finalizing <span className="text-white font-medium">Stream Manager</span> core components</li>
          <li>🎨 Designing the new <span className="text-white font-medium">Creator Dashboard</span></li>
          <li>📢 Closed Alpha Testing launches <span className="text-white font-medium">Q3 2025</span></li>
        </ul>

        <div className="mt-8">
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
