// apps/web/app/admin/(public)/login/page.tsx
'use client';

export const dynamic = 'force-dynamic'; // Forces dynamic rendering to avoid prerender errors

import { Suspense } from 'react';
import LoginCard from './LoginCard';
import Link from 'next/link';

function AdminLoginContent() {
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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-4 text-white">Loading admin login...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
