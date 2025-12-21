'use client';

import type { LiveCard } from '@/app/dashboard/page';

type DashboardBrowseProps = {
  initialStreams?: LiveCard[];
};

export default function DashboardBrowse({ initialStreams }: DashboardBrowseProps) {
  const safeInitialStreams: LiveCard[] = Array.isArray(initialStreams) ? initialStreams : [];

  return (
    <div>
      {/* Replace this with your full browse UI */}
      <pre>{JSON.stringify(safeInitialStreams, null, 2)}</pre>
    </div>
  );
}
