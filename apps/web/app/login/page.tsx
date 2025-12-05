// apps/web/app/login/page.tsx
'use client';

export const dynamic = 'force-dynamic'; // Prevents pre-rendering issues

import Link from 'next/link';
import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';

// Split into a subcomponent to wrap Suspense correctly
function LoginContent() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-lg font-semibold tracking-tight text-white">
              Welcome back
            </span>
          </div>
        </div>

        {/* Form with potential useSearchParams usage inside */}
        <LoginForm />

        <div className="mt-4 text-center text-sm text-zinc-400">
          Don’t have an account?{' '}
          <Link href="/signup" className="text-emerald-400 hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-4 text-white">Loading login...</div>}>
      <LoginContent />
    </Suspense>
  );
}
