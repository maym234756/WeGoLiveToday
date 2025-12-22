// apps/web/app/dashboard/[id]/[...slug]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import AlertsPage from '@/components/dashboard/AlertsPage';
import MyStreamsPage from '@/components/dashboard/MyStreamPage';
import ChannelSettingPage from '@/components/dashboard/ChannelSettingPage';
import OneonOnePage from '@/components/dashboard/OneonOnePage';
import CreatorToolPage from '@/components/dashboard/CreatorToolPage';
import ExtensionPage from '@/components/dashboard/ExtensionPage';
import KnowledgeBasePage from '@/components/dashboard/KnowledgeBasePage';

export default function DashboardSubPage() {
  const params = useParams<{ slug?: string[] | string }>();

  // Normalize slug to array
  const slugArr: string[] = Array.isArray(params?.slug)
    ? (params.slug as string[])
    : params?.slug
    ? [params.slug as string]
    : [];

  const [section, subSection] = slugArr; // e.g. 'content', 'streams'

  const renderContent = () => {
    switch (section) {
      case 'alerts':
        return <AlertsPage />;

      case 'analytics':
        return <h1 className="text-emerald-400 font-bold">📊 KPI</h1>;

      case 'stream-together':
        return <OneonOnePage />;

      case 'rewards':
        return <h1>🎁 Viewer Rewards</h1>;

      case 'tools':
        return <CreatorToolPage />;

      case 'moderation':
        return <ChannelSettingPage />;

      case 'extensions':
        return <ExtensionPage />;

      case 'settings':
        return <h1>⚙️ Settings</h1>;

      case 'knowledge':
      case 'knowledge-base':
      case 'help':
        return <KnowledgeBasePage />;

      /* ---------- My Content subsections ---------- */
      case 'content': {
        switch (subSection) {
          case 'streams':
            return <MyStreamsPage />;
          case 'past-broadcasts':
            return <h1>📼 Past Broadcasts</h1>;
          case 'clips':
            return <h1>✂️ Clips</h1>;
          default:
            return (
              <h1>
                📁 Page not found: {section}
                {subSection ? `/${subSection}` : ''}
              </h1>
            );
        }
      }

      default:
        return <h1>📁 Page not found: {section ?? 'home'}</h1>;
    }
  };

  return (
    <div className="w-full min-w-0">
      {/* Mobile-safe padding + prevents “wide component breaks layout” */}
      <div className="min-h-[60vh] w-full min-w-0 px-2 sm:px-4 py-3 overflow-x-auto">
        {renderContent()}
      </div>
    </div>
  );
}
