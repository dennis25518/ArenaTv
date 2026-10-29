import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const DEFAULT_SUPABASE_URL = 'https://qoyqefhtjjdyddhlinuz.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_7ngYMmPpymGhjt5t6dTZDA_x5cnDm6s';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      DEFAULT_SUPABASE_KEY,
    {
      cookieOptions: {
        name: 'arenax_admin_session',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Clean up any legacy `sb-*` or `arenax_user_session*` cookies to prevent HTTP 431 header overflow
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.startsWith('sb-') ||
      cookie.name.startsWith('arenax_user_session')
    ) {
      supabaseResponse.cookies.delete(cookie.name);
    }
  }

  const pathname = request.nextUrl.pathname;
  if (pathname !== '/login') {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      const redirectResponse = NextResponse.redirect(url);
      for (const cookie of request.cookies.getAll()) {
        if (
          cookie.name.startsWith('sb-') ||
          cookie.name.startsWith('arenax_user_session')
        ) {
          redirectResponse.cookies.delete(cookie.name);
        }
      }
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
