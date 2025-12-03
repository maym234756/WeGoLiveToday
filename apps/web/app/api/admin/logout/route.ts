import { NextResponse } from 'next/server'
import { clearCookieHeader } from '@/lib/adminSession'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.headers.append('Set-Cookie', clearCookieHeader())
  return res
}
