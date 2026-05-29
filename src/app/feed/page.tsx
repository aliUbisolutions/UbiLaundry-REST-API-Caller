'use client';

import { useState, useRef, useCallback, useMemo, Fragment } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { endpoints, type Endpoint } from '@/lib/endpoints';
import { APP_VERSION } from '@/lib/version';
import UserBadge from '@/components/UserBadge';
import {
  loadEnvironments, loadConversionTables, applyConversions,
  type Environment, type ConversionTable,
} from '@/lib/storage';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Config {
  baseUrl: string;
  username: string;
  password: string;
}

type RowStatus = 'pending' | 'running' | 'ok' | 'ok-substituted' | 'error';

interface RowResult {
  index: number;
  rowPreview: string;
  status: RowStatus;
  httpStatus?: number;
  message?: string;
  notes?: string;
  payload?: Record<string, unknown>;
  responseBody?: unknown;
  elapsed?: number;
}

// ─── JSON building ───────────────────────────────────────────────────────────

function coerce(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'null') return null;
  if (s.toLowerCase() === 'true') return true;
  if (s.toLowerCase() === 'false') return false;
  const n = Number(s);
  if (!isNaN(n) && s !== '') return n;
  return s;
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

function rowToJson(
  row: Record<string, unknown>,
  fixedFields: { key: string; value: string }[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const { key, value } of fixedFields) {
    if (key.trim()) setPath(result, key.trim(), coerce(value));
  }
  for (const [k, v] of Object.entries(row)) {
    const key = k.trim();
    if (!key || key === '__EMPTY') continue;
    setPath(result, key, coerce(v));
  }
  return result;
}

// ─── Extract suggested column names from a JSON template ─────────────────────

function extractPaths(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return prefix ? [prefix] : [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) return extractPaths(v, path);
    return [path];
  });
}

// ─── File parsing ─────────────────────────────────────────────────────────────

function parseFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary', raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
        resolve(raw.filter(r => Object.values(r).some(v => v !== '' && v !== null)));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

