import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Adjust the path as necessary

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  const cookieStore = cookies();               // sync store
  const supabase = createRouteHandlerClient({
    cookies: () => cookieStore,                // returns ReadonlyRequestCookies, not a Promise
  });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(url.origin);
}
