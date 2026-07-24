'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';
import UserBadge from '@/components/UserBadge';
import type { CallHistoryRecord, BatchRecord } from '@/lib/data-store';

function fmt(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

function StatusBadge({ label, count, color }: { label: string; count: number; color: string }) {
  if (count === 0) return null;
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
      {count} {label}
    </span>
  );
}

export default function HistoryPage() {
  const [records, setRecords] = useState<CallHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [filter, setFilter] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/history');
      if (res.status === 403) { setError('Admin access required.'); return; }
      if (!res.ok) { setError('Failed to load history.'); return; }
      setRecords(await res.json());
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const clearAll = async () => {
    if (!confirm('Clear all call history? This cannot be undone.')) return;
    setClearing(true);
    await fetch('/api/history', { method: 'DELETE' });
    setRecords([]);
    setClearing(false);
  };

  const needle = filter.trim().toLowerCase();
  const filtered = needle
    ? records.filter(r =>
        r.username.toLowerCase().includes(needle) ||
        r.environmentName.toLowerCase().includes(needle) ||
        r.environment.toLowerCase().includes(needle) ||
        r.operation.toLowerCase().includes(needle) ||
        r.sourceFile.toLowerCase().includes(needle) ||
        r.protocol.includes(needle)
      )
    : records;

  const totalOk = filtered.reduce((s, r) => s + r.totalOk, 0);
  const totalErrors = filtered.reduce((s, r) => s + r.totalErrors, 0);
  const totalSkipped = filtered.reduce((s, r) => s + r.totalSkipped, 0);
  const totalRows = filtered.reduce((s, r) => s + r.totalRows, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-5 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <h1 className="text-white font-semibold text-sm">Call History</h1>
        <span className="text-slate-600 text-xs font-mono">v{APP_VERSION}</span>
        <div className="flex-1" />
        <UserBadge />
      </div>

      <div className="max-w-7xl mx-auto px-5 py-6 space-y-4">

        {/* Summary bar */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm">
            <span className="text-slate-400">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">{totalRows.toLocaleString()} rows total</span>
            <StatusBadge label="ok" count={totalOk} color="text-emerald-400" />
            <StatusBadge label="errors" count={totalErrors} color="text-red-400" />
            <StatusBadge label="skipped" count={totalSkipped} color="text-slate-500" />
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by user, environment, operation, file…"
            className="flex-1 bg-slate-800 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
          />
          <button onClick={load} className="text-sm text-slate-400 hover:text-white px-3 py-2 border border-slate-600 rounded transition-colors">
            Refresh
          </button>
          <button
            onClick={clearAll}
            disabled={clearing || records.length === 0}
            className="text-sm text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 border border-red-400/30 rounded transition-colors"
          >
            {clearing ? 'Clearing…' : 'Clear all'}
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-slate-500">Loading…</div>
        )}
        {error && (
          <div className="text-red-400 text-sm px-4 py-3 bg-red-900/20 border border-red-700/40 rounded">{error}</div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm">
            {records.length === 0 ? 'No history recorded yet.' : 'No results match your filter.'}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-left">
                    <th className="px-4 py-2.5 text-slate-400 font-medium whitespace-nowrap">Date</th>
                    <th className="px-4 py-2.5 text-slate-400 font-medium">User</th>
                    <th className="px-4 py-2.5 text-slate-400 font-medium">Environment</th>
                    <th className="px-4 py-2.5 text-slate-400 font-medium">Protocol</th>
                    <th className="px-4 py-2.5 text-slate-400 font-medium">Operation</th>
                    <th className="px-4 py-2.5 text-slate-400 font-medium">Source file</th>
                    <th className="px-4 py-2.5 text-slate-400 font-medium text-right">Rows</th>
                    <th className="px-4 py-2.5 text-slate-400 font-medium text-right">OK</th>
                    <th className="px-4 py-2.5 text-slate-400 font-medium text-right">Errors</th>
                    <th className="px-4 py-2.5 text-slate-400 font-medium text-right">Skipped</th>
                    <th className="px-4 py-2.5 text-slate-400 font-medium text-right">Duration</th>
                    <th className="px-4 py-2.5 text-slate-400 font-medium">Batches</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const totalDuration = Date.parse(r.endedAt) - Date.parse(r.startedAt);
                    const isExpanded = expandedId === r.id;
                    return (
                      <Fragment key={r.id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className={`border-b border-slate-700/50 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-700/30' : 'hover:bg-slate-700/20'}`}
                        >
                          <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{fmt(r.startedAt)}</td>
                          <td className="px-4 py-2.5 text-slate-300 font-medium">{r.username || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-300 max-w-[160px] truncate" title={r.environment}>
                            {r.environmentName || r.environment}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${r.protocol === 'soap' ? 'bg-amber-900/40 text-amber-300' : 'bg-blue-900/40 text-blue-300'}`}>
                              {r.protocol.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 max-w-[180px] truncate font-mono" title={r.operation}>
                            {r.operation}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 max-w-[140px] truncate" title={r.sourceFile}>
                            {r.sourceFile || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300 text-right font-mono">{r.totalRows.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-emerald-400 text-right font-mono">{r.totalOk.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {r.totalErrors > 0
                              ? <span className="text-red-400">{r.totalErrors.toLocaleString()}</span>
                              : <span className="text-slate-600">0</span>}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-right font-mono">{r.totalSkipped.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-right whitespace-nowrap">
                            {isNaN(totalDuration) ? '—' : fmtDuration(totalDuration)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {r.batches.length > 1 ? `${r.batches.length} batches` : ''}
                            <span className="ml-1 text-slate-600">{isExpanded ? '▲' : '▼'}</span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-slate-700 bg-slate-950">
                            <td colSpan={12} className="px-6 py-4">
                              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
                                Session detail — started {fmt(r.startedAt)} · ended {fmt(r.endedAt)}
                              </p>
                              {r.batches.length === 0 ? (
                                <p className="text-xs text-slate-600">No batch data recorded.</p>
                              ) : (
                                <table className="text-xs w-full max-w-2xl">
                                  <thead>
                                    <tr className="text-slate-500">
                                      <th className="text-left py-1 pr-6">Batch</th>
                                      <th className="text-left py-1 pr-6">Start</th>
                                      <th className="text-right py-1 pr-6">Duration</th>
                                      <th className="text-right py-1 pr-6">Total</th>
                                      <th className="text-right py-1 pr-6 text-emerald-600">OK</th>
                                      <th className="text-right py-1 pr-6 text-red-600">Errors</th>
                                      <th className="text-right py-1 pr-6">Skipped</th>
                                      <th className="text-right py-1">Avg resp.</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r.batches.map((b: BatchRecord) => (
                                      <tr key={b.batchNum} className="border-t border-slate-800">
                                        <td className="py-1 pr-6 text-slate-400">#{b.batchNum}</td>
                                        <td className="py-1 pr-6 text-slate-500 whitespace-nowrap">{fmt(b.startedAt)}</td>
                                        <td className="py-1 pr-6 text-slate-400 text-right">{fmtDuration(b.durationMs)}</td>
                                        <td className="py-1 pr-6 text-slate-300 text-right font-mono">{b.total.toLocaleString()}</td>
                                        <td className="py-1 pr-6 text-emerald-400 text-right font-mono">{b.ok.toLocaleString()}</td>
                                        <td className="py-1 pr-6 text-right font-mono">
                                          {b.errors > 0
                                            ? <span className="text-red-400">{b.errors.toLocaleString()}</span>
                                            : <span className="text-slate-600">0</span>}
                                        </td>
                                        <td className="py-1 pr-6 text-slate-500 text-right font-mono">{b.skipped.toLocaleString()}</td>
                                        <td className="py-1 text-slate-500 text-right">
                                          {b.avgElapsedMs != null ? `${b.avgElapsedMs}ms` : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