// ─── Status icon ─────────────────────────────────────────────────────────────

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
  'ok-substituted': (
    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ─── Component ───────────────────────────────────────────────────────────────

const POST_ENDPOINTS = endpoints.filter(e => e.method === 'POST');

export default function FeedPage() {
  const [config] = useState<Config>(() => {
    try { return JSON.parse(localStorage.getItem('ubilaundry-config') ?? '{}'); } catch { return {}; }
  });

  const [selectedId, setSelectedId] = useState<string>('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fixedFields, setFixedFields] = useState<{ key: string; value: string }[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [previewRow, setPreviewRow] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const abortRef   = useRef(false);
  const fileRef    = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<Map<number, Partial<RowResult>>>(new Map());

  // Conversion state
  const [allEnvs]   = useState<Environment[]>(() => { try { return loadEnvironments(); } catch { return []; } });
  const [allTables] = useState<ConversionTable[]>(() => { try { return loadConversionTables(); } catch { return []; } });
  const [useConversion, setUseConversion]   = useState(false);
  const [sourceEnvId, setSourceEnvId]       = useState('');
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);

  const applicableTables = useMemo(() =>
    allTables.filter(t => t.sourceEnvId === sourceEnvId),
    [allTables, sourceEnvId]
  );

  const toggleTable = (id: string) =>
    setSelectedTableIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const previewPayloads = useMemo(() =>
    rows.map(row => {
      const raw = rowToJson(row, fixedFields);
      if (!useConversion || selectedTableIds.length === 0) return { payload: raw, errors: [] as string[], notes: [] as string[] };
      const tables = allTables.filter(t => selectedTableIds.includes(t.id));
      const { converted, errors, notes } = applyConversions(raw, tables);
      return {
        payload: converted as Record<string, unknown>,
        errors,
        notes: notes.map(n => `${n.fieldPath}: ${n.sourceId} ${n.detail}`),
      };
    }),
    [rows, fixedFields, useConversion, selectedTableIds, allTables]
  );

  const endpoint: Endpoint | undefined = useMemo(
    () => POST_ENDPOINTS.find(e => e.id === selectedId),
    [selectedId]
  );

  const templatePaths: string[] = useMemo(() => {
    if (!endpoint?.body) return [];
    try { return extractPaths(JSON.parse(endpoint.body)); } catch { return []; }
  }, [endpoint]);

  // Group endpoints for the selector
  const grouped = useMemo(() => {
    const map: Record<string, Endpoint[]> = {};
    for (const ep of POST_ENDPOINTS) {
      const key = ep.group + (ep.subgroup ? ` › ${ep.subgroup}` : '');
      if (!map[key]) map[key] = [];
      map[key].push(ep);
    }
    return map;
  }, []);

  const updatePreview = useCallback(
    (r: Record<string, unknown>[], ff: { key: string; value: string }[]) => {
      if (r.length === 0) { setPreviewRow(''); return; }
      setPreviewRow(JSON.stringify(rowToJson(r[0], ff), null, 2));
    },
    []
  );

  const loadFile = useCallback(async (file: File) => {
    setParseError('');
    setRows([]);
    setResults([]);
    setDone(false);
    setFileName(file.name);
    try {
      const parsed = await parseFile(file);
      if (!parsed.length) { setParseError('No data rows found in the file.'); return; }
      setRows(parsed);
      updatePreview(parsed, fixedFields);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  }, [fixedFields, updatePreview]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) loadFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0]; if (f) loadFile(f);
  };

  const updateFixed = (i: number, field: 'key' | 'value', val: string) => {
    setFixedFields(prev => {
      const next = prev.map((ff, idx) => idx === i ? { ...ff, [field]: val } : ff);
      updatePreview(rows, next);
      return next;
    });
  };

  const addFixed = () => setFixedFields(prev => [...prev, { key: '', value: '' }]);
  const removeFixed = (i: number) => setFixedFields(prev => {
    const next = prev.filter((_, idx) => idx !== i);
    updatePreview(rows, next);
    return next;
  });

  const reset = () => {
    setRows([]); setResults([]); setFileName(''); setParseError('');
    setDone(false); setPreviewRow(''); setShowPreview(false); setExpandedIdx(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const retryFailed = async () => {
    const failedIndices = results.map((r, i) => r.status === 'error' ? i : -1).filter(i => i >= 0);
    if (failedIndices.length === 0 || !endpoint) return;
    if (!config.baseUrl) { alert('Configure the Base URL first.'); return; }

    abortRef.current = false;
    setRunning(true);
    setDone(false);
    setExpandedIdx(null);
    setResults(prev => prev.map((r, i) => failedIndices.includes(i) ? { ...r, status: 'pending' } : r));

    const url = endpoint.url.replace('{{baseURL}}', config.baseUrl.replace(/\/$/, ''));
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (config.username) headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);

    pendingRef.current.clear();
    const update = (i: number, patch: Partial<RowResult>) => {
      const prev = pendingRef.current.get(i) ?? {};
      pendingRef.current.set(i, { ...prev, ...patch });
    };
    const flush = () => {
      if (pendingRef.current.size === 0) return;
      const snapshot = new Map(pendingRef.current);
      pendingRef.current.clear();
      setResults(prev => prev.map((r, idx) => { const p = snapshot.get(idx); return p ? { ...r, ...p } : r; }));
    };
    const interval = setInterval(flush, 200);

    let cursor = 0;
    const worker = async () => {
      while (true) {
        const pos = cursor++;
        if (pos >= failedIndices.length) break;
        const idx = failedIndices[pos];
        if (abortRef.current) { update(idx, { status: 'error', message: 'Cancelled' }); continue; }
        update(idx, { status: 'running' });
        try {
          const { payload: finalJson, errors: convErrors, notes: convNotes } = previewPayloads[idx];
          if (convErrors.length > 0) { update(idx, { status: 'error', message: convErrors.join(' | '), payload: finalJson }); continue; }
          const substitutionNotes = convNotes.filter(n => n.includes('default') || n.includes('kept-source')).join('; ');
          const t0 = Date.now();
          const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, method: 'POST', headers, body: JSON.stringify(finalJson) }),
          });
          const data = await res.json();
          const elapsed = Date.now() - t0;
          if (data.error) {
            update(idx, { status: 'error', message: data.error, payload: finalJson, responseBody: null, elapsed });
          } else if (data.status >= 200 && data.status < 300) {
            const status: RowStatus = substitutionNotes ? 'ok-substituted' : 'ok';
            update(idx, { status, httpStatus: data.status, notes: substitutionNotes || undefined, payload: finalJson, responseBody: data.body, elapsed });
          } else {
            const body = data.body;
            const msg = body && typeof body === 'object'
              ? ((body as Record<string, unknown>).title ?? JSON.stringify(body))
              : String(body ?? '');
            update(idx, { status: 'error', httpStatus: data.status, message: String(msg), payload: finalJson, responseBody: body, elapsed });
          }
        } catch (err: unknown) {
          update(idx, { status: 'error', message: err instanceof Error ? err.message : 'Error' });
        }
      }
    };

    await Promise.all(Array.from({ length: 3 }, () => worker()));
    clearInterval(interval);
    flush();
    setRunning(false);
    setDone(true);
  };

  const runFeed = async () => {
    if (!config.baseUrl) { alert('Configure the Base URL first.'); return; }
    if (!endpoint || rows.length === 0) return;

    setShowPreview(false);
    abortRef.current = false;
    setRunning(true);
    setDone(false);
    setExpandedIdx(null);

    const initial: RowResult[] = rows.map((row, i) => ({
      index: i,
      rowPreview: String(Object.values(row)[0] ?? `row ${i + 1}`).slice(0, 40),
      status: 'pending',
    }));
    setResults(initial);

    const url = endpoint.url.replace('{{baseURL}}', config.baseUrl.replace(/\/$/, ''));
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (config.username) headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);

    pendingRef.current.clear();
    const update = (i: number, patch: Partial<RowResult>) => {
      const prev = pendingRef.current.get(i) ?? {};
      pendingRef.current.set(i, { ...prev, ...patch });
    };
    const flush = () => {
      if (pendingRef.current.size === 0) return;
      const snapshot = new Map(pendingRef.current);
      pendingRef.current.clear();
      setResults(prev => prev.map((r, idx) => {
        const p = snapshot.get(idx); return p ? { ...r, ...p } : r;
      }));
    };
    const interval = setInterval(flush, 200);

    let cursor = 0;
    const worker = async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= rows.length) break;
        if (abortRef.current) { update(idx, { status: 'error', message: 'Cancelled' }); continue; }
        update(idx, { status: 'running' });
        try {
          const { payload: finalJson, errors: convErrors, notes: convNotes } = previewPayloads[idx];

          if (convErrors.length > 0) {
            update(idx, { status: 'error', message: convErrors.join(' | '), payload: finalJson });
            continue;
          }

          const substitutionNotes = convNotes.filter(n => n.includes('default') || n.includes('kept-source')).join('; ');

          const t0 = Date.now();
          const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, method: 'POST', headers, body: JSON.stringify(finalJson) }),
          });
          const data = await res.json();
          const elapsed = Date.now() - t0;
          if (data.error) {
            update(idx, { status: 'error', message: data.error, payload: finalJson, responseBody: null, elapsed });
          } else if (data.status >= 200 && data.status < 300) {
            const status: RowStatus = substitutionNotes ? 'ok-substituted' : 'ok';
            update(idx, { status, httpStatus: data.status, notes: substitutionNotes || undefined, payload: finalJson, responseBody: data.body, elapsed });
          } else {
            const body = data.body;
            const msg = body && typeof body === 'object'
              ? ((body as Record<string, unknown>).title ?? JSON.stringify(body))
              : String(body ?? '');
            update(idx, { status: 'error', httpStatus: data.status, message: String(msg), payload: finalJson, responseBody: body, elapsed });
          }
        } catch (err: unknown) {
          update(idx, { status: 'error', message: err instanceof Error ? err.message : 'Error' });
        }
      }
    };

    await Promise.all(Array.from({ length: 3 }, () => worker()));
    clearInterval(interval);
    flush();
    setRunning(false);
    setDone(true);
  };

  const counts = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {} as Record<RowStatus, number>);
  const processed = (counts.ok ?? 0) + (counts['ok-substituted'] ?? 0) + (counts.error ?? 0);

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
        <h1 className="text-white font-semibold text-sm">Bulk Data Feeder</h1>
        <span className="text-slate-600 text-xs font-mono">v{APP_VERSION}</span>
        <div className="flex-1" />
        {config.baseUrl
          ? <span className="text-xs text-slate-500 font-mono truncate max-w-xs">{config.baseUrl}</span>
          : <span className="text-xs text-yellow-500">Base URL not configured</span>}
        <UserBadge />
      </div>

      <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">

        {/* Step 1 — Endpoint */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
            Select target endpoint
          </h2>
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); reset(); }}
            className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="">— choose a POST endpoint —</option>
            {Object.entries(grouped).map(([group, eps]) => (
              <optgroup key={group} label={group}>
                {eps.map(ep => (
                  <option key={ep.id} value={ep.id}>
                    {ep.name} — {ep.url.replace('{{baseURL}}', '')}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {endpoint && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {/* URL */}
              <div>
                <p className="text-xs text-slate-500 mb-1">Endpoint URL</p>
                <p className="font-mono text-xs text-blue-300 bg-slate-900 rounded px-3 py-2 break-all">
                  POST {endpoint.url.replace('{{baseURL}}', config.baseUrl || '<baseURL>')}
                </p>
              </div>
              {/* Template */}
              <div>
                <p className="text-xs text-slate-500 mb-1">
                  Expected JSON body
                  {templatePaths.length > 0 && (
                    <span className="ml-2 text-slate-600">→ suggested columns: {templatePaths.join(', ')}</span>
                  )}
                </p>
                <pre className="text-xs text-slate-400 bg-slate-900 rounded px-3 py-2 overflow-x-auto max-h-32">
                  {endpoint.body || '(no template)'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {endpoint && (
          <>
            {/* Step 2 — File */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
                Upload CSV or Excel file
              </h2>

              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !rows.length && fileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors
                  ${dragging ? 'border-blue-400 bg-blue-400/5' : rows.length ? 'border-slate-700 cursor-default' : 'border-slate-700 hover:border-slate-500 cursor-pointer'}`}
              >
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileChange} />
                {rows.length > 0 ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="text-left">
                      <p className="text-white font-medium text-sm">{fileName}</p>
                      <p className="text-slate-400 text-xs">{rows.length} rows · {Object.keys(rows[0]).length} columns</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); reset(); }} className="ml-4 text-slate-500 hover:text-red-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <svg className="w-9 h-9 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-slate-300 font-medium text-sm mb-1">Drop a file or click to browse</p>
                    <p className="text-slate-500 text-xs">.csv, .xlsx, .xls — column headers become JSON field names</p>
                  </>
                )}
                {parseError && <p className="text-red-400 text-sm mt-3">{parseError}</p>}
              </div>

              {/* Column names info */}
              {rows.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2">Detected columns → JSON paths (use dots for nesting, e.g. <code className="text-slate-400">category.id</code>)</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(rows[0]).filter(k => k && k !== '__EMPTY').map(col => (
                      <span key={col} className="bg-slate-900 border border-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-mono">{col}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3 — Fixed fields + preview */}
            {rows.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
                  Fixed fields &amp; JSON preview
                  <span className="text-slate-500 font-normal text-xs ml-1">— optional extra fields added to every row</span>
                </h2>

                <div className="grid grid-cols-2 gap-6">
                  {/* Fixed fields */}
                  <div>
                    <div className="space-y-2 mb-2">
                      {fixedFields.map((ff, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={ff.key}
                            onChange={e => updateFixed(i, 'key', e.target.value)}
                            placeholder="field.path"
                            className="flex-1 bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                          />
                          <span className="text-slate-600 text-xs">=</span>
                          <input
                            type="text"
                            value={ff.value}
                            onChange={e => updateFixed(i, 'value', e.target.value)}
                            placeholder="value"
                            className="flex-1 bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                          />
                          <button onClick={() => removeFixed(i)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={addFixed} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">+ Add fixed field</button>
                    {templatePaths.some(p => p.startsWith('@')) && (
                      <p className="text-xs text-yellow-600 mt-2">
                        Tip: this endpoint needs a <code>@class</code> field. Add it as a fixed field.
                      </p>
                    )}
                  </div>

                  {/* JSON preview */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">JSON preview — first row</p>
                    <pre className="bg-slate-900 border border-slate-700 rounded text-xs text-emerald-300 p-3 overflow-x-auto max-h-48 leading-relaxed">
                      {previewRow || '{}'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 — Conversion */}
            {rows.length > 0 && results.length === 0 && allEnvs.length > 1 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">4</span>
                  ID conversion
                  <span className="text-slate-500 font-normal text-xs ml-1">— translate IDs from a source environment before sending</span>
                  <Link href="/conversions" className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors">Manage tables →</Link>
                </h2>

                <label className="flex items-center gap-2 cursor-pointer mb-4">
                  <input type="checkbox" checked={useConversion} onChange={e => setUseConversion(e.target.checked)} className="accent-blue-500 w-4 h-4" />
                  <span className="text-sm text-slate-300">Apply conversion tables</span>
                </label>

                {useConversion && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">IDs in my file come from:</label>
                      <select value={sourceEnvId} onChange={e => { setSourceEnvId(e.target.value); setSelectedTableIds([]); }}
                        className="bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500">
                        <option value="">— select source environment —</option>
                        {allEnvs.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
                      </select>
                    </div>

                    {sourceEnvId && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Conversion tables to apply:</label>
                        {applicableTables.length === 0 ? (
                          <p className="text-slate-500 text-xs">
                            No tables defined for this source environment.{' '}
                            <Link href="/conversions" className="text-blue-400 hover:text-blue-300">Create one →</Link>
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {applicableTables.map(t => (
                              <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={selectedTableIds.includes(t.id)} onChange={() => toggleTable(t.id)} className="accent-blue-500 w-4 h-4" />
                                <span className="text-sm text-slate-300">{t.name}</span>
                                <span className="text-xs text-slate-500 font-mono">{t.fieldPaths.join(', ')}</span>
                                <span className="text-xs text-slate-600">({t.mappings.length} mappings)</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 5 — Run */}
            {rows.length > 0 && results.length === 0 && (
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setPreviewIdx(0); setShowPreview(true); }}
                  disabled={!config.baseUrl}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview payloads
                </button>
                <button
                  onClick={runFeed}
                  disabled={running || !config.baseUrl}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Send {rows.length} rows to API
                </button>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-emerald-400">{(counts.ok ?? 0) + (counts['ok-substituted'] ?? 0)} ok</span>
                      {(counts['ok-substituted'] ?? 0) > 0 && <span className="text-yellow-400 text-xs">({counts['ok-substituted']} with substitutions)</span>}
                      {(counts.error ?? 0) > 0 && <span className="text-red-400">{counts.error} error</span>}
                      {(counts.pending ?? 0) > 0 && <span className="text-slate-500">{counts.pending} pending</span>}
                    </div>
                    <div className="flex gap-2">
                      {running && (
                        <button onClick={() => { abortRef.current = true; }} className="text-xs text-red-400 hover:text-red-300 px-3 py-1 border border-red-400/30 rounded transition-colors">
                          Stop
                        </button>
                      )}
                      {done && (counts.error ?? 0) > 0 && (
                        <button onClick={retryFailed} className="text-xs text-orange-400 hover:text-orange-300 px-3 py-1 border border-orange-400/30 rounded transition-colors">
                          Retry {counts.error} failed
                        </button>
                      )}
                      {done && (
                        <button onClick={reset} className="text-xs text-slate-400 hover:text-white px-3 py-1 border border-slate-600 rounded transition-colors">
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

                {results.some(r => r.status === 'error') && (
                  <div className="overflow-y-auto max-h-[460px]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                        <tr>
                          <th className="text-left px-4 py-2 text-slate-400 font-medium w-8">#</th>
                          <th className="text-left px-4 py-2 text-slate-400 font-medium">Row</th>
                          <th className="text-left px-4 py-2 text-slate-400 font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => r.status !== 'error' ? null : (
                          <Fragment key={i}>
                            <tr
                              onClick={() => setExpandedIdx(prev => prev === i ? null : i)}
                              className="border-b border-slate-700/30 cursor-pointer hover:bg-red-900/10 transition-colors"
                            >
                              <td className="px-4 py-2 text-slate-600">{i + 1}</td>
                              <td className="px-4 py-2 font-mono text-slate-300 truncate max-w-[160px]">{r.rowPreview}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-red-400 truncate max-w-xs">
                                    {r.httpStatus ? `HTTP ${r.httpStatus} · ` : ''}{r.message}
                                  </span>
                                  <span className="text-slate-600 shrink-0">{expandedIdx === i ? '▲' : '▼'}</span>
                                </div>
                              </td>
                            </tr>
                            {expandedIdx === i && (
                              <tr className="bg-slate-950 border-b border-slate-700">
                                <td colSpan={3} className="px-4 py-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Request payload sent</p>
                                      <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-900 rounded p-3 max-h-72 overflow-y-auto leading-relaxed">
                                        {r.payload ? JSON.stringify(r.payload, null, 2) : '—'}
                                      </pre>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                                        Server response{r.httpStatus ? ` · HTTP ${r.httpStatus}` : ''}
                                      </p>
                                      <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-900 rounded p-3 max-h-72 overflow-y-auto leading-relaxed">
                                        {r.responseBody !== undefined && r.responseBody !== null
                                          ? JSON.stringify(r.responseBody, null, 2)
                                          : r.message ?? '—'}
                                      </pre>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {done && !results.some(r => r.status === 'error') && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-emerald-400 text-sm font-medium">
                      All {(counts.ok ?? 0) + (counts['ok-substituted'] ?? 0)} rows sent successfully.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payload preview panel */}
      {showPreview && endpoint && (
        <div className="fixed inset-0 bg-black/70 z-50 flex">
          <div className="flex-1" onClick={() => setShowPreview(false)} />
          <div className="w-full max-w-3xl bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
              <div>
                <h2 className="text-white font-semibold">Payload Preview</h2>
                <p className="text-slate-400 text-xs mt-0.5 font-mono truncate max-w-sm">
                  POST → {endpoint.url.replace('{{baseURL}}', config.baseUrl?.replace(/\/$/, '') || '<baseURL>')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={runFeed} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                  Send {rows.length} rows
                </button>
                <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white p-1.5 rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex flex-1 min-h-0">
              <div className="w-56 shrink-0 border-r border-slate-700 overflow-y-auto">
                {rows.map((row, i) => {
                  const { errors } = previewPayloads[i];
                  const label = String(Object.values(row)[0] ?? `row ${i + 1}`).slice(0, 24);
                  return (
                    <button key={i} onClick={() => setPreviewIdx(i)}
                      className={`w-full text-left px-3 py-2.5 text-xs border-b border-slate-800 transition-colors
                        ${previewIdx === i ? 'bg-slate-700 text-white' : errors.length > 0 ? 'text-red-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-800'}`}>
                      <span className="text-slate-600 mr-1.5">#{i + 1}</span>
                      <span className="font-mono">{label}</span>
                      {errors.length > 0 && <span className="ml-1 text-red-500">⚠</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 overflow-auto p-4">
                {previewPayloads[previewIdx] && (
                  <>
                    {previewPayloads[previewIdx].errors.length > 0 && (
                      <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                        <p className="font-semibold mb-1">Conversion errors — this row will be skipped:</p>
                        {previewPayloads[previewIdx].errors.map((e, ei) => <p key={ei}>{e}</p>)}
                      </div>
                    )}
                    {previewPayloads[previewIdx].notes.length > 0 && (
                      <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
                        <p className="font-semibold mb-1">Conversion applied:</p>
                        {previewPayloads[previewIdx].notes.map((n, ni) => <p key={ni} className="font-mono">{n}</p>)}
                      </div>
                    )}
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(previewPayloads[previewIdx].payload, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
