// apps/web/components/LoginForm.tsx
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff, FiLoader, FiLock, FiKey } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

type AuthMode = 'face' | 'password';

function cx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(' ');
}

function safeNextUrl(nextUrl?: string) {
  if (!nextUrl) return null;
  if (typeof nextUrl !== 'string') return null;
  if (!nextUrl.startsWith('/')) return null;
  if (nextUrl.startsWith('//')) return null;
  return nextUrl;
}

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const smallWidth = window.innerWidth < 768;
  return coarse || smallWidth;
}

async function supportsPasskeys() {
  if (typeof window === 'undefined') return false;
  if (!(window as any).PublicKeyCredential) return false;

  // If available, this is the best “Face ID capable” signal we can get on the web.
  // (Not perfect, but very practical.)
  try {
    const available = await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
    return !!available;
  } catch {
    return false;
  }
}

/**
 * Minimal base64url helpers for WebAuthn payloads.
 * Your API routes can return base64url strings and we convert them here.
 */
function b64urlToBuf(b64url: string) {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const base64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return buf;
}
function bufToB64url(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export default function LoginForm({ nextUrl }: { nextUrl?: string }) {
  const router = useRouter();

  // Password flow
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  // Face ID (passkey) flow
  const [canFaceId, setCanFaceId] = useState(false);
  const [mode, setMode] = useState<AuthMode>('password');

  const [error, setError] = useState<string | null>(null);
  const [loadingPw, setLoadingPw] = useState(false);
  const [loadingFace, setLoadingFace] = useState(false);

  const nextSafe = useMemo(() => safeNextUrl(nextUrl), [nextUrl]);

  // Load remembered email/username
  useEffect(() => {
    try {
      const remembered = localStorage.getItem('wegolive.login.remember') === 'true';
      const saved = localStorage.getItem('wegolive.login.email') || '';
      setRemember(remembered || saved.length > 0);
      if (saved) setEmailOrUsername(saved);
    } catch {
      /* no-op */
    }
  }, []);

  // Persist remember choice + email/username
  useEffect(() => {
    try {
      localStorage.setItem('wegolive.login.remember', String(remember));
      if (remember) localStorage.setItem('wegolive.login.email', emailOrUsername);
      else localStorage.removeItem('wegolive.login.email');
    } catch {
      /* no-op */
    }
  }, [remember, emailOrUsername]);

  // Decide if Face ID tab should show (mobile + passkeys supported)
  useEffect(() => {
    let alive = true;

    async function init() {
      const mobile = isMobileDevice();
      const ok = mobile && (await supportsPasskeys());

      if (!alive) return;
      setCanFaceId(ok);
      setMode(ok ? 'face' : 'password');
    }

    init();

    const onResize = () => {
      // Keep it stable on rotation
      init();
    };

    window.addEventListener('resize', onResize);
    return () => {
      alive = false;
      window.removeEventListener('resize', onResize);
    };
  }, []);

  /**
   * PASSWORD LOGIN (existing Supabase flow)
   * If you truly mean "username" instead of email, you’ll need a lookup:
   * username -> email (or a custom auth flow). For now we keep it as email.
   */
  async function onSubmitPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loadingPw || loadingFace) return;

    setError(null);
    setLoadingPw(true);

    const clean = emailOrUsername.trim();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: clean,
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
      router.replace(nextSafe ?? `/dashboard/${userId}`);
      router.refresh();
    } finally {
      setLoadingPw(false);
    }
  }

  /**
   * FACE ID LOGIN (Passkey/WebAuthn)
   * This expects API endpoints that return WebAuthn options and verify them.
   *
   * You’ll implement:
   *  - POST /api/auth/passkey/login/start
   *  - POST /api/auth/passkey/login/finish
   */
  const onFaceId = useCallback(async () => {
    if (loadingPw || loadingFace) return;
    setError(null);
    setLoadingFace(true);

    try {
      // 1) Ask server for WebAuthn "get" options (challenge, rpId, allowCredentials, etc.)
      const startRes = await fetch('/api/auth/passkey/login/start', { method: 'POST' });
      if (!startRes.ok) throw new Error('Face ID login is not available yet.');
      const start = await startRes.json();

      // Expecting base64url strings from server
      const publicKey: PublicKeyCredentialRequestOptions = {
        ...start.publicKey,
        challenge: b64urlToBuf(start.publicKey.challenge),
        allowCredentials: (start.publicKey.allowCredentials || []).map((c: any) => ({
          ...c,
          id: b64urlToBuf(c.id),
        })),
      };

      // 2) Trigger Face ID (platform authenticator)
      const cred = (await navigator.credentials.get({
        publicKey,
      })) as PublicKeyCredential | null;

      if (!cred) throw new Error('Face ID was cancelled.');

      const res = cred.response as AuthenticatorAssertionResponse;

      // 3) Send assertion back to server for verification + session creation
      const finishRes = await fetch('/api/auth/passkey/login/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cred.id,
          rawId: bufToB64url(cred.rawId),
          type: cred.type,
          response: {
            clientDataJSON: bufToB64url(res.clientDataJSON),
            authenticatorData: bufToB64url(res.authenticatorData),
            signature: bufToB64url(res.signature),
            userHandle: res.userHandle ? bufToB64url(res.userHandle) : null,
          },
        }),
      });

      if (!finishRes.ok) {
        const msg = await finishRes.text().catch(() => '');
        throw new Error(msg || 'Face ID login failed.');
      }

      const finish = await finishRes.json();
      // finish should include userId OR redirect destination
      const destination = nextSafe ?? finish?.destination ?? `/dashboard/${finish?.userId ?? 'guest'}`;

      router.replace(destination);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Face ID login failed.');
    } finally {
      setLoadingFace(false);
    }
  }, [loadingPw, loadingFace, nextSafe, router]);

  return (
    <div className="w-full max-w-md min-w-0">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 shadow-2xl backdrop-blur min-w-0">
        <div className="p-5 sm:p-7 min-w-0">
          {/* Brand */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold tracking-tight text-zinc-200">WeGoLive</span>
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-zinc-400">Sign in to your creator dashboard</p>
          </div>

          {/* Mobile toggle (Face ID vs Password) */}
          {canFaceId && (
            <div className="mt-5">
              <div className="grid grid-cols-2 rounded-xl border border-zinc-800 bg-black p-1">
                <button
                  type="button"
                  onClick={() => setMode('face')}
                  className={cx(
                    'rounded-lg px-3 py-2 text-sm font-medium transition',
                    mode === 'face' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-200',
                  )}
                >
                  Face ID
                </button>
                <button
                  type="button"
                  onClick={() => setMode('password')}
                  className={cx(
                    'rounded-lg px-3 py-2 text-sm font-medium transition',
                    mode === 'password' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-200',
                  )}
                >
                  Password
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="mt-4 rounded-lg border border-rose-900/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200 break-words"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          {/* FACE ID MODE */}
          {canFaceId && mode === 'face' && (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-emerald-300">
                    <FiLock />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-100">WeGoLive Face ID</div>
                    <div className="text-xs text-zinc-400 break-words">
                      Fast sign-in using your device’s secure Face ID unlock (Passkeys).
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onFaceId}
                  disabled={loadingFace || loadingPw}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
                >
                  {loadingFace ? <FiLoader className="animate-spin" /> : <FiKey />}
                  {loadingFace ? 'Opening Face ID…' : 'Continue with Face ID'}
                </button>

                <div className="mt-3 text-center text-xs text-zinc-500">
                  Prefer password?{' '}
                  <button
                    type="button"
                    className="text-emerald-300 hover:text-emerald-200"
                    onClick={() => setMode('password')}
                  >
                    Switch to Password
                  </button>
                </div>
              </div>

              <Link
                href={nextSafe ?? '/dashboard/guest'}
                className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/50"
              >
                Continue as guest →
              </Link>
            </div>
          )}

          {/* PASSWORD MODE */}
          {(!canFaceId || mode === 'password') && (
            <form onSubmit={onSubmitPassword} className="mt-5 space-y-4 min-w-0" aria-label="Sign-in form">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm text-zinc-300">
                  Email (or username)
                </label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
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
                    className="w-full min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 pr-11 text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
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

                {capsLock && <div className="text-xs text-amber-300">Caps Lock is on.</div>}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
                <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  Remember me
                </label>

                <Link href="/signup" className="text-sm text-zinc-300 hover:text-white">
                  New here? <span className="text-emerald-400">Create account</span>
                </Link>
              </div>

              <button
                type="submit"
                disabled={loadingPw || loadingFace}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {loadingPw ? <FiLoader className="animate-spin" /> : null}
                {loadingPw ? 'Signing in…' : 'Sign in'}
              </button>

              <Link
                href={nextSafe ?? '/dashboard/guest'}
                className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/50"
              >
                Continue as guest →
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
