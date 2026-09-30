import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isProtectedPath(pathname: string) {
  const path = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  return path.startsWith('/dashboard') ||
    path.startsWith('/practice') ||
    path.startsWith('/favorites') ||
    path.startsWith('/wrong-book') ||
    path.startsWith('/settings');
}

function redirectWithCookies(response: NextResponse, destination: URL) {
  const redirectResponse = NextResponse.redirect(destination);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function proxy(req: NextRequest) {
  let response = NextResponse.next();
  const protectedPath = isProtectedPath(req.nextUrl.pathname);
  const loginPath = req.nextUrl.pathname === '/login' || req.nextUrl.pathname.startsWith('/login/');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables not found in proxy');
    return protectedPath ? new NextResponse('Authentication service unavailable', { status: 503 }) : response;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              req.cookies.set(name, value)
            );
            response = NextResponse.next({
              request: req,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (error.name === 'AuthSessionMissingError') {
        return protectedPath ? redirectWithCookies(response, new URL('/login', req.url)) : response;
      }
      console.error('Middleware authentication check failed:', error);
      return protectedPath ? new NextResponse('Authentication service unavailable', { status: 503 }) : response;
    }
    const isAuthenticated = Boolean(data.user);

    if (isAuthenticated && loginPath) {
      return redirectWithCookies(response, new URL('/dashboard', req.url));
    }

    if (!isAuthenticated && protectedPath) {
      return redirectWithCookies(response, new URL('/login', req.url));
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return protectedPath ? new NextResponse('Authentication service unavailable', { status: 503 }) : response;
  }
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/favorites/:path*',
    '/login',
    '/login/:path*',
    '/practice/:path*',
    '/wrong-book/:path*',
    '/settings/:path*',
  ],
};
