import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, JWT_COOKIE } from '@/lib/auth';

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
    // /setup check: if no users exist, redirect to /setup
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(JWT_COOKIE);
    return res;
  }

  // Admin-only paths
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/users')) {
    if (payload.profile !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Forward user identity to API routes via headers
  const headers = new Headers(request.headers);
  headers.set('x-user-id', payload.sub);
  headers.set('x-user-profile', payload.profile);
  headers.set('x-user-methods', JSON.stringify(payload.allowedMethods));
  headers.set('x-user-env-access', JSON.stringify(payload.serverEnvAccess));
  headers.set('x-user-endpoints', JSON.stringify(payload.allowedEndpoints ?? 'all'));

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
