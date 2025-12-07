import { NextResponse } from 'next/server'
import { createToken, setCookieHeader } from '@/lib/adminSession'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { password } = await req.json()
  const expected = process.env.ADMIN_PASSWORD // ✅ Corrected here

  if (!expected || password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const token = await createToken('owner')
  const res = NextResponse.json({ ok: true })
  res.headers.append('Set-Cookie', setCookieHeader(token))
  return res
}
