// apps/web/app/dashboard/[id]/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover · WeGoLive',
  description: 'Browse live streams by category and jump in.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
