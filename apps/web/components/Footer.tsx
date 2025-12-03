'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()
  const hideOn = ['/login', '/signup']
  if (hideOn.includes(pathname)) return null

  return (
    <footer className="border-t border-zinc-800/60">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-zinc-400 flex flex-wrap items-center justify-between gap-3">
        <p>© {new Date().getFullYear()} WeGoLive — All rights reserved.</p>
        <nav className="flex items-center gap-5">
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/support" className="hover:text-white">Support</Link>
          <Link href="/status" className="hover:text-white">Status</Link>
        </nav>
      </div>
    </footer>
  )
}
