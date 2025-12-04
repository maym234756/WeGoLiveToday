
export const dynamic = 'error'; // Throws during build if pre-render attempted

import Link from 'next/link';
import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in · WeGoLive',
};

export default function LoginPage() {
  return (
    // If you removed the centering wrapper from the layout,
    // keep this line to center *only* this page:
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-lg font-semibold tracking-tight text-white">
            </span>
          </div>
        </div>

        <LoginForm />


      </div>
    </main>
  );
}
