'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff, FiLoader } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

function safeNextUrl(nextUrl?: string) {
  // Only allow internal paths
  if (!nextUrl) return null;
  if (typeof nextUrl !== 'string') return null;
  if (!nextUrl.startsWith('/')) return null;
  if (nextUrl.startsWith('//')) return null;
  return nextUrl;
}

export default function LoginForm({ nextUrl }: { nextUrl?: string }) {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextSafe = useMemo(() => safeNextUrl(nextUrl), [nextUrl]);

  // Load remembered email
  useEffect(() => {
    try {
      const remembered = localStorage.getItem('wegolive.login.remember') === 'true';
      const savedEmail = localStorage.getItem('wegolive.login.email') || '';
      setRemember(remembered || savedEmail.length > 0);
      if (savedEmail) setEmail(savedEmail);
    } catch {
      /* no-op */
    }
  }, []);

  // Persist remember choice + email
  useEffect(() => {
    try {
      localStorage.setItem('wegolive.login.remember', String(remember));
      if (remember) localStorage.setItem('wegolive.login.email', email);
      else localStorage.removeItem('wegolive.login.email');
    } catch {
      /* no-op */
    }
  }, [remember, email]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    const cleanEmail = email.trim();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setError(userError?.message || 'User not found after login.');
        return;
      }

      const userId = userData.user.id;
      const destination = nextSafe ?? `/dashboard/${userId}`;

      router.replace(destination);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 shadow-2xl backdrop-blur">
        <div className="p-6 sm:p-7">
          {/* Brand */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold tracking-tight text-zinc-200">WeGoLive</span>
            </div>

            <h1 className="mt-4 text-2xl font-semibold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-zinc-400">Sign in to your creator dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="mt-6 space-y-4" aria-label="Sign-in form">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm text-zinc-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm text-zinc-300">
                  Password
                </label>
                <Link href="/forgot" className="text-sm text-emerald-400 hover:text-emerald-300">
                  Forgot?
                </Link>
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock((e as any).getModifierState?.('CapsLock') ?? false)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 pr-11 text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
                />

                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-2 inline-flex items-center justify-center rounded-md px-2 text-zinc-400 hover:text-zinc-200"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {capsLock && (
                <div className="text-xs text-amber-300">
                  Caps Lock is on.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                />
                Remember me
              </label>

              <Link
                href="/signup"
                className="text-sm text-zinc-300 hover:text-white"
              >
                New here? <span className="text-emerald-400">Create account</span>
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {loading ? <FiLoader className="animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            {/* Guest */}
            <Link
              href={nextSafe ?? '/dashboard/guest'}
              className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/50"
            >
              Continue as guest →
            </Link>

            <p className="text-center text-xs text-zinc-500">
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
