'use client';

import Link from 'next/link';
import type { Metadata } from 'next';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Sign in · WeGoLive',
};

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  /** 🔑 Handle login */
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  const form = e.currentTarget;
  const data = new FormData(form);

  const email = String(data.get('email') || '');
  const password = String(data.get('password') || '');

  // Step 1: Sign in the user
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    setError(signInError.message);
    setLoading(false);
    return;
  }

  // Step 2: Get the user info
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    setError(userError?.message || 'User not found after login.');
    setLoading(false);
    return;
  }

  // Step 3: Redirect to dynamic dashboard
  const userId = userData.user.id;
  window.location.href = `/dashboard/${userId}`;
};


  return (
    <main className="min-h-[calc(100vh-0px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 shadow-xl">

        {/* Brand */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-lg font-semibold tracking-tight text-white">WeGoLive</span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-400">Sign in to your account</p>
        </div>

        {/* SIGN IN FORM */}
        <form onSubmit={onSubmit} className="space-y-4" aria-label="Sign-in form">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-zinc-300">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm text-zinc-300">Password</label>
              <Link href="/forgot" className="text-sm text-emerald-400 hover:text-emerald-300">
                Forgot?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500" />
            Remember me
          </label>

          {/* ERROR MESSAGE */}
          {error && <p className="text-sm text-rose-400">{error}</p>}

          {/* SIGN IN BUTTON */}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Secondary actions */}
        <div className="mt-6 space-y-3 text-center text-sm">
          <p className="text-zinc-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-emerald-400 hover:text-emerald-300">
              Create account
            </Link>
          </p>

          <Link
            href="/dashboard?guest=true"
            prefetch
            className="inline-flex w-full items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 hover:bg-zinc-800/70"
          >
            Continue as guest
            <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </Link>

          
        </div>
      </div>
    </main>
  );
}
