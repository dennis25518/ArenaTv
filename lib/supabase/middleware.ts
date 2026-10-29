import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  // Clean up any legacy or duplicated Supabase cookies on localhost to prevent HTTP 431 errors
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.startsWith('sb-') ||
      cookie.name.startsWith('arenax_user_session')
    ) {
      response.cookies.delete(cookie.name);
    }
  }

  return response;
}
