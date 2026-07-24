import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWT_COOKIE } from '@/lib/auth';
import { findUserById } from '@/lib/data-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(JWT_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ user: null });

  // Read the live record, not claims baked into the token at login time —
  // otherwise a profile/permission change made after login wouldn't show up
  // here until the user logs out and back in.
  const user = findUserById(payload.sub);
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      profile: user.profile,
      allowedMethods: user.allowedMethods,
      serverEnvAccess: user.serverEnvAccess,
      allowedEndpoints: user.allowedEndpoints ?? 'all',
    },
  });
}
