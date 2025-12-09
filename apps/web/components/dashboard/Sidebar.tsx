'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FiMenu, FiChevronDown } from 'react-icons/fi';
import { usePathname } from 'next/navigation';

type NavItem = {
  label: string;
  href?: string;
  icon?: string;
  badge?: string;
  children?: { label: string; href: string }[];
  external?: boolean;
  hidden?: boolean; // 👈 Custom flag to hide items
};

const navItems: NavItem[] = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Stream Manager', href: '/stream-manager', icon: '🎛️', hidden: true },
  { label: 'Alerts', href: '/alerts', icon: '🔔', badge: 'NEW' },
  { label: 'KPI', href: '/analytics', icon: '📈' },

  {
    label: 'My Group',
    children: [
      { label: 'Chat', href: '/community/chat' },
      { label: 'Followers', href: '/community/followers' },
      { label: 'Moderators', href: '/community/mods' },
    ],
  },

  {
    label: 'My Content',
    hidden: true, // 👈 Hides this
    children: [
      { label: 'My Streams', href: '/content/streams' },
      { label: 'Past Broadcasts', href: '/content/vods' },
      { label: 'Clips', href: '/content/clips' },
    ],
  },

  {
    label: 'Monetization',
    icon: '💰',
    badge: 'NEW',
    hidden: true, // 👈 Hides this
    children: [
      { label: 'Revenue', href: '/monetization/revenue' },
      { label: 'Subs', href: '/monetization/subscribers' },
      { label: 'Tips', href: '/monetization/tips' },
      { label: 'Sponsorships', href: '/monetization/sponsors' },
    ],
  },

  {
    label: 'Channel Settings',
    href: '/moderation',
    icon: '⚙️',
    badge: 'NEW',
    hidden: true, // 👈 Hides this
  },

  {
    label: 'Viewer Rewards',
    href: '/rewards',
    icon: '🎁',
    badge: 'NEW',
  },

  {
    label: '1 on 1',
    href: '/stream-together',
    icon: '🤝',
    badge: 'NEW',
  },

  {
    label: 'Creator Tools',
    href: '/tools',
    icon: '🛠️',
    hidden: true, // 👈 Hides this
  },

  {
    label: 'Extensions',
    href: '/extensions',
    icon: '🧩',
  },

  {
    label: 'Settings',
    children: [
      { label: 'Account', href: '/settings/account' },
      { label: 'Stream Settings', href: '/settings/stream' },
      { label: 'Security', href: '/settings/security' },
    ],
  },

  {
    label: 'Knowledge Base',
    href: 'https://creatorcamp.example.com',
    icon: '📚',
    external: true,
  },

  {
    label: 'Safety Center',
    href: '/safety',
    icon: '🛡️',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className={`bg-zinc-900 text-white h-screen px-4 py-6 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } fixed left-0 top-0 z-50`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-6 text-zinc-400 hover:text-white"
      >
        <FiMenu size={20} />
      </button>

      <nav className="space-y-2">
        {navItems
          .filter(item => !item.hidden) // 👈 Filter out hidden items
          .map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between">
                <Link
                  href={item.href || '#'}
                  className={`flex items-center gap-2 px-2 py-2 rounded hover:bg-zinc-800 ${
                    pathname === item.href ? 'bg-zinc-800 text-emerald-400' : ''
                  }`}
                >
                  <span className="text-lg">{item.icon || '📁'}</span>
                  {!collapsed && (
                    <>
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-xs bg-pink-500 text-white rounded-full px-2">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>

                {!collapsed && item.children && (
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <FiChevronDown
                      className={`${
                        openMenus[item.label] ? 'rotate-180' : ''
                      } transition-transform`}
                    />
                  </button>
                )}
              </div>

              {!collapsed && item.children && openMenus[item.label] && (
                <div className="ml-6 mt-1 space-y-1 text-sm text-zinc-400">
                  {item.children.map((sub: { label: string; href: string }) => (
                    <Link
                      key={sub.label}
                      href={sub.href}
                      className="block px-2 py-1 hover:text-white"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
      </nav>
    </aside>
  );
}
