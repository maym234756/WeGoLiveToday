// Server component (no 'use client')
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in · WeGoLive',
  description: 'Restricted administrator access for WeGoLive.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
