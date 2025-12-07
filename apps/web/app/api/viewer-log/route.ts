import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { page, user_agent, type, location } = await req.json();

  const { error } = await supabase.from('Viewers').insert([
    {
      page,
      user_agent,
      type,
      location,
    },
  ]);

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
