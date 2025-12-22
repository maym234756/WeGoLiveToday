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
import FollowersPage from '@/components/dashboard/FollowersPage';
import ModeratorsPage from '@/components/dashboard/ModeratorsPage';
import ChatPage from '@/components/dashboard/ChatPage';
import RevenuePage from '@/components/dashboard/RevenuePage';
import ViewerRewardsPage from '@/components/dashboard/ViewerRewardPage';

export default function DashboardSubPage() {
  const params = useParams<{ slug?: string[] | string }>();

  // Normalize slug to array
  const slugArr: string[] = Array.isArray(params?.slug)
    ? (params.slug as string[])
    : params?.slug
    ? [params.slug as string]
    : [];

  const [section, subSection] = slugArr; // e.g. 'community', 'followers'

  const renderContent = () => {
    switch (section) {
      case 'alerts':
        return <AlertsPage />;

      case 'analytics':
        return <h1 className="font-bold text-emerald-400">📊 KPI</h1>;

      case 'stream-together':
        return <OneonOnePage />;

      case 'rewards':
        return <ViewerRewardsPage />;

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

      /* ---------- Monetization subsections ---------- */
      case 'monetization': {
        switch (subSection) {
          case 'revenue':
            return <RevenuePage />;
          case 'subs':
            return <h1>🧾 Subs</h1>;
          case 'tips':
            return <h1>💸 Tips</h1>;
          case 'sponsorships':
            return <h1>🤝 Sponsorships</h1>;
          default:
            return (
              <h1>
                📁 Page not found: {section}
                {subSection ? `/${subSection}` : ''}
              </h1>
            );
        }
      }

      /* ---------- My Group subsections ---------- */
      case 'community': {
        switch (subSection) {
          case 'followers':
            return <FollowersPage />;
          case 'chat':
            return <ChatPage />;
          case 'mods':
            return <ModeratorsPage />;
          default:
            return (
              <h1>
                📁 Page not found: {section}
                {subSection ? `/${subSection}` : ''}
              </h1>
            );
        }
      }

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
    <div className="w-full min-w-0 overflow-x-hidden">
      {/* Mobile-safe padding + prevents “wide component breaks layout” */}
      <div className="min-h-[60vh] w-full min-w-0 overflow-x-auto px-2 py-3 sm:px-4">
        {renderContent()}
      </div>
    </div>
  );
}
