'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import type { ReactElement } from 'react';

interface Config {
  baseUrl: string;
  username: string;
  password: string;
}

interface Row {
  id: string;
  encodingDate?: string;
  firstSeenDate?: string;
  lastSeenDate?: string;
  lastSeenLocation?: string | number;
  category?: string | number;
  comment?: string;
  killed?: string | number;
  [key: string]: unknown;
}

type RowStatus = 'pending' | 'running' | 'ok' | 'error' | 'skipped';

interface RowResult {
  row: Row;
  status: RowStatus;
  httpStatus?: number;
  message?: string;
}

const REQUIRED_COL = 'id';

function parseDate(val: unknown): string | null {
  if (!val || val === 'NULL') return null;
  const s = String(val).trim();
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toInt(val: unknown): number | null {
  if (val === null || val === undefined || val === '' || val === 'NULL') return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

function buildPayload(row: Row, reassign: boolean, returnValue: boolean) {
  const item: Record<string, unknown> = {
    '@class': 'net.ubisolutions.ubimanager.entities.laundry.ItemLaundry',
    id: String(row.id).trim(),
    attributeLinks: [],
  };

  const encodingDate = parseDate(row.encodingDate);
  if (encodingDate) item.encodingDate = encodingDate;

  const firstSeenDate = parseDate(row.firstSeenDate);
  if (firstSeenDate) item.firstSeenDate = firstSeenDate;

  const lastSeenDate = parseDate(row.lastSeenDate);
  if (lastSeenDate) item.lastSeenDate = lastSeenDate;

  const categoryId = toInt(row.category);
  if (categoryId !== null) item.category = { id: categoryId };

  const locationId = toInt(row.lastSeenLocation);
  if (locationId !== null) item.lastSeenLocation = { id: locationId };

  if (row.comment && row.comment !== 'NULL') item.comment = row.comment;

  const killed = toInt(row.killed);
  if (killed !== null) item.killed = killed === 1;

  return { item, reassign, returnValue };
}

function parseFile(file: File): Promise<Row[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary', raw: false, cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '',
          raw: false,
        });
        // Drop the leading row-number column (first unnamed column)
        const rows = raw.map((r) => {
          const cleaned: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(r)) {
            if (k === '__EMPTY' || k === '') continue;
            cleaned[k] = v;
          }
          return cleaned as Row;
        }).filter((r) => r.id && String(r.id).trim() !== '');
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

