import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const failureUrl = new URL('/login?error=auth_callback_failed', requestUrl.origin);

  if (
    !code ||
    requestUrl.searchParams.has('error') ||
    requestUrl.searchParams.has('error_code') ||
    requestUrl.searchParams.has('error_description') ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.redirect(failureUrl);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(failureUrl);
    }
  } catch {
    return NextResponse.redirect(failureUrl);
  }

  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
}
