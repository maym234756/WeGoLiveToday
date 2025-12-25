'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const items = [
  { href: '/admin',               label: 'Overview',    icon: ChartIcon },
  { href: '/admin/streams',       label: 'Streams',     icon: VideoIcon },
  { href: '/admin/creators',      label: 'Creators',    icon: UsersIcon },
  { href: '/admin/tokens',        label: 'Tokens',      icon: TokenIcon },
  { href: '/admin/reports',       label: 'Reports',     icon: ReportIcon },
  { href: '/admin/settings',      label: 'Settings',    icon: CogIcon },
]

export default function AdminNav() {
  const pathname = usePathname()
  const pathnameSafe = pathname ?? ''

  return (
    <nav className="h-full w-64 shrink-0 border-r border-zinc-800 bg-zinc-950/80">
      <div className="px-4 pb-4 pt-5">
        <Link href="/admin" className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-semibold text-zinc-300">WeGoLive • Admin</span>
        </Link>
      </div>

      <ul className="space-y-1 px-2 pb-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathnameSafe === href || (href !== '/admin' && pathnameSafe.startsWith(href))
          return (
            <li key={href}>
              <Link
                href={href}
                className={clsx(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
                  active
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 opacity-80" />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto hidden px-3 pb-3 pt-6 text-xs text-zinc-500 md:block">
        © {new Date().getFullYear()} WeGoLive
      </div>
    </nav>
  )
}

/* --- tiny inline icons (no deps) --- */
function ChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="2" d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
    </svg>
  )
}
function VideoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="5" width="13" height="14" rx="2" strokeWidth="2" />
      <path d="M16 9l5-3v12l-5-3" strokeWidth="2" />
    </svg>
  )
}
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="9" cy="7" r="3" strokeWidth="2" />
      <path d="M2 21a7 7 0 0 1 14 0" strokeWidth="2" />
      <circle cx="17" cy="7" r="3" strokeWidth="2" />
      <path d="M22 21a6 6 0 0 0-7-6" strokeWidth="2" />
    </svg>
  )
}
function TokenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path d="M8 12h8M12 8v8" strokeWidth="2" />
    </svg>
  )
}
function ReportIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" />
      <path d="M7 8h10M7 12h6M7 16h8" strokeWidth="2" />
    </svg>
  )
}
function CogIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="2" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path strokeWidth="2" d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.02.02a2 2 0 1 1-2.83 2.83l-.02-.02A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .33 1.7 1.7 0 0 0-.67.87 2 2 0 0 1-3.66 0 1.7 1.7 0 0 0-.67-.87 1.7 1.7 0 0 0-1-.33 1.7 1.7 0 0 0-1.87.34l-.02.02a2 2 0 1 1-2.83-2.83l.02-.02A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.33-1 1.7 1.7 0 0 0-.87-.67 2 2 0 0 1 0-3.66 1.7 1.7 0 0 0 .87-.67 1.7 1.7 0 0 0 .33-1A1.7 1.7 0 0 0 4.26 5l-.02-.02A2 2 0 1 1 7.07 2.1L7.1 2.07A1.7 1.7 0 0 0 9 4.6c.33 0 .67-.11 1-.33.27-.2.48-.47.67-.87a2 2 0 0 1 3.66 0c.19.4.4.67.67.87.33.22.67.33 1 .33A1.7 1.7 0 0 0 16.9 2.07l.02.02A2 2 0 1 1 19.74 5l-.02.02c-.23.27-.34.6-.34.98 0 .33.1.67.33 1 .2.27.47.48.87.67a2 2 0 0 1 0 3.66 1.7 1.7 0 0 0-.87.67c-.22.33-.33.67-.33 1z" />
    </svg>
  )
}
