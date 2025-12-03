import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // ✅ Supabase middleware client (with cookie support)
  const supabase = createMiddlewareClient({ req, res })

  // ✅ Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // ✅ 1. Protect /dashboard and /adult for signed-in users only
  if ((path.startsWith('/dashboard') || path.startsWith('/adult')) && !session) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  // ✅ 2. Optional: Admin cookie-based protection
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

// ✅ Match these routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/adult/:path*',
    '/admin/:path*',
  ],
}
