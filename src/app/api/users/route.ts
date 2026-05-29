import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { listUsers, createUser } from '@/lib/data-store';
import { genId } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(listUsers());
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    username: string;
    password: string;
    profile: 'admin' | 'user';
    allowedMethods: string[];
    serverEnvAccess: string[] | 'all';
    allowedEndpoints: string[] | 'all';
  };

  if (!body.username || !body.password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = {
    id: genId(),
    username: body.username,
    passwordHash,
    profile: body.profile ?? 'user',
    allowedMethods: body.allowedMethods ?? ['GET'],
    serverEnvAccess: body.serverEnvAccess ?? [],
    allowedEndpoints: body.allowedEndpoints ?? 'all',
  };
  createUser(user);
  const { passwordHash: _, ...pub } = user;
  return NextResponse.json(pub, { status: 201 });
}
