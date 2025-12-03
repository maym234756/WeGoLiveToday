'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const nav = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/go-live', label: 'Go Live' },
  { href: '/pricing', label: 'Pricing' },
]

export default function Header() {
  const pathname = usePathname()
  const hideOn = ['/login', '/signup'] // hide header on auth pages
  if (hideOn.includes(pathname)) return null

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="mx-auto max-w-7xl px-4 md:px-6 grid h-16 grid-cols-[1fr_auto_1fr] items-center">
        {/* Brand */}
        <div className="flex items-center">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight text-white">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            WeGoLive
          </Link>
        </div>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-6">
          {nav.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'text-sm text-zinc-300 transition hover:text-white',
                  active && 'text-white'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/login" className="btn btn-ghost text-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary text-sm">Create account</Link>
        </div>
      </div>
    </header>
  )
}
