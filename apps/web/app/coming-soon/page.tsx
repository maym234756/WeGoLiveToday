'use client';

import { useState } from 'react';

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 🔐 Hook this up to your backend or a service like Resend, Formspree, or Mailchimp
    setSubmitted(true);
    setEmail('');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black text-white text-center px-4">
      <div className="max-w-xl w-full">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
          🚀 <span className="text-emerald-400">WeGoLive</span> is Launching in 2026!
        </h1>

        <p className="text-zinc-400 text-lg mb-6">
          We’re building the future of live entertainment. Join us on the journey — early access, behind-the-scenes, and more.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <a
            href="/coming-soon"
            className="inline-block rounded bg-emerald-500 px-6 py-2 text-white hover:bg-emerald-600 transition"
          >
          </a>

          <a
            href="#notify"
            className="inline-block rounded border border-zinc-700 px-6 py-2 text-zinc-300 hover:bg-zinc-800 transition"
          >
            Learn More
          </a>
        </div>

        {/* Email Notify Signup */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6"
        >
          <input
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-md transition"
          >
            {submitted ? '✓ Subscribed' : 'Notify Me'}
          </button>
        </form>

        {submitted && (
          <p className="text-sm text-emerald-400 mb-4">
            You’ll be the first to know when we launch!
          </p>
        )}

        <p className="text-sm text-zinc-600">
          &copy; {new Date().getFullYear()} WeGoLiveToday Inc. All rights reserved.
        </p>
      </div>
    </main>
  );
}
