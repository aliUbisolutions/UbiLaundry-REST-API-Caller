import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWT_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(JWT_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: payload.sub,
      username: payload.username,
      profile: payload.profile,
      allowedMethods: payload.allowedMethods,
      serverEnvAccess: payload.serverEnvAccess,
      allowedEndpoints: payload.allowedEndpoints ?? 'all',
    },
  });
}
