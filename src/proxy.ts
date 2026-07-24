import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, JWT_COOKIE } from '@/lib/auth';
import { findUserById } from '@/lib/data-store';

const PUBLIC_PATHS = ['/login', '/setup', '/api/auth/login', '/api/auth/logout', '/api/setup'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths, Next.js internals, and static assets
  if (
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(JWT_COOKIE)?.value;
  if (!token) {
    // API routes: return JSON 401 so fetch callers get a clean error (not an HTML redirect
    // that would delete the cookie mid-operation, e.g. during bulk import).
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Session expired — please log in again' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Session expired — please log in again' }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(JWT_COOKIE);
    return res;
  }

  // The token only proves identity (sub). Look up the CURRENT user record for
  // authorization on every request, so a profile change, permission change, or
  // deletion made in the admin panel takes effect immediately — not only after
  // the affected user's token naturally expires or they log out and back in.
  const currentUser = findUserById(payload.sub);
  if (!currentUser) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Session expired — please log in again' }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(JWT_COOKIE);
    return res;
  }

  // Admin-only paths
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/users') ||
      pathname.startsWith('/history') || pathname.startsWith('/api/history')) {
    if (currentUser.profile !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Forward the current user identity/permissions to API routes via headers
  const headers = new Headers(request.headers);
  headers.set('x-user-id', currentUser.id);
  headers.set('x-user-username', currentUser.username);
  headers.set('x-user-profile', currentUser.profile);
  headers.set('x-user-methods', JSON.stringify(currentUser.allowedMethods));
  headers.set('x-user-env-access', JSON.stringify(currentUser.serverEnvAccess));
  headers.set('x-user-endpoints', JSON.stringify(currentUser.allowedEndpoints ?? 'all'));

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
