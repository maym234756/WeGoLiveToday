// apps/web/components/dashboard/Sidebar.tsx

'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { FiMenu, FiChevronDown } from 'react-icons/fi';
import { usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type NavItem = {
  label: string;
  href?: string;
  icon?: string;
  badge?: string;
  children?: { label: string; href: string }[];
  external?: boolean;
  hidden?: boolean;
};

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  const [collapsed, setCollapsed] = useState(false); // desktop collapsed width
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);

  // ✅ Mobile overlay open/close (slides in/out)
  const [mobileOpen, setMobileOpen] = useState(false);

  // 🔐 Fetch user ID
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data.session?.user?.id ?? 'guest');
    };
    getUser();
  }, [supabase]);

  // ✅ Auto-close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // 🧭 Build nav items AFTER userId exists
  const navItems: NavItem[] = [
    { label: 'Home', href: `/dashboard/${userId}`, icon: '🏠' },

    { label: 'Alerts', href: `/dashboard/${userId}/alerts`, icon: '🔔', badge: 'NEW' },
    { label: 'KPI', href: `/dashboard/${userId}/analytics`, icon: '📈' },

    {
      label: 'My Group',
      children: [
        { label: 'Chat', href: `/dashboard/${userId}/community/chat` },
        { label: 'Followers', href: `/dashboard/${userId}/community/followers` },
        { label: 'Moderators', href: `/dashboard/${userId}/community/mods` },
      ],
    },

    {
      label: 'My Content',
      children: [
        { label: 'My Streams', href: `/dashboard/${userId}/content/streams` },
        { label: 'Past Broadcasts', href: `/dashboard/${userId}/content/vods` },
        { label: 'Clips', href: `/dashboard/${userId}/content/clips` },
      ],
    },

    {
      label: 'Monetization',
      icon: '💰',
      badge: 'NEW',
      children: [
        { label: 'Revenue', href: `/dashboard/${userId}/monetization/revenue` },
        { label: 'Subs', href: `/dashboard/${userId}/monetization/subscribers` },
        { label: 'Tips', href: `/dashboard/${userId}/monetization/tips` },
        { label: 'Sponsorships', href: `/dashboard/${userId}/monetization/sponsors` },
      ],
    },

    {
      label: 'Channel Settings',
      href: `/dashboard/${userId}/moderation`,
      icon: '⚙️',
      badge: 'NEW',
    },

    {
      label: 'Viewer Rewards',
      href: `/dashboard/${userId}/rewards`,
      icon: '🎁',
      badge: 'NEW',
    },

    {
      label: '1 on 1',
      href: `/dashboard/${userId}/stream-together`,
      icon: '🤝',
      badge: 'NEW',
    },

    {
      label: 'Creator Tools',
      href: `/dashboard/${userId}/tools`,
      icon: '🛠️',
    },

    {
      label: 'Store',
      href: `/dashboard/${userId}/extensions`,
      icon: '🧩',
    },

    {
      label: 'Settings',
      children: [
        { label: 'Account', href: `/dashboard/${userId}/settings/account` },
        { label: 'Stream Settings', href: `/dashboard/${userId}/settings/stream` },
        { label: 'Security', href: `/dashboard/${userId}/settings/security` },
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
      href: `/dashboard/${userId}/safety`,
      icon: '🛡️',
    },
  ];

  if (!userId) return null;

  return (
    <>
      {/* ✅ Mobile open button (always visible when sidebar is closed) */}
      {!mobileOpen && (
        <button
          aria-label="Open sidebar"
          onClick={() => setMobileOpen(true)}
          className="fixed left-3 top-3 z-[60] rounded-md border border-zinc-800 bg-zinc-950/80 p-2 text-zinc-200 backdrop-blur md:hidden"
        >
          <FiMenu size={20} />
        </button>
      )}

      {/* ✅ Mobile backdrop (tap to close) */}
      {mobileOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        className={`
          bg-zinc-900 text-white h-screen px-4 py-6 transition-all duration-300
          fixed left-0 top-0 z-50
          w-64
          md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'md:w-16' : 'md:w-64'}
        `}
      >
        {/* ✅ Mobile close button (inside the sidebar) */}
        <button
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
          className="mb-6 text-zinc-400 hover:text-white md:hidden"
        >
          <FiMenu size={20} />
        </button>

        {/* ✅ Desktop collapse button */}
        <button
          aria-label="Collapse sidebar"
          onClick={() => setCollapsed((v) => !v)}
          className="mb-6 hidden md:block text-zinc-400 hover:text-white"
        >
          <FiMenu size={20} />
        </button>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between">
                <Link
                  href={item.href || '#'}
                  onClick={() => setMobileOpen(false)} // ✅ close on click (mobile)
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
                    aria-label={`Toggle ${item.label}`}
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
                  {item.children.map((sub) => (
                    <Link
                      key={sub.label}
                      href={sub.href}
                      onClick={() => setMobileOpen(false)} // ✅ close on click (mobile)
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
    </>
  );
}
