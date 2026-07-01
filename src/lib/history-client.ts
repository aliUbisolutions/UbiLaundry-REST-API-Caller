import type { BatchRecord, CallHistoryRecord } from '@/lib/data-store';

export type { BatchRecord, CallHistoryRecord };

export async function postHistory(
  record: Omit<CallHistoryRecord, 'id' | 'userId'>,
): Promise<void> {
  try {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch {
    // History recording is best-effort — never block the user
  }
}
