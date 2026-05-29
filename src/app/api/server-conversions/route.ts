import { NextRequest, NextResponse } from 'next/server';
import { listServerConversions, createServerConversion } from '@/lib/data-store';
import { genId } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(listServerConversions());
}

export async function POST(request: NextRequest) {
  if (request.headers.get('x-user-profile') !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json();
  const table = {
    id: genId(),
    name: body.name,
    sourceEnvId: body.sourceEnvId,
    targetEnvId: body.targetEnvId,
    fieldPaths: body.fieldPaths ?? [],
    mappings: body.mappings ?? [],
    fallback: body.fallback ?? 'error',
    fallbackDefaultId: body.fallbackDefaultId,
    fallbackDefaultLabel: body.fallbackDefaultLabel,
  };
  createServerConversion(table);
  return NextResponse.json(table, { status: 201 });
}
