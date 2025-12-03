// apps/web/app/admin/(protected)/layout.tsx
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/adminSession'
import CommandK from '@/app/admin/_components/CommandK'


// IMPORTANT: keep node runtime, since edge doesn't support node:crypto (used in adminSession)
export const runtime = 'nodejs'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Read your admin cookie (match the name you set in /api/admin/login)
  const cookie =
    cookies().get('wegl_admin')?.value ??
    cookies().get('admin_token')?.value ??
    null

  const ok = cookie ? await verifyToken(cookie).catch(() => false) : false
  if (!ok) {
    redirect('/admin/login?next=/admin')
  }

  // ⚠️ No <html> or <body> here — only section UI wrappers
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-zinc-900 bg-zinc-950/60 p-3 md:block">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            WeGoLive • Admin
          </div>
          <nav className="space-y-1 text-sm">
            <a className="block rounded px-2 py-2 hover:bg-zinc-900" href="/admin">Overview</a>
            <a className="block rounded px-2 py-2 hover:bg-zinc-900" href="/admin/streams">Streams</a>
            <a className="block rounded px-2 py-2 hover:bg-zinc-900" href="/admin/creators">Creators</a>
            <a className="block rounded px-2 py-2 hover:bg-zinc-900" href="/admin/tokens">Tokens</a>
            <a className="block rounded px-2 py-2 hover:bg-zinc-900" href="/admin/reports">Reports</a>
            <a className="block rounded px-2 py-2 hover:bg-zinc-900" href="/admin/settings">Settings</a>
          </nav>
          <div className="mt-6 text-xs text-zinc-500">© {new Date().getFullYear()} WeGoLive</div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-zinc-900 bg-zinc-950/70 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <input
                type="search"
                placeholder="Search streams, creators, ids…"
                className="h-9 w-full max-w-xl rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 outline-none focus:border-emerald-500"
              />
              <a
                href="/"
                className="rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
              >
                Customer Dashboard
              </a>
              <form action="/api/admin/logout" method="post">
                <button
                  className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
                  type="submit"
                >
                  Logout
                </button>
              </form>
            </div>
          </header>

          <main className="p-4">{children}</main>
          <CommandK />
        </div>
      </div>
    </div>
  )
}
