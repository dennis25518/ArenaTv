import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Pass through request and response cleanly without stripping active Supabase auth sessions
  return NextResponse.next({
    request,
  });
}
