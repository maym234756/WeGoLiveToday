import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const form = await req.formData()

    const display_name = (form.get('displayName') || '').toString().trim()
    const email        = (form.get('email') || '').toString().trim()
    const category     = (form.get('category') || '').toString().trim()
    const schedule     = (form.get('schedule') || '').toString().trim()
    const pitch        = (form.get('pitch') || '').toString().trim()

    // socials
    const socials = {
      instagram: (form.get('instagram') || '').toString().trim(),
      tiktok:    (form.get('tiktok') || '').toString().trim(),
      youtube:   (form.get('youtube') || '').toString().trim(),
      twitch:    (form.get('twitch') || '').toString().trim(),
      x:         (form.get('x') || '').toString().trim(),
      facebook:  (form.get('facebook') || '').toString().trim(),
      snapchat:  (form.get('snapchat') || '').toString().trim(),
      website:   (form.get('website') || '').toString().trim(),
    }

    const agreed = form.get('agree') === 'on'

    // minimal validation
    if (!display_name || !email || !category || !schedule || !pitch || !agreed) {
      return NextResponse.redirect(new URL('/creators/apply?e=missing', req.url))
    }

    // Use service role for guaranteed insert regardless of RLS nuance
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only env var
    )

    const { error } = await supabase
      .from('streamer_applications')
      .insert({
        display_name, email, category, schedule, pitch,
        socials,
        agreed: agreed,
        status: 'pending'
      })

    if (error) {
      console.error('Insert failed:', error)
      return NextResponse.redirect(new URL('/creators/apply?e=failed', req.url))
    }

    return NextResponse.redirect(new URL('/creators/apply?ok=1', req.url))
  } catch (err) {
    console.error('Apply route error:', err)
    return NextResponse.redirect(new URL('/creators/apply?e=error', req.url))
  }
}
