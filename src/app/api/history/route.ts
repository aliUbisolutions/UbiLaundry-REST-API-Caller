import { NextRequest, NextResponse } from 'next/server';
import { listHistory, appendHistory, clearHistory } from '@/lib/data-store';
import type { CallHistoryRecord } from '@/lib/data-store';
import { genId } from '@/lib/storage';

export const dynamic = 'force-dynamic';

function userFromHeaders(req: NextRequest) {
  return {
    id: req.headers.get('x-user-id') ?? '',
    username: req.headers.get('x-user-username') ?? '',
    profile: (req.headers.get('x-user-profile') ?? 'user') as 'admin' | 'user',
  };
}

export async function GET(request: NextRequest) {
  const user = userFromHeaders(request);
  if (user.profile !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(listHistory());
}

export async function POST(request: NextRequest) {
  const user = userFromHeaders(request);
  if (!user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json() as Omit<CallHistoryRecord, 'id' | 'userId' | 'username'>;
  const record: CallHistoryRecord = {
    ...body,
    id: genId(),
    userId: user.id,
    username: user.username || body.username || 'unknown',
  };
  appendHistory(record);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = userFromHeaders(request);
  if (user.profile !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  clearHistory();
  return NextResponse.json({ ok: true });
}
