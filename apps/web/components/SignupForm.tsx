//apps/web/components/SignupForm.tsx

'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FiArrowRight, FiCheckCircle, FiMail, FiUser, FiLock } from 'react-icons/fi';

function cx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(' ');
}

export default function SignupForm() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emailRedirectTo = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return `${window.location.origin}/auth/callback`;
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const name = displayName.trim();
    if (!name) return setError('Please enter a display name.');
    if (!email.trim()) return setError('Please enter an email.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');

    setBusy(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo,
        data: { display_name: name },
      },
    });

    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmations are ON, session is usually null here.
    if (!data.session) {
      setNotice('Check your email to confirm your account, then you’ll be redirected back here.');
      return;
    }

    // If confirmations are OFF, go straight in.
    router.push(`/dashboard/${data.user?.id}`);
  }

  const strength = useMemo(() => {
    const p = password;
    const checks = [
      p.length >= 8,
      /[A-Z]/.test(p),
      /[0-9]/.test(p),
      /[^A-Za-z0-9]/.test(p),
    ];
    const score = checks.filter(Boolean).length; // 0..4
    const label = score <= 1 ? 'Weak' : score === 2 ? 'Okay' : score === 3 ? 'Good' : 'Strong';
    return { score, label, checks };
  }, [password]);

  return (
    <div className="w-full min-w-0">
      <div className="mx-auto w-full max-w-lg">
        {/* Shell */}
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black shadow-[0_0_0_1px_rgba(255,255,255,0.02)] overflow-hidden">
          {/* Header */}
          <div className="px-5 sm:px-7 py-6 border-b border-zinc-800/80">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-white">Create your account</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Start streaming in minutes. Your creator dashboard is ready when you are.
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                WeGoLiveToday
              </span>
            </div>

            {/* Micro benefits */}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Badge>Safe-by-default</Badge>
              <Badge>Fast onboarding</Badge>
              <Badge>Creator tools built-in</Badge>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 sm:px-7 py-6">
            {error && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <div className="font-medium mb-1">Something needs attention</div>
                <div className="text-rose-200/90">{error}</div>
              </div>
            )}

            {notice && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <div className="font-medium mb-1">Almost there</div>
                <div className="text-emerald-200/90">{notice}</div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Display name" hint="This is what viewers will see.">
                <InputShell icon={<FiUser className="text-zinc-400" />}>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full min-w-0 bg-transparent px-3 py-2.5 outline-none placeholder:text-zinc-600"
                    placeholder="Your name"
                    autoComplete="nickname"
                  />
                </InputShell>
              </Field>

              <Field label="Email" hint="Used for login and account security.">
                <InputShell icon={<FiMail className="text-zinc-400" />}>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-w-0 bg-transparent px-3 py-2.5 outline-none placeholder:text-zinc-600"
                    placeholder="you@email.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                </InputShell>
              </Field>

              <Field label="Password" hint="Use 8+ characters. Mix letters + numbers for best results.">
                <InputShell icon={<FiLock className="text-zinc-400" />}>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="w-full min-w-0 bg-transparent px-3 py-2.5 outline-none placeholder:text-zinc-600"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </InputShell>

                {/* Strength */}
                <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-zinc-400">Password strength</div>
                    <div className="text-xs text-zinc-300">{strength.label}</div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cx(
                          'h-1.5 flex-1 rounded-full',
                          strength.score >= i + 1 ? 'bg-emerald-500/80' : 'bg-zinc-800'
                        )}
                      />
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-400">
                    <Rule ok={strength.checks[0]} label="8+ chars" />
                    <Rule ok={strength.checks[1]} label="Uppercase" />
                    <Rule ok={strength.checks[2]} label="Number" />
                    <Rule ok={strength.checks[3]} label="Symbol" />
                  </div>
                </div>
              </Field>

              <button
                disabled={busy}
                className={cx(
                  'mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-0',
                  busy
                    ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                )}
              >
                {busy ? 'Creating…' : 'Create account'}
                {!busy && <FiArrowRight />}
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                <p className="text-xs text-zinc-500">
                  By continuing, you agree to our{' '}
                  <span className="text-zinc-300">Terms</span> and{' '}
                  <span className="text-zinc-300">Privacy</span>.
                </p>

                <Link
                  href="/login"
                  className="text-xs text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1"
                >
                  Already have an account? <span className="underline underline-offset-2">Sign in</span>
                </Link>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-7 py-4 border-t border-zinc-800/80 bg-zinc-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <FiCheckCircle className="text-emerald-400" />
                Account creation is secured by Supabase Auth
              </span>
              <span>Tip: Press Tab to move between fields</span>
            </div>
          </div>
        </div>

        {/* Tiny note below card */}
        <div className="mt-3 text-center text-xs text-zinc-600">
          Need help? Open the <span className="text-zinc-400">Knowledge Base</span> once you’re in.
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <div className="flex items-end justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-200">{label}</div>
          {hint && <div className="mt-0.5 text-xs text-zinc-500 break-words">{hint}</div>}
        </div>
      </div>
      <div className="mt-2 min-w-0">{children}</div>
    </label>
  );
}

function InputShell({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center rounded-xl border border-zinc-800 bg-black/40 focus-within:border-emerald-600 transition min-w-0">
      <div className="pl-3">{icon}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-zinc-300">
      {children}
    </span>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={cx(
          'h-4 w-4 rounded-full border grid place-items-center',
          ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-500'
        )}
        aria-hidden
      >
        {ok ? <FiCheckCircle className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <span className={cx('text-xs', ok ? 'text-emerald-200' : 'text-zinc-400')}>{label}</span>
    </div>
  );
}
