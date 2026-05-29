import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { countUsers, createUser } from '@/lib/data-store';
import { genId } from '@/lib/storage';
import { signToken, JWT_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ needsSetup: countUsers() === 0 });
}

export async function POST(request: NextRequest) {
  if (countUsers() > 0) {
    return NextResponse.json({ error: 'Setup already completed' }, { status: 403 });
  }

  const { username, password } = await request.json() as { username: string; password: string };
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: genId(),
    username,
    passwordHash,
    profile: 'admin' as const,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    serverEnvAccess: 'all' as const,
  };
  createUser(user);

  const token = await signToken({
    sub: user.id,
    username: user.username,
    profile: user.profile,
    allowedMethods: user.allowedMethods,
    serverEnvAccess: user.serverEnvAccess,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(JWT_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
