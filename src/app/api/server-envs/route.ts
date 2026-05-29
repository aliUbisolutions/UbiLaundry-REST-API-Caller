import { NextRequest, NextResponse } from 'next/server';
import { listServerEnvsForUser, createServerEnv } from '@/lib/data-store';
import type { PublicUser } from '@/lib/data-store';
import { genId } from '@/lib/storage';

export const dynamic = 'force-dynamic';

function userFromHeaders(req: NextRequest): PublicUser {
  return {
    id: req.headers.get('x-user-id') ?? '',
    username: '',
    profile: (req.headers.get('x-user-profile') ?? 'user') as 'admin' | 'user',
    allowedMethods: JSON.parse(req.headers.get('x-user-methods') ?? '[]'),
    serverEnvAccess: JSON.parse(req.headers.get('x-user-env-access') ?? '[]'),
    allowedEndpoints: JSON.parse(req.headers.get('x-user-endpoints') ?? '"all"'),
  };
}

export async function GET(request: NextRequest) {
  const user = userFromHeaders(request);
  return NextResponse.json(listServerEnvsForUser(user));
}

export async function POST(request: NextRequest) {
  const user = userFromHeaders(request);
  if (user.profile !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json();
  const env = { id: genId(), name: body.name, baseUrl: body.baseUrl, username: body.username ?? '', password: body.password ?? '' };
  createServerEnv(env);
  return NextResponse.json(env, { status: 201 });
}
