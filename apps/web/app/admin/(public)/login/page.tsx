// apps/web/app/admin/(public)/login/page.tsx
'use client';

export const dynamic = 'force-dynamic'; // Forces dynamic rendering, avoids prerender errors

import type { Metadata } from 'next';
import LoginCard from './LoginCard';
import Link from 'next/link';


export default function AdminLoginPage() {
  return (
    <main className="min-h-[calc(100vh-0px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <LoginCard />
        <p className="mt-4 text-center text-xs text-zinc-500">
          Restricted area — for authorized personnel only.{' '}
          <Link href="/" className="text-emerald-400 hover:text-emerald-300">
            Go back
          </Link>
        </p>
      </div>
    </main>
  );
}
