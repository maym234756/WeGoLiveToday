'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function ComingSoon() {
  const router = useRouter();

  // FORM STATE
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [idea, setIdea] = useState('');

  // UI STATE
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdminButton, setShowAdminButton] = useState(false);

  // Name-check logic
  const [checkingName, setCheckingName] = useState(false);
  const [nameChecked, setNameChecked] = useState(false);
  const [showSignupFields, setShowSignupFields] = useState(true);

  // 🔥 Supabase Client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load stored values from localStorage
  useEffect(() => {
    const storedName = localStorage.getItem('waitlist_name');
    const storedEmail = localStorage.getItem('waitlist_email');

    if (storedName) {
      setName(storedName);
      checkNameInSupabase(storedName);
    }

    if (storedEmail) {
      setEmail(storedEmail);
      setSubmitted(true);
    }
  }, []);

  // Admin Button Logic
  useEffect(() => {
    setShowAdminButton(email === process.env.NEXT_PUBLIC_ADMIN_PASSWORD);
  }, [email]);

  // 🔍 Check if user name exists in Supabase
  const checkNameInSupabase = async (inputName?: string) => {
    const checkName = (inputName ?? name).trim();
    if (!checkName) return;

    setCheckingName(true);

    const { data, error } = await supabase
      .from('notify_signups')
      .select('id')
      .ilike('name', checkName); // case-insensitive

    // If user already exists → show arrow
    if (data && data.length > 0) {
      setSubmitted(true);
      setShowSignupFields(false);
      localStorage.setItem('waitlist_name', checkName);
    } else {
      setSubmitted(false);
      setShowSignupFields(true);
    }

    setNameChecked(true);
    setCheckingName(false);
  };

  // ON SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    try {
      // 🌍 Get location
      const geoRes = await fetch('https://ipapi.co/json/');
      const geoData = await geoRes.json();
      const country = geoData?.country_name || 'Unknown';

      // Admin redirect
      if (email === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
        router.push('/admin/(protected)/page');
        return;
      }

      // Save new signup
      const { error: insertError } = await supabase.from('notify_signups').insert([
        {
          name,
          email: email || null,
          comment: idea || null,
          location: country,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        console.error('Supabase Insert Error:', insertError);
        throw new Error('Could not save to Supabase');
      }

      // Success
      localStorage.setItem('waitlist_name', name);
      if (email) localStorage.setItem('waitlist_email', email);

      setSubmitted(true);
      setShowSignupFields(false);
      setIdea('');

    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center 
      bg-gradient-to-br from-black via-zinc-900 to-black text-white text-center px-4">
      <div className="max-w-xl w-full animate-fade-in">

        {/* TITLE */}
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4 leading-tight break-words text-balance">
          <span className="text-emerald-400 block">WeGoLiveToday</span>
          <span className="block">is Launching in 2026!</span>
        </h1>


        {/* WELCOME USER */}
        {nameChecked && submitted && name && (
          <p className="text-xl font-semibold text-emerald-400 mb-2 animate-pulse">
            Welcome back, {name}! 👋
          </p>
        )}

        <p className="text-zinc-400 text-lg mb-6">
          Join the free update list and unlock exclusive behind-the-scenes features.
        </p>

        <ol className="text-zinc-400 text-left text-base mb-6 space-y-2 list-decimal list-inside">
          <li>
            <span className="font-semibold text-white">Enter your name</span> – We'll check if you're already on the list.
          </li>
          <li>
            <span className="font-semibold text-white">Not on the list?</span> Add your name, email (optional), and a quick comment if you'd like.
          </li>
          <li>
            <span className="font-semibold text-white">You're in!</span> Once subscribed, an arrow ➡️ will appear giving you access to future updates.
          </li>
        </ol>


        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">

          {/* NAME */}
          <div className="flex gap-2 w-full">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white placeholder-zinc-500"
            />

            <button
              type="button"
              onClick={() => checkNameInSupabase()}
              disabled={!name || checkingName}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md"
            >
              {checkingName ? '...' : 'Check'}
            </button>
          </div>

          {/* ONLY SHOW EMAIL + COMMENT IF USER NOT FOUND */}
          {showSignupFields && (
            <>
              <input
                type="email"
                placeholder="Enter your email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white"
              />

              <textarea
                placeholder="Comment (optional)"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white"
              />

              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 mt-2 rounded-md"
              >
                {loading ? 'Submitting...' : 'Notify Me – New Updates'}
              </button>
            </>
          )}

        <p className="text-zinc-400 text-lg mb-6 break-words">
          See any Issues? Email us @ <span className="break-all">teamwegolivetoday@yahoo.com</span>
        </p>


          {/* ARROW BUTTON (AUTHORIZED USER) */}
          {submitted && (
            <button
              type="button"
              onClick={() => router.push('/coming-soon/updates')}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md mt-2"
            >
              ➡️
            </button>
          )}
        </form>

        {/* ADMIN BUTTON */}
        {showAdminButton && (
          <button
            onClick={() => router.push('/admin/(protected)/page')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md mb-4"
          >
            🔐 Admin Panel
          </button>
        )}

        {/* ERROR */}
        {error && (
          <p className="text-red-400 text-sm">Something went wrong. Try again.</p>
        )}

        <p className="text-sm text-zinc-600 mt-6">
          &copy; {new Date().getFullYear()} WeGoLiveToday Inc.
        </p>
      </div>
    </main>
  );
}
