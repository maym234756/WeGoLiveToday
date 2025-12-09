'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TrackView from '@/components/TrackView';
import { createClient } from '@supabase/supabase-js';

export default function ComingSoon() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [idea, setIdea] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [showEmail, setShowEmail] = useState(true);


  // 🔥 Supabase Client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Show Admin button if email matches password bypass
  useEffect(() => {
    if (email === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setShowAdminButton(true);
    } else {
      setShowAdminButton(false);
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    try {
      // 🌍 Collect geo-data
      const geoRes = await fetch('https://ipapi.co/json/');
      const geoData = await geoRes.json();
      const country = geoData?.country_name || 'Unknown';

      // Log form submission event
      await fetch('/api/viewer-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: '/coming-soon',
          user_agent: window.navigator.userAgent,
          type: 'form_submission',
          location: country,
        }),
      });

      // 🔐 Admin Login Bypass
      if (email === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
        router.push('/admin/(protected)/page');
        return;
      }

      // 🚀 Insert into Supabase waitlist table
      const { error: insertError } = await supabase.from('notify_signups').insert([
        {
          name: name || null,
          email,
          comment: idea || null,
          location: country,
          created_at: new Date().toISOString(),
        },
      ]);



      if (insertError) {
        console.error('Supabase Insert Error:', insertError);
        throw new Error('Failed to save to database');
      }

      // Success
      setSubmitted(true);
      setName('');
      setEmail('');
      setIdea('');

      localStorage.setItem('waitlist_email', email);


    } catch (err) {
      console.error('Form error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black text-white text-center px-4">
      <div className="max-w-xl w-full animate-fade-in">

        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
          <span className="text-emerald-400">WeGoLiveToday</span> is Launching in 2026!
        </h1>

        <p className="text-zinc-400 text-lg mb-6">
          Where creators shine, and fans fuel the spotlight. The future of streaming starts now.
        </p>

        <p className="text-zinc-400 text-lg mb-6">
          Don’t miss what’s coming next!
            Join the free update list, and you’ll instantly unlock the arrow icon that leads to our upcoming features and announcements page.
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center justify-center gap-3 mb-6"
          aria-label="Notify Form"
        >
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none"
          />

      {showEmail && (
        <input
          type="email"
          placeholder="Enter your email (optional)"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      )}


          <textarea
            placeholder="Comment here (optional)"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none"
          />

      <div className="flex items-center gap-2 mt-2">
        <button
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-md transition w-full sm:w-auto disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Submitting...' : submitted ? '✓ Submitted!' : 'Notify Me - New Updates'}
        </button>

        {(submitted || typeof window !== 'undefined' && localStorage.getItem('waitlist_email')) && (
          <button
            onClick={() => router.push('/coming-soon/updates')}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md transition"
          >
            ➡️
          </button>
        )}
      </div>

        </form>

        {showAdminButton && (
          <button
            onClick={() => router.push('/admin/(protected)/page')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md mb-4 transition"
          >
            🔐 Go to Admin Panel
          </button>
        )}

        {submitted && (
          <p className="text-sm text-emerald-400 mb-4 animate-pulse">
            Thanks for joining the waitlist! We'll keep you posted.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400 mb-4">
            Something went wrong. Please try again.
          </p>
        )}

        <p className="text-sm text-zinc-600">
          &copy; {new Date().getFullYear()} WeGoLiveToday Inc. All rights reserved.
        </p>
      </div>
    </main>
  );
}
