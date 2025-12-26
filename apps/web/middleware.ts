import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/ssr' // ✅ use this package

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // ✅ Protect /admin routes
  if (path.startsWith('/admin')) {
    if (path.startsWith('/admin/login')) return res

    const token = req.cookies.get('wgl_admin')?.value
    if (!token) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      loginUrl.searchParams.set('next', path)
      return NextResponse.redirect(loginUrl)
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/adult/:path*', '/admin/:path*'],
}
