// Server component (no 'use client')
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in · WeGoLiveToday',
  description: 'Restricted administrator access for WeGoLiveToday.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
