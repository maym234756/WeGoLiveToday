// apps/web/middleware.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient, type NextMiddlewareRequest, type NextMiddlewareResponse } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // ✅ Supabase expects its specific request/response wrapper types
  const supabase = createMiddlewareClient<NextMiddlewareRequest, NextMiddlewareResponse>({
    req,
    res,
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // if ((path.startsWith('/dashboard') || path.startsWith('/adult')) && !session) {
  //   const loginUrl = req.nextUrl.clone()
  //   loginUrl.pathname = '/login'
  //   loginUrl.searchParams.set('next', path)
  //   return NextResponse.redirect(loginUrl)
  // }

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
