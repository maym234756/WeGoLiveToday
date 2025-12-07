// /app/api/viewer-log/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Required for server-side writes
)

export async function POST(req: Request) {
  const body = await req.json()

  const { name, email, idea, user_agent } = body

  const { error } = await supabase.from('waitlist_signups').insert({
    name,
    email,
    idea,
    user_agent,
  })

  if (error) {
    console.error('Insert error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
