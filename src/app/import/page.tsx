'use client';

import { useState, useRef, useCallback, useMemo, Fragment } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import type { ReactElement } from 'react';
import {
  loadEnvironments, loadConversionTables, applyConversions,
  type Environment, type ConversionTable, type ConversionNote,
} from '@/lib/storage';
import { APP_VERSION } from '@/lib/version';

interface Config { baseUrl: string; username: string; password: string; }

type Row = Record<string, unknown>;

type RowStatus = 'pending' | 'running' | 'ok' | 'error' | 'skipped';

interface RowResult {
  row: Row;
  status: RowStatus;
  httpStatus?: number;
  message?: string;
  payload?: Record<string, unknown>;
  responseBody?: unknown;
  elapsed?: number;
}

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

// Fields whose value becomes { id: N } in the item payload
const NESTED_ID_FIELDS = new Set([
  'category', 'lastSeenLocation', 'lastSeenWorkstation', 'lastMovementType',
  'lastReportLocation', 'itemType', 'container', 'client', 'department',
  'holder', 'owner', 'locationtype',
]);
// Fields parsed as ISO date strings
const DATE_FIELDS = new Set([
  'encodingDate', 'firstSeenDate', 'lastSeenDate', 'lastSeenDateTemp', 'inventoryDate',
]);
// Fields converted 0/1 → boolean
const BOOL_FIELDS = new Set(['killed']);
// Columns to ignore entirely
const SKIP_FIELDS = new Set(['_Upd', '__EMPTY', '']);

