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
      const email = localStorage.getItem('waitlist_email'); // 👈 pulled from localStorage

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

  if (loading) return null;
  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">🚧 Coming Soon Updates</h1>
      <p className="text-zinc-400">
        Thanks for signing up! You’re now seeing exclusive behind-the-scenes info.
      </p>

      {/* Replace below with your real updates */}
      <ul className="mt-6 list-disc list-inside space-y-2 text-zinc-300">
        <li>✅ Finalizing Stream Manager core components</li>
        <li>🎨 Working on Creator Dashboard design</li>
        <li>📢 Closed Alpha Testing starts Q3 2025</li>
      </ul>
    </main>
  );
}
