'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TrackView from '@/components/Trackview';

export default function ComingSoon() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [idea, setIdea] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  // Admin unlock state
  const [typedAdmin, setTypedAdmin] = useState('');
  const [showAdminButton, setShowAdminButton] = useState(false);

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '';

  // Watch the typed characters — reveal admin button when matched
  useEffect(() => {
    if (typedAdmin === ADMIN_PASSWORD && ADMIN_PASSWORD.length > 0) {
      setShowAdminButton(true);
    } else {
      setShowAdminButton(false);
    }
  }, [typedAdmin, ADMIN_PASSWORD]);

  const handleEmailInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Prevent paste unlock
    if (e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === 'insertFromPaste') {
      setEmail('');
      return;
    }

    setEmail(value);
    setTypedAdmin(value);
  };

  const goToAdmin = () => {
    router.push('/admin/(protected)/page');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);

    try {
      const res = await fetch('https://formspree.io/f/xdkqdzpb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ name, email, idea }),
      });

      if (res.ok) {
        setSubmitted(true);
        setName('');
        setEmail('');
        setIdea('');
        setTypedAdmin('');
      } else {
        throw new Error('Form submission failed');
      }
    } catch (err) {
      console.error(err);
      setError(true);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black text-white text-center px-4">
      <div className="max-w-xl w-full">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
          <span className="text-emerald-400">WeGoLiveToday</span> is Launching in 2026!
        </h1>

        <p className="text-zinc-400 text-lg mb-6">
          Where creators shine, and fans fuel the spotlight.  
          This is **WeGoLiveToday** — the future of streaming starts now.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <a
            href="#notify"
            className="inline-block rounded border border-zinc-700 px-6 py-2 text-zinc-300 hover:bg-zinc-800 transition"
          >
            Learn More
          </a>
        </div>

        {/* ──────────────── Form ──────────────── */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center justify-center gap-3 mb-6"
        >
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          />

          <input
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={handleEmailInput}
            className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <textarea
            placeholder="Have an idea? Drop it here (optional)"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          />

          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-md transition w-full sm:w-auto"
          >
            {submitted ? '✓ Submitted!' : 'Notify Me'}
          </button>
        </form>

        {submitted && (
          <p className="text-sm text-emerald-400 mb-4">
            Thanks for joining the waitlist! We'll keep you posted.
          </p>
        )}
        {error && (
          <p className="text-sm text-red-400 mb-4">Something went wrong. Please try again.</p>
        )}

        {/* ──────────────── Hidden Admin Button ──────────────── */}
        {showAdminButton && (
          <button
            onClick={goToAdmin}
            className="mt-4 text-sm px-4 py-2 rounded bg-red-600 hover:bg-red-700 transition shadow-md animate-pulse"
          >
            🔐 Admin Access
          </button>
        )}

        <p className="text-sm text-zinc-600 mt-10">
          &copy; {new Date().getFullYear()} WeGoLiveToday Inc. All rights reserved.
        </p>
      </div>
    </main>
  );
}
