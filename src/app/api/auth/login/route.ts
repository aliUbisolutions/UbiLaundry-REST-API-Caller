import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByUsername } from '@/lib/data-store';
import { signToken, JWT_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json() as { username: string; password: string };

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  const user = findUserByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signToken({ sub: user.id });

  const response = NextResponse.json({ ok: true, profile: user.profile });
  response.cookies.set(JWT_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
    secure: process.env.SECURE_COOKIES === 'true',
  });
  return response;
}
