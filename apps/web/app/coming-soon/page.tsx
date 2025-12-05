'use client';

import { useState } from 'react';

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [idea, setIdea] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setSubmitted(false);

    try {
      const res = await fetch('https://formspree.io/f/xdkqdzpb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, message: idea }),
      });

      if (res.ok) {
        setSubmitted(true);
        setEmail('');
        setIdea('');
      } else {
        throw new Error('Failed to submit');
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
          🚀 <span className="text-emerald-400">WeGoLiveToday</span> is Launching in 2026!
        </h1>

        <p className="text-zinc-400 text-lg mb-6">
          We’re building the future of live entertainment. Share your ideas or sign up for updates!
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <a
            href="#notify"
            className="inline-block rounded border border-zinc-700 px-6 py-2 text-zinc-300 hover:bg-zinc-800 transition"
          >
            Learn More
          </a>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center justify-center gap-4 mb-6"
        >
          <input
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <textarea
            placeholder="Got an idea? Share it with us..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 rounded-md bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-md transition w-full"
          >
            {submitted ? '✓ Submitted' : 'Submit Idea & Notify Me'}
          </button>
        </form>

        {/* Alerts */}
        {submitted && (
          <p className="text-sm text-emerald-400 mb-4">
            Thank you! We'll keep you posted — and we’ll review your idea.
          </p>
        )}
        {error && (
          <p className="text-sm text-red-400 mb-4">
            Something went wrong. Please try again later.
          </p>
        )}

        <p className="text-sm text-zinc-600">
          &copy; {new Date().getFullYear()} WeGoLiveToday Inc. All rights reserved.
        </p>
      </div>
    </main>
  );
}
