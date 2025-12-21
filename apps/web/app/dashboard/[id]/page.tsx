// apps/web/app/dashboard/[id]/page.tsx

import DashboardBrowse from '@/components/dashboard/DashboardBrowse';
import type { LiveCard } from '@/app/dashboard/page';

export default function Page() {
  const initialStreams: LiveCard[] = [];
  return <DashboardBrowse initialStreams={initialStreams} />;
}
