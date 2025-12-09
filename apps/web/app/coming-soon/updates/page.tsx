// apps/web/app/coming-soon/updates/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function ComingSoonUpdates() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      const email = localStorage.getItem('waitlist_email');
      const name = localStorage.getItem('waitlist_name');

      if (name) setUserName(name);

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
      <div className="max-w-2xl w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-8 animate-fade-in">

        {/* Welcome user if name available */}
        {userName && (
          <p className="text-xl text-emerald-400 font-semibold mb-2">
            👋 Welcome back, {userName.split(' ')[0]}!
          </p>
        )}

        <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 text-emerald-400">
          🚀 WeGoLiveToday Updates
        </h1>

        <p className="text-zinc-400 mb-6 text-base sm:text-lg">
          You're officially on the inside. Here's what we're building just for you:
        </p>

        <ul className="space-y-5 text-zinc-300 list-disc list-inside">
          <li className="transition-all duration-300 hover:translate-x-1 hover:text-white">
            ✅ Finalizing <span className="text-white font-medium">Stream Manager</span> core components
          </li>
          <li className="transition-all duration-300 hover:translate-x-1 hover:text-white">
            🎨 Designing the <span className="text-white font-medium">Creator Dashboard</span> to streamline your tools
          </li>
          <li className="transition-all duration-300 hover:translate-x-1 hover:text-white">
            📢 Launching <span className="text-white font-medium">Closed Alpha Testing in Q3 2025</span>
          </li>
          <li className="transition-all duration-300 hover:translate-x-1 hover:text-white">
            💬 Feedback system launching so you can help shape the platform
          </li>
        </ul>

        <div className="mt-10 text-center">
          <button
            onClick={() => router.push('/coming-soon')}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-md transition border border-zinc-700 hover:border-emerald-500"
          >
            ← Back to Coming Soon
          </button>
        </div>
      </div>
    </main>
  );
}