function buildPayload(row: Record<string, unknown>, reassign: boolean, returnValue: boolean): Record<string, unknown> {
  const item: Record<string, unknown> = {
    '@class': 'net.ubisolutions.ubimanager.entities.laundry.ItemLaundry',
    attributeLinks: [],
  };

  for (const [col, val] of Object.entries(row)) {
    if (SKIP_FIELDS.has(col)) continue;

    if (col === 'id') {
      const s = String(val ?? '').trim();
      if (s) item.id = s;
      continue;
    }

    if (DATE_FIELDS.has(col)) {
      const parsed = parseDate(val);
      if (parsed) item[col] = parsed;
      continue;
    }

    if (NESTED_ID_FIELDS.has(col)) {
      const n = toInt(val);
      if (n !== null) item[col] = { id: n };
      continue;
    }

    if (BOOL_FIELDS.has(col)) {
      const n = toInt(val);
      if (n !== null) item[col] = n === 1;
      continue;
    }

    // Generic: skip null / empty / NULL
    if (val === null || val === undefined || val === '' || String(val) === 'NULL') continue;
    const n = toInt(val);
    item[col] = n !== null ? n : String(val);
  }

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
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
        const rows = raw.map((r) => {
          const cleaned: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(r)) {
            if (k === '__EMPTY' || k === '') continue;
            cleaned[k] = v;
          }
          return cleaned as Row;
        }).filter((r) => r.id && String(r.id).trim() !== '');
        resolve(rows);
      } catch (err) { reject(err); }
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
  const [envs] = useState<Environment[]>(() => loadEnvironments());
  const [allTables] = useState<ConversionTable[]>(() => loadConversionTables());

  const [rows, setRows]           = useState<Row[]>([]);
  const [results, setResults]     = useState<RowResult[]>([]);
  const [running, setRunning]     = useState(false);
  const [done, setDone]           = useState(false);
  const [dragging, setDragging]   = useState(false);
  const [fileName, setFileName]   = useState('');
  const [parseError, setParseError] = useState('');
  const [reassign, setReassign]   = useState(true);
  const [returnValue, setReturnValue] = useState(true);
  const [concurrency]             = useState(3);

  const [sourceEnvId, setSourceEnvId]             = useState('');
  const [selectedTableIds, setSelectedTableIds]   = useState<Set<string>>(new Set());

  const [showPreview, setShowPreview] = useState(false);
  const [previewIdx, setPreviewIdx]   = useState(0);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const [sqlTableName, setSqlTableName]           = useState('item');
  const [sqlSubTableName, setSqlSubTableName]     = useState('item_laundry');
  const [sqlUpsert, setSqlUpsert]                 = useState(true);

  const abortRef   = useRef(false);
  const fileRef     = useRef<HTMLInputElement>(null);
  const pendingRef  = useRef<Map<number, Partial<RowResult>>>(new Map());

  const targetEnv = useMemo(() =>
    envs.find(e => e.baseUrl.replace(/\/$/, '') === config.baseUrl?.replace(/\/$/, '')),
    [envs, config.baseUrl]
  );

  const applicableTables = useMemo(() => {
    if (!sourceEnvId || !targetEnv) return [] as ConversionTable[];
    return allTables.filter(t => t.sourceEnvId === sourceEnvId && t.targetEnvId === targetEnv.id);
  }, [allTables, sourceEnvId, targetEnv]);

  const activeTables = useMemo(() =>
    applicableTables.filter(t => selectedTableIds.has(t.id)),
    [applicableTables, selectedTableIds]
  );

  const previewPayloads = useMemo(() =>
    rows.map(r => {
      // Apply conversions to the flat CSV row first (paths match CSV column names),
      // then build the nested assignment payload from the converted row.
      if (activeTables.length > 0) {
        const result = applyConversions(r as Record<string, unknown>, activeTables);
        const payload = buildPayload(result.converted as Record<string, unknown>, reassign, returnValue);
        return { payload, errors: result.errors, notes: result.notes };
      }
      return { payload: buildPayload(r as Record<string, unknown>, reassign, returnValue), errors: [] as string[], notes: [] as ConversionNote[] };
    }),
    [rows, reassign, returnValue, activeTables]
  );

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
    setShowPreview(false);
    abortRef.current = false;
    setRunning(true);
    setDone(false);
    setExpandedIdx(null);

    const initial: RowResult[] = rows.map((row) => ({ row, status: 'pending' }));
    setResults(initial);

    const url = `${config.baseUrl.replace(/\/$/, '')}/api/assignment`;
    const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (config.username) reqHeaders['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);

    // Buffer updates and flush in batches to avoid a re-render per row
    pendingRef.current.clear();
    const update = (index: number, patch: Partial<RowResult>) => {
      const prev = pendingRef.current.get(index) ?? {};
      pendingRef.current.set(index, { ...prev, ...patch });
    };
    const flush = () => {
      if (pendingRef.current.size === 0) return;
      const snapshot = new Map(pendingRef.current);
      pendingRef.current.clear();
      setResults(prev => prev.map((r, i) => {
        const p = snapshot.get(i); return p ? { ...r, ...p } : r;
      }));
    };
    const interval = setInterval(flush, 200);

    let cursor = 0;
    const total = rows.length;

    const processOne = async (index: number) => {
      if (abortRef.current) { update(index, { status: 'skipped', message: 'Cancelled' }); return; }
      const row = rows[index];
      if (!row.id || String(row.id).trim() === '') { update(index, { status: 'skipped', message: 'Missing id' }); return; }
      update(index, { status: 'running' });

      const { payload, errors: convErrors } = previewPayloads[index];

      if (convErrors.length > 0) {
        update(index, { status: 'error', message: convErrors.join('; '), payload });
        return;
      }

      try {
        const t0 = Date.now();
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, method: 'POST', headers: reqHeaders, body: JSON.stringify(payload) }),
        });
        const data = await res.json();
        const elapsed = Date.now() - t0;
        if (data.error) {
          update(index, { status: 'error', message: data.error, payload, responseBody: null, elapsed });
        } else if (data.status >= 200 && data.status < 300) {
          update(index, { status: 'ok', httpStatus: data.status, payload, responseBody: data.body, elapsed });
        } else {
          const body = data.body;
          const msg = body && typeof body === 'object'
            ? ((body as Record<string, unknown>).title ?? JSON.stringify(body))
            : String(body ?? '');
          update(index, { status: 'error', httpStatus: data.status, message: String(msg), payload, responseBody: body, elapsed });
        }
      } catch (err: unknown) {
        update(index, { status: 'error', message: err instanceof Error ? err.message : 'Unknown error', payload });
      }
    };

    const worker = async () => { while (true) { const idx = cursor++; if (idx >= total) break; await processOne(idx); } };
    await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()));
    clearInterval(interval);
    flush();
    setRunning(false);
    setDone(true);
  };

  const stop  = () => { abortRef.current = true; };
  const reset = () => {
    setRows([]); setResults([]); setFileName(''); setParseError('');
    setDone(false); setShowPreview(false); setExpandedIdx(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const retryFailed = async () => {
    const failedIndices = results.map((r, i) => r.status === 'error' ? i : -1).filter(i => i >= 0);
    if (failedIndices.length === 0) return;
    if (!config.baseUrl) { alert('Configure the Base URL first.'); return; }

    abortRef.current = false;
    setRunning(true);
    setDone(false);
    setExpandedIdx(null);
    setResults(prev => prev.map((r, i) => failedIndices.includes(i) ? { ...r, status: 'pending' } : r));

    const url = `${config.baseUrl.replace(/\/$/, '')}/api/assignment`;
    const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (config.username) reqHeaders['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);

    pendingRef.current.clear();
    const update = (index: number, patch: Partial<RowResult>) => {
      const prev = pendingRef.current.get(index) ?? {};
      pendingRef.current.set(index, { ...prev, ...patch });
    };
    const flush = () => {
      if (pendingRef.current.size === 0) return;
      const snapshot = new Map(pendingRef.current);
      pendingRef.current.clear();
      setResults(prev => prev.map((r, i) => { const p = snapshot.get(i); return p ? { ...r, ...p } : r; }));
    };
    const interval = setInterval(flush, 200);

    let cursor = 0;
    const worker = async () => {
      while (true) {
        const pos = cursor++;
        if (pos >= failedIndices.length) break;
        const idx = failedIndices[pos];
        if (abortRef.current) { update(idx, { status: 'error', message: 'Cancelled' }); continue; }
        const row = rows[idx];
        if (!row.id || String(row.id).trim() === '') { update(idx, { status: 'skipped', message: 'Missing id' }); continue; }
        update(idx, { status: 'running' });
        const { payload, errors: convErrors } = previewPayloads[idx];
        if (convErrors.length > 0) { update(idx, { status: 'error', message: convErrors.join('; '), payload }); continue; }
        try {
          const t0 = Date.now();
          const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, method: 'POST', headers: reqHeaders, body: JSON.stringify(payload) }),
          });
          const data = await res.json();
          const elapsed = Date.now() - t0;
          if (data.error) {
            update(idx, { status: 'error', message: data.error, payload, responseBody: null, elapsed });
          } else if (data.status >= 200 && data.status < 300) {
            update(idx, { status: 'ok', httpStatus: data.status, payload, responseBody: data.body, elapsed });
          } else {
            const body = data.body;
            const msg = body && typeof body === 'object'
              ? ((body as Record<string, unknown>).title ?? JSON.stringify(body))
              : String(body ?? '');
            update(idx, { status: 'error', httpStatus: data.status, message: String(msg), payload, responseBody: body, elapsed });
          }
        } catch (err: unknown) {
          update(idx, { status: 'error', message: err instanceof Error ? err.message : 'Unknown error', payload });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, failedIndices.length) }, () => worker()));
    clearInterval(interval);
    flush();
    setRunning(false);
    setDone(true);
  };

  const generateSQL = () => {
    if (rows.length === 0) return;

    // CSV column → DB column mapping
    // Nested-id fields: value is item.field.id in the payload
    // Plain fields: value is item.field directly
    const sqlNull = 'NULL';
    const sqlInt = (v: unknown): string => {
      if (v === null || v === undefined || v === '' || String(v) === 'NULL') return sqlNull;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? sqlNull : String(n);
    };
    // For the item id: numeric → unquoted integer, anything else → quoted string
    const sqlId = (v: unknown): string => {
      if (v === null || v === undefined || v === '' || String(v) === 'NULL') return sqlNull;
      const s = String(v).trim();
      if (!s) return sqlNull;
      const n = parseInt(s, 10);
      if (!isNaN(n) && String(n) === s) return s; // clean integer
      return `'${s.replace(/'/g, "''")}'`;         // string (EPC, UUID, etc.)
    };
    const sqlDate = (v: unknown): string => {
      if (v === null || v === undefined || v === '' || String(v) === 'NULL') return sqlNull;
      const s = String(v).trim();
      return s ? `'${s.replace(/'/g, "''")}'` : sqlNull;
    };
    const nestedId = (item: Record<string, unknown>, field: string): string => {
      const val = item[field];
      if (!val || typeof val !== 'object') return sqlNull;
      return sqlInt((val as Record<string, unknown>).id);
    };

    const DB_COLS = [
      'id', 'encodingdate', 'firstseendate', 'lastseendate', 'washnigcycleseed',
      'category_id', 'lastmovementtypeid', 'lastreportlocationid',
      'lastlocationid', 'lastseenworkstationid', 'hs', 'killed', 'reformed',
    ];

    const valueRows: string[] = [];
    const idValues:  string[] = []; // tracked separately for the subclass table
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const { payload, errors } = previewPayloads[i];
      if (errors.length > 0) { skipped++; continue; }
      const item = (payload.item ?? {}) as Record<string, unknown>;
      const id = sqlId(item.id);
      idValues.push(id);
      valueRows.push([
        id,
        sqlDate(item.encodingDate),
        sqlDate(item.firstSeenDate),
        sqlDate(item.lastSeenDate),
        sqlInt(item.washingCycleSeed),
        nestedId(item, 'category'),
        nestedId(item, 'lastMovementType'),
        nestedId(item, 'lastReportLocation'),
        nestedId(item, 'lastSeenLocation'),
        nestedId(item, 'lastSeenWorkstation'),
        'false', 'false', 'false', // hs, killed, reformed
      ].join(', '));
    }

    if (valueRows.length === 0) { alert('No valid rows to export (all have conversion errors).'); return; }

    const colList = DB_COLS.join(', ');
    const conflictCols = DB_COLS.filter(c => c !== 'id').map(c => `  ${c} = EXCLUDED.${c}`).join(',\n');
    const BATCH = 500;
    const lines: string[] = [
      `-- UbiLaundry item import`,
      `-- Generated : ${new Date().toISOString()}`,
      `-- Source    : ${fileName}`,
      `-- Rows      : ${valueRows.length}${skipped > 0 ? ` (${skipped} skipped — conversion errors)` : ''}`,
      '',
    ];

    // Block 1 — main table
    for (let b = 0; b < valueRows.length; b += BATCH) {
      const batch = valueRows.slice(b, b + BATCH);
      lines.push(`INSERT INTO ${sqlTableName || 'item'} (${colList})`);
      lines.push('VALUES');
      lines.push(batch.map((v, idx) => `  (${v})${idx < batch.length - 1 ? ',' : ''}`).join('\n'));
      if (sqlUpsert) {
        lines.push('ON CONFLICT (id) DO UPDATE SET');
        lines.push(conflictCols);
      }
      lines.push(';');
      lines.push('');
    }

    // Block 2 — subclass table (id only)
    if (sqlSubTableName.trim()) {
      const subName = sqlSubTableName.trim();
      for (let b = 0; b < idValues.length; b += BATCH) {
        const batch = idValues.slice(b, b + BATCH);
        lines.push(`INSERT INTO ${subName} (id)`);
        lines.push('VALUES');
        lines.push(batch.map((v, idx) => `  (${v})${idx < batch.length - 1 ? ',' : ''}`).join('\n'));
        lines.push('ON CONFLICT (id) DO NOTHING;');
        lines.push('');
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ubilaundry-import-${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleExpand = (i: number) => setExpandedIdx(prev => prev === i ? null : i);

  const counts    = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {} as Record<RowStatus, number>);
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
        <span className="text-slate-600 text-xs font-mono">v{APP_VERSION}</span>
        <div className="flex-1" />
        {config.baseUrl
          ? <span className="text-xs text-slate-500 font-mono truncate max-w-xs">{config.baseUrl}</span>
          : <span className="text-xs text-yellow-500">Base URL not configured</span>}
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
              <button onClick={(e) => { e.stopPropagation(); reset(); }} className="ml-4 text-slate-500 hover:text-red-400 transition-colors">
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
            {/* Import options */}
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

            {/* SQL Export options */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">SQL Export</h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 shrink-0">Main table</label>
                  <input
                    type="text"
                    value={sqlTableName}
                    onChange={e => setSqlTableName(e.target.value)}
                    placeholder="item"
                    className="bg-slate-900 border border-slate-600 text-white text-xs font-mono rounded px-2 py-1.5 w-36 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 shrink-0">Subclass table</label>
                  <input
                    type="text"
                    value={sqlSubTableName}
                    onChange={e => setSqlSubTableName(e.target.value)}
                    placeholder="item_laundry"
                    className="bg-slate-900 border border-slate-600 text-white text-xs font-mono rounded px-2 py-1.5 w-36 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                  />
                  <span className="text-xs text-slate-600">(id only)</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={sqlUpsert} onChange={e => setSqlUpsert(e.target.checked)} className="accent-blue-500 w-4 h-4" />
                  <span className="text-sm text-slate-300">ON CONFLICT DO UPDATE</span>
                  <span className="text-xs text-slate-500">(upsert — safe to re-run)</span>
                </label>
              </div>
            </div>

            {/* ID Conversion */}
            {envs.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">ID Conversion</h2>
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <label className="text-xs text-slate-400 shrink-0">Source environment</label>
                  <select
                    value={sourceEnvId}
                    onChange={e => { setSourceEnvId(e.target.value); setSelectedTableIds(new Set()); }}
                    className="bg-slate-900 border border-slate-600 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">None (no conversion)</option>
                    {envs.filter(e => !targetEnv || e.id !== targetEnv.id).map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                  {targetEnv && sourceEnvId && <span className="text-xs text-slate-500">→ {targetEnv.name}</span>}
                  {!targetEnv && sourceEnvId && <span className="text-xs text-yellow-500">Active URL not matched to a saved environment</span>}
                </div>
                {sourceEnvId && applicableTables.length === 0 && (
                  <p className="text-xs text-slate-500">No conversion tables defined for this pair.</p>
                )}
                {applicableTables.length > 0 && (
                  <div className="space-y-1.5">
                    {applicableTables.map(t => (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTableIds.has(t.id)}
                          onChange={e => setSelectedTableIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(t.id); else next.delete(t.id);
                            return next;
                          })}
                          className="accent-blue-500 w-3.5 h-3.5"
                        />
                        <span className="text-xs text-slate-300">{t.name}</span>
                        <span className="text-xs text-slate-500">{t.fieldPaths.join(', ')}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Raw data preview table */}
            {results.length === 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-300">Data Preview (first 5 rows)</h2>
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

            {/* Action buttons */}
            {results.length === 0 && (
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
                  onClick={generateSQL}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-emerald-800 text-emerald-300 font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download SQL
                </button>
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

            {/* Results */}
            {results.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                {/* Progress header */}
                <div className="px-4 py-3 border-b border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-emerald-400 font-medium">{counts.ok ?? 0} ok</span>
                      {(counts.error ?? 0) > 0 && <span className="text-red-400 font-medium">{counts.error} error</span>}
                      {(counts.skipped ?? 0) > 0 && <span className="text-slate-500">{counts.skipped} skipped</span>}
                      {(counts.pending ?? 0) > 0 && <span className="text-slate-500">{counts.pending} pending</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {running && <button onClick={stop} className="text-xs text-red-400 hover:text-red-300 px-3 py-1 border border-red-400/30 rounded">Stop</button>}
                      {done && (counts.error ?? 0) > 0 && (
                        <button onClick={retryFailed} className="text-xs text-orange-400 hover:text-orange-300 px-3 py-1 border border-orange-400/30 rounded transition-colors">
                          Retry {counts.error} failed
                        </button>
                      )}
                      {done && <button onClick={reset} className="text-xs text-slate-400 hover:text-white px-3 py-1 border border-slate-600 rounded">New import</button>}
                    </div>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${rows.length > 0 ? (processed / rows.length) * 100 : 0}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{processed} / {rows.length}</p>
                </div>

                {/* Errors only */}
                {results.some(r => r.status === 'error') && (
                  <div className="overflow-y-auto max-h-[460px]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-800 z-10">
                        <tr className="border-b border-slate-700">
                          <th className="text-left px-4 py-2 text-slate-400 font-medium w-10">#</th>
                          <th className="text-left px-4 py-2 text-slate-400 font-medium">ID</th>
                          <th className="text-left px-4 py-2 text-slate-400 font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => r.status !== 'error' ? null : (
                          <Fragment key={i}>
                            <tr onClick={() => toggleExpand(i)}
                              className="border-b border-slate-700/30 cursor-pointer hover:bg-red-900/10 transition-colors">
                              <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                              <td className="px-4 py-2 font-mono text-slate-300 max-w-[180px] truncate">{String(r.row.id ?? '')}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  {r.httpStatus && <span className="text-slate-500 shrink-0">HTTP {r.httpStatus}</span>}
                                  <span className="text-red-400 truncate">{r.message ?? ''}</span>
                                  <span className="text-slate-600 shrink-0 ml-auto">{expandedIdx === i ? '▲' : '▼'}</span>
                                </div>
                              </td>
                            </tr>
                            {expandedIdx === i && (
                              <tr className="bg-slate-950 border-b border-slate-700">
                                <td colSpan={3} className="px-4 py-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Request payload</p>
                                      <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-900 rounded p-3 max-h-64 overflow-y-auto leading-relaxed">
                                        {r.payload ? JSON.stringify(r.payload, null, 2) : '—'}
                                      </pre>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                                        Server response{r.httpStatus ? ` · HTTP ${r.httpStatus}` : ''}
                                      </p>
                                      <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-900 rounded p-3 max-h-64 overflow-y-auto leading-relaxed">
                                        {r.responseBody != null ? JSON.stringify(r.responseBody, null, 2) : r.message ?? '—'}
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

                {done && !(results.some(r => r.status === 'error')) && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-emerald-400 text-sm font-medium">All {counts.ok ?? 0} rows imported successfully.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payload preview panel */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex">
          <div className="flex-1" onClick={() => setShowPreview(false)} />
          <div className="w-full max-w-3xl bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
              <div>
                <h2 className="text-white font-semibold">Payload Preview</h2>
                <p className="text-slate-400 text-xs mt-0.5 font-mono">
                  POST → {config.baseUrl?.replace(/\/$/, '')}/api/assignment
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={runImport} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                  Import {rows.length} items
                </button>
                <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white p-1.5 rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex flex-1 min-h-0">
              {/* Row list */}
              <div className="w-56 shrink-0 border-r border-slate-700 overflow-y-auto">
                {rows.map((r, i) => {
                  const { errors } = previewPayloads[i];
                  return (
                    <button key={i} onClick={() => setPreviewIdx(i)}
                      className={`w-full text-left px-3 py-2.5 text-xs border-b border-slate-800 transition-colors
                        ${previewIdx === i ? 'bg-slate-700 text-white' : errors.length > 0 ? 'text-red-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-800'}`}>
                      <span className="text-slate-600 mr-1.5">#{i + 1}</span>
                      <span className="font-mono">{String(r.id).slice(0, 24)}</span>
                      {errors.length > 0 && <span className="ml-1 text-red-500">⚠</span>}
                    </button>
                  );
                })}
              </div>
              {/* Payload JSON */}
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
                        {previewPayloads[previewIdx].notes.map((n, ni) => (
                          <p key={ni} className="font-mono">{n.fieldPath}: {n.sourceId} {n.detail}</p>
                        ))}
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
