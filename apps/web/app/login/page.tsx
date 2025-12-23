// apps/web/app/login/page.tsx
'use client';

export const dynamic = 'force-dynamic'; // Prevents pre-rendering issues

import Link from 'next/link';
import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';

function LoginLoading() {
  return (
    <main className="min-h-[100svh] bg-black text-white grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <div className="h-5 w-40 bg-zinc-800/60 rounded mb-6" />
        <div className="space-y-3">
          <div className="h-10 bg-zinc-900 rounded" />
          <div className="h-10 bg-zinc-900 rounded" />
          <div className="h-10 bg-zinc-900 rounded mt-2" />
        </div>
      </div>
    </main>
  );
}

// Page-only layout: background + centering.
// IMPORTANT: LoginForm should be the only “card” UI to avoid double-wrapping.
function LoginContent() {
  return (
    <main className="relative min-h-[100svh] bg-black text-white overflow-hidden">
      {/* Subtle background glow (phone-safe) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(900px 500px at 50% 10%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(700px 400px at 10% 80%, rgba(59,130,246,0.08), transparent 60%)',
        }}
      />

      {/* Centered column */}
      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-md flex-col justify-center px-4 py-10">
        {/* Your LoginForm already renders the full card UI */}
        <LoginForm />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
