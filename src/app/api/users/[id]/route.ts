import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserById, updateUser, deleteUser } from '@/lib/data-store';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as {
    username?: string;
    password?: string;
    profile?: 'admin' | 'user';
    allowedMethods?: string[];
    serverEnvAccess?: string[] | 'all';
  };

  const patch: Record<string, unknown> = {};
  if (body.username !== undefined) patch.username = body.username;
  if (body.profile !== undefined) patch.profile = body.profile;
  if (body.allowedMethods !== undefined) patch.allowedMethods = body.allowedMethods;
  if (body.serverEnvAccess !== undefined) patch.serverEnvAccess = body.serverEnvAccess;
  if (body.password) patch.passwordHash = await bcrypt.hash(body.password, 10);

  const ok = updateUser(id, patch);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const user = findUserById(id)!;
  const { passwordHash: _, ...pub } = user;
  return NextResponse.json(pub);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = deleteUser(id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}