const STATUS_ICON: Record<RowStatus, ReactElement> = {
  pending: <span className="w-4 h-4 rounded-full border border-slate-600 inline-block" />,
  running: (
    <svg className="w-4 h-4 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  ok: (
    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  skipped: (
    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  ),
};

export default function ImportPage() {
  const [config] = useState<Config>(() => {
    try { return JSON.parse(localStorage.getItem('ubilaundry-config') ?? '{}'); } catch { return {}; }
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [reassign, setReassign] = useState(true);
  const [returnValue, setReturnValue] = useState(true);
  const [concurrency] = useState(3);
  const abortRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(async (file: File) => {
    setParseError('');
    setRows([]);
    setResults([]);
    setDone(false);
    setFileName(file.name);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        setParseError('No valid rows found. Make sure the file has an "id" column.');
        return;
      }
      setRows(parsed);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const runImport = async () => {
    if (!config.baseUrl) { alert('Configure the Base URL first.'); return; }
    if (rows.length === 0) return;

    abortRef.current = false;
    setRunning(true);
    setDone(false);

    const initial: RowResult[] = rows.map((row) => ({ row, status: 'pending' }));
    setResults(initial);

    const url = `${config.baseUrl.replace(/\/$/, '')}/api/assignment`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (config.username) {
      headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);
    }

    const update = (index: number, patch: Partial<RowResult>) =>
      setResults((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

    // Process rows with limited concurrency
    let cursor = 0;
    const total = rows.length;

    const processOne = async (index: number) => {
      if (abortRef.current) {
        update(index, { status: 'skipped', message: 'Cancelled' });
        return;
      }
      const row = rows[index];
      if (!row.id || String(row.id).trim() === '') {
        update(index, { status: 'skipped', message: 'Missing id' });
        return;
      }
      update(index, { status: 'running' });
      try {
        const payload = buildPayload(row, reassign, returnValue);
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, method: 'POST', headers, body: JSON.stringify(payload) }),
        });
        const data = await res.json();
        if (data.error) {
          update(index, { status: 'error', message: data.error });
        } else if (data.status >= 200 && data.status < 300) {
          update(index, { status: 'ok', httpStatus: data.status });
        } else {
          const msg = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
          update(index, { status: 'error', httpStatus: data.status, message: msg.slice(0, 120) });
        }
      } catch (err: unknown) {
        update(index, { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      }
    };

    // Worker loop
    const worker = async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= total) break;
        await processOne(idx);
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
    await Promise.all(workers);

    setRunning(false);
    setDone(true);
  };

  const stop = () => { abortRef.current = true; };

  const reset = () => {
    setRows([]);
    setResults([]);
    setFileName('');
    setParseError('');
    setDone(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const counts = results.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; },
    {} as Record<RowStatus, number>
  );
  const processed = (counts.ok ?? 0) + (counts.error ?? 0) + (counts.skipped ?? 0);

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
        <h1 className="text-white font-semibold text-sm">Bulk Assignment Import</h1>
        <div className="flex-1" />
        {config.baseUrl ? (
          <span className="text-xs text-slate-500 font-mono truncate max-w-xs">{config.baseUrl}</span>
        ) : (
          <span className="text-xs text-yellow-500">Base URL not configured</span>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">

        {/* File upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !rows.length && fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
            ${dragging ? 'border-blue-400 bg-blue-400/5' : rows.length ? 'border-slate-700 cursor-default' : 'border-slate-700 hover:border-slate-500'}`}
        >
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileChange} />
          {rows.length > 0 ? (
            <div className="flex items-center justify-center gap-3">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-left">
                <p className="text-white font-medium">{fileName}</p>
                <p className="text-slate-400 text-sm">{rows.length} rows ready to import</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="ml-4 text-slate-500 hover:text-red-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <svg className="w-10 h-10 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-slate-300 font-medium mb-1">Drop a CSV or Excel file here</p>
              <p className="text-slate-500 text-sm">or click to browse — .csv, .xlsx, .xls accepted</p>
            </>
          )}
          {parseError && <p className="text-red-400 text-sm mt-3">{parseError}</p>}
        </div>

        {rows.length > 0 && (
          <>
            {/* Options */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Import Options</h2>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={reassign} onChange={e => setReassign(e.target.checked)} className="accent-blue-500 w-4 h-4" />
                  <span className="text-sm text-slate-300">Reassign</span>
                  <span className="text-xs text-slate-500">(reassign if already assigned)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={returnValue} onChange={e => setReturnValue(e.target.checked)} className="accent-blue-500 w-4 h-4" />
                  <span className="text-sm text-slate-300">Return value</span>
                  <span className="text-xs text-slate-500">(include item in response)</span>
                </label>
              </div>
            </div>

            {/* Preview table */}
            {results.length === 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-300">Preview (first 5 rows)</h2>
                  <span className="text-xs text-slate-500">{rows.length} total rows</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-700">
                        {['id', 'category', 'encodingDate', 'lastSeenLocation', 'comment'].map(col => (
                          <th key={col} className="text-left px-4 py-2 text-slate-400 font-medium whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-slate-700/50">
                          <td className="px-4 py-2 font-mono text-slate-300 truncate max-w-[200px]">{String(row.id)}</td>
                          <td className="px-4 py-2 text-slate-400">{String(row.category ?? '')}</td>
                          <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{String(row.encodingDate ?? '').slice(0, 19)}</td>
                          <td className="px-4 py-2 text-slate-400">{String(row.lastSeenLocation ?? '')}</td>
                          <td className="px-4 py-2 text-slate-400 truncate max-w-[120px]">{String(row.comment ?? '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action button */}
            {results.length === 0 && (
              <div className="flex justify-end">
                <button
                  onClick={runImport}
                  disabled={running || !config.baseUrl}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import {rows.length} items
                </button>
              </div>
            )}

            {/* Progress + Results */}
            {results.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                {/* Progress header */}
                <div className="px-4 py-3 border-b border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-emerald-400">{counts.ok ?? 0} ok</span>
                      <span className="text-red-400">{counts.error ?? 0} error</span>
                      <span className="text-slate-500">{counts.skipped ?? 0} skipped</span>
                      <span className="text-slate-400">{counts.pending ?? 0} pending</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {running && (
                        <button onClick={stop} className="text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1 border border-red-400/30 rounded">
                          Stop
                        </button>
                      )}
                      {done && (
                        <button onClick={reset} className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1 border border-slate-600 rounded">
                          New import
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${rows.length > 0 ? (processed / rows.length) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{processed} / {rows.length}</p>
                </div>

                {/* Results table */}
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-800">
                      <tr className="border-b border-slate-700">
                        <th className="text-left px-4 py-2 text-slate-400 font-medium w-8">#</th>
                        <th className="text-left px-4 py-2 text-slate-400 font-medium">Status</th>
                        <th className="text-left px-4 py-2 text-slate-400 font-medium">ID</th>
                        <th className="text-left px-4 py-2 text-slate-400 font-medium">Category</th>
                        <th className="text-left px-4 py-2 text-slate-400 font-medium">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                          <td className="px-4 py-2 text-slate-600">{i + 1}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1.5">
                              {STATUS_ICON[r.status]}
                              <span className={
                                r.status === 'ok' ? 'text-emerald-400' :
                                r.status === 'error' ? 'text-red-400' :
                                r.status === 'running' ? 'text-blue-400' :
                                r.status === 'skipped' ? 'text-slate-500' : 'text-slate-600'
                              }>
                                {r.status === 'ok' && r.httpStatus ? `${r.status} (${r.httpStatus})` : r.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-300 truncate max-w-[200px]">{String(r.row.id)}</td>
                          <td className="px-4 py-2 text-slate-400">{String(r.row.category ?? '')}</td>
                          <td className="px-4 py-2 text-slate-500 truncate max-w-[240px]">{r.message ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
