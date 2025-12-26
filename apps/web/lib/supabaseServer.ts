import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function getSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
          cookieStore.set({ name, value, ...options })
        ),
        removeAll: () => cookieStore.getAll().forEach(({ name }) =>
          cookieStore.delete(name)
        ),
      },
      headers: Object.fromEntries(headers()),
    }
  )
}