import { NextResponse } from 'next/server'
import { setCookieHeader } from '@/lib/adminSession'

export async function POST() {
  const res = NextResponse.json({ ok: true })
    res.headers.append('Set-Cookie', setCookieHeader('', 0));
  return res
}
