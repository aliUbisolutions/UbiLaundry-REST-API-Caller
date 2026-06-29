'use client';

import { useState, useRef, useCallback, useMemo, useEffect, Fragment } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { endpoints, type Endpoint } from '@/lib/endpoints';
import { APP_VERSION } from '@/lib/version';
import UserBadge from '@/components/UserBadge';
import { useAuth } from '@/components/AuthContext';
import {
  loadEnvironments, loadConversionTables, applyConversions, proxyGet,
  loadFeedTemplates, saveFeedTemplates, genId, ENTITY_TYPES,
  type Environment, type ConversionTable, type FeedTemplate,
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

interface LookupEntry { id: unknown; name: string; }

function findBestId(text: string, items: LookupEntry[]): unknown {
  if (!text || items.length === 0) return null;
  const needle = text.trim().toLowerCase();
  // 1. Exact
  let m = items.find(i => i.name.toLowerCase() === needle);
  if (m) return m.id;
  // 2. Starts with
  m = items.find(i => i.name.toLowerCase().startsWith(needle));
  if (m) return m.id;
  // 3. Contains
  m = items.find(i => i.name.toLowerCase().includes(needle));
  if (m) return m.id;
  // 4. All words present
  const words = needle.split(/\s+/).filter(Boolean);
  m = items.find(i => words.every(w => i.name.toLowerCase().includes(w)));
  return m ? m.id : null;
}

function resolveFixed(value: string): unknown {
  if (value.trim() === '__now') return new Date().toISOString();
  return coerce(value);
}

function rowToJson(
  row: Record<string, unknown>,
  fixedFields: { key: string; value: string }[],
  trimColumns?: Set<string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const { key, value } of fixedFields) {
    if (key.trim()) setPath(result, key.trim(), resolveFixed(value));
  }
  for (const [k, v] of Object.entries(row)) {
    const key = k.trim();
    if (!key || key === '__EMPTY') continue;
    const val = (trimColumns?.has(key) && v !== null && v !== undefined)
      ? String(v).replace(/\s+/g, '')
      : v;
    setPath(result, key, coerce(val));
  }
  return result;
}

function rowToJsonMapped(
  row: Record<string, unknown>,
  mappings: Record<string, string>,
  fixedFields: { key: string; value: string }[],
  trimColumns: Set<string>,
  templateValues: Record<string, unknown>,
  lookupItems: Record<string, LookupEntry[] | undefined>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const { key, value } of fixedFields) {
    if (key.trim()) setPath(result, key.trim(), resolveFixed(value));
  }
  for (const [fieldPath, src] of Object.entries(mappings)) {
    if (!src) continue;
    if (src === '__null') {
      setPath(result, fieldPath, null);
    } else if (src === '__template') {
      setPath(result, fieldPath, templateValues[fieldPath] ?? null);
    } else {
      const raw = row[src] ?? null;
      const val = (trimColumns.has(src) && raw !== null && raw !== undefined)
        ? String(raw).replace(/\s+/g, '')
        : raw;
      if (fieldPath in lookupItems) {
        const items = lookupItems[fieldPath];
        const text = val !== null && val !== undefined ? String(val) : null;
        setPath(result, fieldPath, (text && items) ? (findBestId(text, items) ?? null) : null);
      } else {
        setPath(result, fieldPath, coerce(val));
      }
    }
  }
  return result;
}


function extractPathsWithValues(obj: unknown, prefix = ''): { path: string; value: unknown }[] {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return prefix ? [{ path: prefix, value: obj }] : [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) return extractPathsWithValues(v, path);
    return [{ path, value: v }];
  });
}

// ─── File parsing ─────────────────────────────────────────────────────────────

function parseSheetRows(ws: XLSX.WorkSheet, hasHeader: boolean): Record<string, unknown>[] {
  if (!hasHeader) {
    const arrays = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: false });
    if (arrays.length === 0) return [];
    const numCols = Math.max(...arrays.map(row => (row as unknown[]).length));
    const colNames = Array.from({ length: numCols }, (_, i) => `Column ${i + 1}`);
    return arrays.map(row => {
      const obj: Record<string, unknown> = {};
      colNames.forEach((h, i) => { obj[h] = (row as unknown[])[i] ?? ''; });
      return obj;
    }).filter(r => Object.values(r).some(v => v !== '' && v !== null));
  }
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
  return raw.filter(r => Object.values(r).some(v => v !== '' && v !== null));
}

function parseFile(
  file: File,
  hasHeader: boolean,
  selectedSheets?: string[],
): Promise<{ rows: Record<string, unknown>[]; sheetNames: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary', raw: false });
        const sheetNames = wb.SheetNames;
        const target = selectedSheets ?? sheetNames;
        const rows: Record<string, unknown>[] = [];
        for (const name of target) {
          const ws = wb.Sheets[name];
          if (ws) rows.push(...parseSheetRows(ws, hasHeader));
        }
        resolve({ rows, sheetNames });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

// ─── SOAP helpers ─────────────────────────────────────────────────────────────

function escapeXmlFeed(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function jsonToXml(obj: Record<string, unknown>, depth: number): string {
  const pad = '  '.repeat(depth);
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => {
      if (typeof v === 'object' && !Array.isArray(v)) {
        const inner = jsonToXml(v as Record<string, unknown>, depth + 1);
        return inner ? `${pad}<${k}>\n${inner}\n${pad}</${k}>` : `${pad}<${k}/>`;
      }
      return `${pad}<${k}>${escapeXmlFeed(v)}</${k}>`;
    })
    .join('\n');
}

function buildFeedSoapEnvelope(
  itemJson: Record<string, unknown>,
  macroName: string,
  paramName: string,
  xsiType: string,
  reassign: boolean,
): string {
  const itemXml = jsonToXml(itemJson, 5);
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://ws.ubimanager.ubisolutions.net/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <tns:executeMacro>
      <macro>${escapeXmlFeed(macroName)}</macro>
      <params>
        <params>
          <name>${escapeXmlFeed(paramName)}</name>
          <value xsi:type="${escapeXmlFeed(xsiType)}">
${itemXml}
          </value>
        </params>
        <params>
          <name>reassign</name>
          <value xsi:type="xsd:boolean">${reassign}</value>
        </params>
      </params>
    </tns:executeMacro>
  </soap:Body>
</soap:Envelope>`;
}

function parseFeedSoapFault(xml: string): string | null {
  const m = xml.match(/<(?:[\w]+:)?faultstring[^>]*>([\s\S]*?)<\/(?:[\w]+:)?faultstring>/i);
  if (m) return m[1].trim();
  return /<(?:[\w]+:)?Fault[\s>]/i.test(xml) ? 'SOAP Fault (no detail)' : null;
}

// ─── SOAP presets ─────────────────────────────────────────────────────────────

const SOAP_PRESETS: Record<string, { macro: string; paramName: string; xsiType: string; fieldPaths: string[] }> = {
  Assignment: {
    macro: 'Assignment',
    paramName: 'item',
    xsiType: 'tns:Item',
    fieldPaths: [
      'encodingDate',
      'firstSeenDate',
      'lastSeenDate',
      'category.id',
      'lastSeenLocation.id',
      'lastSeenWorkstation.id',
      'lastMovementType.id',
      'lastReportLocation.id',
      'comment',
    ],
  },
};

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

export default function FeedPage() {
  const { user } = useAuth();

  const postEndpoints = useMemo(() => {
    const all = endpoints.filter(e => e.method === 'POST');
    if (!user || user.allowedEndpoints === 'all') return all;
    const allowed = new Set(user.allowedEndpoints as string[]);
    return all.filter(e => allowed.has(e.id));
  }, [user]);

  const [config] = useState<Config>(() => {
    try { return JSON.parse(localStorage.getItem('ubilaundry-config') ?? '{}'); } catch { return {}; }
  });

  const [selectedId, setSelectedId] = useState<string>('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fixedFields, setFixedFields] = useState<{ key: string; value: string }[]>([]);
  const [trimColumns, setTrimColumns] = useState<Set<string>>(new Set());
  const [useMappingMode, setUseMappingMode] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [results, setResults] = useState<RowResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [templates, setTemplates] = useState<FeedTemplate[]>(() => { try { return loadFeedTemplates(); } catch { return []; } });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [fieldLookups, setFieldLookups] = useState<Record<string, { entityType: string; envId: string }>>({});
  const [lookupCache, setLookupCache] = useState<Record<string, LookupEntry[]>>({});
  const [lookupLoading, setLookupLoading] = useState<Set<string>>(new Set());
  const abortRef       = useRef(false);
  const fileRef        = useRef<HTMLInputElement>(null);
  const pendingRef     = useRef<Map<number, Partial<RowResult>>>(new Map());
  const currentFileRef = useRef<File | null>(null);
  const mountedRef     = useRef(false);

  // SOAP state
  const [feedProtocol, setFeedProtocol] = useState<'rest' | 'soap'>('rest');
  const [soapPath, setSoapPath]         = useState('/ws');
  const [soapMacro, setSoapMacro]       = useState('Assignment');
  const [soapParamName, setSoapParamName] = useState('item');
  const [soapXsiType, setSoapXsiType]   = useState('tns:Item');
  const [soapReassign, setSoapReassign] = useState(true);
  const [soapFieldPaths, setSoapFieldPaths] = useState<string[]>([]);

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

  const columnNames = useMemo(
    () => rows.length > 0 ? Object.keys(rows[0]).filter(k => k && k !== '__EMPTY') : [],
    [rows],
  );

  const endpoint: Endpoint | undefined = useMemo(
    () => postEndpoints.find(e => e.id === selectedId),
    [selectedId]
  );

  const templateFields: { path: string; value: unknown }[] = useMemo(() => {
    if (!endpoint?.body) return [];
    try { return extractPathsWithValues(JSON.parse(endpoint.body)); } catch { return []; }
  }, [endpoint]);

  const templatePaths = useMemo(() => templateFields.map(f => f.path), [templateFields]);

  const effectivePaths = useMemo(
    () => feedProtocol === 'soap' ? soapFieldPaths : templatePaths,
    [feedProtocol, soapFieldPaths, templatePaths],
  );

  const templateValues = useMemo(() => {
    const map: Record<string, unknown> = {};
    for (const { path, value } of templateFields) map[path] = value;
    return map;
  }, [templateFields]);

  const buildRaw = useCallback(
    (row: Record<string, unknown>) => {
      if (!useMappingMode && feedProtocol !== 'soap') return rowToJson(row, fixedFields, trimColumns);
      const resolvedLookups: Record<string, LookupEntry[] | undefined> = {};
      for (const [fieldPath, cfg] of Object.entries(fieldLookups)) {
        resolvedLookups[fieldPath] = lookupCache[`${cfg.envId}:${cfg.entityType}`];
      }
      return rowToJsonMapped(row, fieldMappings, fixedFields, trimColumns, templateValues, resolvedLookups);
    },
    [useMappingMode, feedProtocol, fieldMappings, fixedFields, trimColumns, templateValues, fieldLookups, lookupCache],
  );

  const previewPayloads = useMemo(() =>
    rows.map(row => {
      const raw = buildRaw(row);
      if (!useConversion || selectedTableIds.length === 0) return { payload: raw, errors: [] as string[], notes: [] as string[] };
      const tables = allTables.filter(t => selectedTableIds.includes(t.id));
      const { converted, errors, notes } = applyConversions(raw, tables);
      return {
        payload: converted as Record<string, unknown>,
        errors,
        notes: notes.map(n => `${n.fieldPath}: ${n.sourceId} ${n.detail}`),
      };
    }),
    [rows, buildRaw, useConversion, selectedTableIds, allTables]
  );

  const previewRow = useMemo(
    () => rows.length > 0 ? JSON.stringify(buildRaw(rows[0]), null, 2) : '',
    [rows, buildRaw],
  );

  // Group endpoints for the selector
  const grouped = useMemo(() => {
    const map: Record<string, Endpoint[]> = {};
    for (const ep of postEndpoints) {
      const key = ep.group + (ep.subgroup ? ` › ${ep.subgroup}` : '');
      if (!map[key]) map[key] = [];
      map[key].push(ep);
    }
    return map;
  }, []);

  const loadFile = useCallback(async (file: File, useHeader: boolean, sheets?: string[]) => {
    currentFileRef.current = file;
    setParseError('');
    setRows([]);
    setResults([]);
    setDone(false);
    setFileName(file.name);
    setTrimColumns(new Set());
    try {
      const { rows: parsed, sheetNames: detected } = await parseFile(file, useHeader, sheets);
      setSheetNames(detected);
      if (!sheets) setSelectedSheets(detected);
      if (!parsed.length) { setParseError('No data rows found in the file.'); return; }
      setRows(parsed);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) loadFile(f, hasHeader);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0]; if (f) loadFile(f, hasHeader);
  };

  const toggleSheet = (name: string) => {
    const next = selectedSheets.includes(name)
      ? selectedSheets.filter(s => s !== name)
      : [...selectedSheets, name];
    setSelectedSheets(next);
    if (currentFileRef.current && next.length > 0) loadFile(currentFileRef.current, hasHeader, next);
  };

  const selectAllSheets = () => {
    setSelectedSheets(sheetNames);
    if (currentFileRef.current) loadFile(currentFileRef.current, hasHeader, sheetNames);
  };

  // Re-parse immediately when hasHeader toggles (skip on initial mount)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (currentFileRef.current) loadFile(currentFileRef.current, hasHeader, selectedSheets.length > 0 ? selectedSheets : undefined);
  }, [hasHeader]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFixed = (i: number, field: 'key' | 'value', val: string) =>
    setFixedFields(prev => prev.map((ff, idx) => idx === i ? { ...ff, [field]: val } : ff));

  const addFixed = () => setFixedFields(prev => [...prev, { key: '', value: '' }]);
  const removeFixed = (i: number) => setFixedFields(prev => prev.filter((_, idx) => idx !== i));

  const toggleTrimColumn = (col: string) =>
    setTrimColumns(prev => { const next = new Set(prev); if (next.has(col)) next.delete(col); else next.add(col); return next; });

  const loadLookupEntities = useCallback(async (envId: string, entityType: string) => {
    if (!envId || !entityType) return;
    const key = `${envId}:${entityType}`;
    if (lookupCache[key] || lookupLoading.has(key)) return;
    setLookupLoading(prev => new Set([...prev, key]));
    try {
      const env = allEnvs.find(e => e.id === envId);
      if (!env) return;
      const raw = await proxyGet(env, `/api/entities/${entityType}`);
      const data = (raw as Record<string, unknown>[])
        .map(o => ({ id: o.id, name: String(o.name ?? o.id ?? '') }))
        .filter(o => o.id !== undefined && o.id !== null && o.id !== '');
      setLookupCache(prev => ({ ...prev, [key]: data }));
    } catch { /* silently ignore — preview will show null */ }
    finally { setLookupLoading(prev => { const next = new Set(prev); next.delete(key); return next; }); }
  }, [lookupCache, lookupLoading, allEnvs]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFieldLookup = (path: string, cfg: { entityType: string; envId: string } | null) => {
    setFieldLookups(prev => {
      const next = { ...prev };
      if (cfg) { next[path] = cfg; loadLookupEntities(cfg.envId, cfg.entityType); }
      else delete next[path];
      return next;
    });
  };

  const handleToggleMappingMode = (enabled: boolean) => {
    setUseMappingMode(enabled);
    if (enabled) {
      const init: Record<string, string> = {};
      for (const path of effectivePaths) {
        const basename = path.split('.').pop() ?? path;
        const match = columnNames.find(c =>
          c === path || c === basename ||
          c.toLowerCase() === path.toLowerCase() ||
          c.toLowerCase() === basename.toLowerCase()
        );
        const hasTemplateVal = templateValues[path] !== null && templateValues[path] !== undefined && templateValues[path] !== '';
        init[path] = match ?? (hasTemplateVal ? '__template' : '');
      }
      setFieldMappings(init);
    } else {
      setFieldMappings({});
      setFieldLookups({});
    }
  };

  // When a new file is loaded (columnNames changes) while mapping mode is on,
  // preserve existing valid mappings and try to re-match the rest.
  useEffect(() => {
    if (!useMappingMode || effectivePaths.length === 0 || columnNames.length === 0) return;
    setFieldMappings(prev => {
      const next: Record<string, string> = {};
      for (const path of effectivePaths) {
        const prevSrc = prev[path] ?? '';
        if (prevSrc === '__null') { next[path] = '__null'; continue; }
        if (prevSrc && columnNames.includes(prevSrc)) { next[path] = prevSrc; continue; }
        const basename = path.split('.').pop() ?? path;
        const match = columnNames.find(c =>
          c === path || c === basename ||
          c.toLowerCase() === path.toLowerCase() ||
          c.toLowerCase() === basename.toLowerCase()
        );
        const hasTemplateVal = templateValues[path] !== null && templateValues[path] !== undefined && templateValues[path] !== '';
        next[path] = match ?? (hasTemplateVal ? '__template' : '');
      }
      return next;
    });
  }, [columnNames]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setRows([]); setResults([]); setFileName(''); setParseError('');
    setDone(false); setShowPreview(false); setExpandedIdx(null);
    setTrimColumns(new Set());
    setUseMappingMode(false);
    setFieldMappings({});
    setFieldLookups({});
    setSheetNames([]); setSelectedSheets([]);
    currentFileRef.current = null;
    if (fileRef.current) fileRef.current.value = '';
    // Don't reset soapFieldPaths — user keeps their field list when re-uploading a file
  };

  const confirmSaveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    const tpl: FeedTemplate = {
      id: genId(),
      name,
      endpointId: selectedId,
      hasHeader,
      trimColumns: [...trimColumns],
      useMappingMode,
      fieldMappings: { ...fieldMappings },
      fixedFields: fixedFields.map(f => ({ ...f })),
      fieldLookups: { ...fieldLookups },
      ...(feedProtocol === 'soap' ? {
        soapMode: true, soapPath, soapMacro, soapParamName, soapXsiType, soapReassign,
        soapFieldPaths: [...soapFieldPaths],
      } : {}),
    };
    const next = [...templates, tpl];
    setTemplates(next);
    saveFeedTemplates(next);
    setTemplateName('');
    setSavingTemplate(false);
  };

  const applyTemplate = (tpl: FeedTemplate) => {
    setSelectedId(tpl.endpointId);
    setHasHeader(tpl.hasHeader);
    setTrimColumns(new Set(tpl.trimColumns));
    setUseMappingMode(tpl.useMappingMode);
    setFieldMappings({ ...tpl.fieldMappings });
    setFixedFields(tpl.fixedFields.map(f => ({ ...f })));
    const lookups = tpl.fieldLookups ?? {};
    setFieldLookups(lookups);
    for (const cfg of Object.values(lookups)) loadLookupEntities(cfg.envId, cfg.entityType);
    if (tpl.soapMode) {
      setFeedProtocol('soap');
      if (tpl.soapPath !== undefined) setSoapPath(tpl.soapPath);
      if (tpl.soapMacro !== undefined) setSoapMacro(tpl.soapMacro);
      if (tpl.soapParamName !== undefined) setSoapParamName(tpl.soapParamName);
      if (tpl.soapXsiType !== undefined) setSoapXsiType(tpl.soapXsiType);
      if (tpl.soapReassign !== undefined) setSoapReassign(tpl.soapReassign);
      if (tpl.soapFieldPaths) setSoapFieldPaths([...tpl.soapFieldPaths]);
    } else {
      setFeedProtocol('rest');
      setSoapFieldPaths([]);
    }
  };

  const deleteTemplate = (id: string) => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    saveFeedTemplates(next);
  };

  const retryFailed = async () => {
    const failedIndices = results.map((r, i) => r.status === 'error' ? i : -1).filter(i => i >= 0);
    if (failedIndices.length === 0 || (feedProtocol === 'rest' && !endpoint)) return;
    if (!config.baseUrl) { alert('Configure the Base URL first.'); return; }

    abortRef.current = false;
    setRunning(true);
    setDone(false);
    setExpandedIdx(null);
    setResults(prev => prev.map((r, i) => failedIndices.includes(i) ? { ...r, status: 'pending' } : r));

    const url = feedProtocol === 'soap'
      ? `${config.baseUrl.replace(/\/$/, '')}${soapPath || '/ws'}`
      : endpoint!.url.replace('{{baseURL}}', config.baseUrl.replace(/\/$/, ''));
    const headers: Record<string, string> = feedProtocol === 'soap'
      ? { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '""' }
      : { 'Content-Type': 'application/json', Accept: 'application/json' };
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
          const bodyStr = feedProtocol === 'soap'
            ? buildFeedSoapEnvelope(finalJson, soapMacro, soapParamName, soapXsiType, soapReassign)
            : JSON.stringify(finalJson);
          const proxyReq = feedProtocol === 'soap'
            ? { url, method: 'POST', headers, body: bodyStr }
            : { url, method: 'POST', headers, body: bodyStr, endpointId: selectedId };
          const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proxyReq),
          });
          if (res.status === 401 || res.redirected) {
            abortRef.current = true;
            update(idx, { status: 'error', message: 'Session expired — please log in again' });
            continue;
          }
          const data = await res.json();
          const elapsed = Date.now() - t0;
          if (data.error) {
            update(idx, { status: 'error', message: data.error, payload: finalJson, responseBody: null, elapsed });
          } else if (data.status >= 200 && data.status < 300) {
            if (feedProtocol === 'soap') {
              const fault = parseFeedSoapFault(String(data.body ?? ''));
              if (fault) {
                update(idx, { status: 'error', httpStatus: data.status, message: fault, payload: finalJson, responseBody: data.body, elapsed });
              } else {
                const status: RowStatus = substitutionNotes ? 'ok-substituted' : 'ok';
                update(idx, { status, httpStatus: data.status, notes: substitutionNotes || undefined, payload: finalJson, responseBody: data.body, elapsed });
              }
            } else {
              const status: RowStatus = substitutionNotes ? 'ok-substituted' : 'ok';
              update(idx, { status, httpStatus: data.status, notes: substitutionNotes || undefined, payload: finalJson, responseBody: data.body, elapsed });
            }
          } else {
            const body = data.body;
            const msg = feedProtocol === 'soap'
              ? (parseFeedSoapFault(String(body ?? '')) ?? String(body ?? ''))
              : body && typeof body === 'object'
                ? String((body as Record<string, unknown>).title ?? JSON.stringify(body))
                : String(body ?? '');
            update(idx, { status: 'error', httpStatus: data.status, message: msg, payload: finalJson, responseBody: body, elapsed });
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
    if ((feedProtocol === 'rest' && !endpoint) || rows.length === 0) return;

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

    const url = feedProtocol === 'soap'
      ? `${config.baseUrl.replace(/\/$/, '')}${soapPath || '/ws'}`
      : endpoint!.url.replace('{{baseURL}}', config.baseUrl.replace(/\/$/, ''));
    const headers: Record<string, string> = feedProtocol === 'soap'
      ? { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '""' }
      : { 'Content-Type': 'application/json', Accept: 'application/json' };
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
          const bodyStr = feedProtocol === 'soap'
            ? buildFeedSoapEnvelope(finalJson, soapMacro, soapParamName, soapXsiType, soapReassign)
            : JSON.stringify(finalJson);
          const proxyReq = feedProtocol === 'soap'
            ? { url, method: 'POST', headers, body: bodyStr }
            : { url, method: 'POST', headers, body: bodyStr, endpointId: selectedId };
          const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proxyReq),
          });
          if (res.status === 401 || res.redirected) {
            abortRef.current = true;
            update(idx, { status: 'error', message: 'Session expired — please log in again' });
            continue;
          }
          const data = await res.json();
          const elapsed = Date.now() - t0;
          if (data.error) {
            update(idx, { status: 'error', message: data.error, payload: finalJson, responseBody: null, elapsed });
          } else if (data.status >= 200 && data.status < 300) {
            if (feedProtocol === 'soap') {
              const fault = parseFeedSoapFault(String(data.body ?? ''));
              if (fault) {
                update(idx, { status: 'error', httpStatus: data.status, message: fault, payload: finalJson, responseBody: data.body, elapsed });
              } else {
                const status: RowStatus = substitutionNotes ? 'ok-substituted' : 'ok';
                update(idx, { status, httpStatus: data.status, notes: substitutionNotes || undefined, payload: finalJson, responseBody: data.body, elapsed });
              }
            } else {
              const status: RowStatus = substitutionNotes ? 'ok-substituted' : 'ok';
              update(idx, { status, httpStatus: data.status, notes: substitutionNotes || undefined, payload: finalJson, responseBody: data.body, elapsed });
            }
          } else {
            const body = data.body;
            const msg = feedProtocol === 'soap'
              ? (parseFeedSoapFault(String(body ?? '')) ?? String(body ?? ''))
              : body && typeof body === 'object'
                ? String((body as Record<string, unknown>).title ?? JSON.stringify(body))
                : String(body ?? '');
            update(idx, { status: 'error', httpStatus: data.status, message: msg, payload: finalJson, responseBody: body, elapsed });
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

        {/* Templates bar */}
        {(templates.length > 0 || selectedId) && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Templates</span>
            <div className="flex flex-wrap gap-2 flex-1">
              {templates.map(tpl => (
                <div key={tpl.id} className="flex items-center">
                  <button
                    onClick={() => applyTemplate(tpl)}
                    title={`Load template: ${tpl.name}`}
                    className="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-l transition-colors"
                  >
                    {tpl.name}
                  </button>
                  <button
                    onClick={() => deleteTemplate(tpl.id)}
                    title="Delete template"
                    className="text-xs px-1.5 py-1 bg-slate-700 hover:bg-red-900/40 text-slate-500 hover:text-red-400 rounded-r border-l border-slate-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {savingTemplate ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmSaveTemplate();
                    if (e.key === 'Escape') { setSavingTemplate(false); setTemplateName(''); }
                  }}
                  placeholder="Template name…"
                  className="text-xs bg-slate-900 border border-slate-600 text-white rounded px-2 py-1 focus:outline-none focus:border-blue-500 w-40"
                />
                <button onClick={confirmSaveTemplate} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Save</button>
                <button onClick={() => { setSavingTemplate(false); setTemplateName(''); }} className="text-xs text-slate-500 hover:text-slate-400 transition-colors">Cancel</button>
              </div>
            ) : (
              (selectedId || feedProtocol === 'soap') && (
                <button onClick={() => setSavingTemplate(true)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0">
                  + Save as template
                </button>
              )
            )}
          </div>
        )}

        {/* Step 1 — Endpoint */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
            Select target endpoint
          </h2>

          {/* Protocol toggle */}
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <span className="text-xs text-slate-400">Protocol</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="feed-protocol" value="rest" checked={feedProtocol === 'rest'} onChange={() => setFeedProtocol('rest')} className="accent-blue-500" />
              <span className="text-sm text-slate-300">REST</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="feed-protocol" value="soap" checked={feedProtocol === 'soap'} onChange={() => { setFeedProtocol('soap'); setSelectedId(''); }} className="accent-blue-500" />
              <span className="text-sm text-slate-300">SOAP</span>
            </label>
          </div>

          {feedProtocol === 'rest' && (
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
          )}

          {feedProtocol === 'soap' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 shrink-0">Path</label>
                  <input
                    type="text"
                    value={soapPath}
                    onChange={e => setSoapPath(e.target.value)}
                    placeholder="/ws"
                    className="bg-slate-900 border border-slate-600 text-white text-xs font-mono rounded px-2 py-1.5 w-28 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 shrink-0">Macro</label>
                  <input
                    type="text"
                    value={soapMacro}
                    onChange={e => setSoapMacro(e.target.value)}
                    placeholder="Assignment"
                    className="bg-slate-900 border border-slate-600 text-white text-xs font-mono rounded px-2 py-1.5 w-36 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={soapReassign} onChange={e => setSoapReassign(e.target.checked)} className="accent-violet-500 w-4 h-4" />
                  <span className="text-sm text-slate-300">Reassign</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 shrink-0">Param name</label>
                  <input
                    type="text"
                    value={soapParamName}
                    onChange={e => setSoapParamName(e.target.value)}
                    placeholder="item"
                    className="bg-slate-900 border border-slate-600 text-slate-400 text-xs font-mono rounded px-2 py-1.5 w-24 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 shrink-0">XSI type</label>
                  <input
                    type="text"
                    value={soapXsiType}
                    onChange={e => setSoapXsiType(e.target.value)}
                    placeholder="tns:Item"
                    className="bg-slate-900 border border-slate-600 text-slate-400 text-xs font-mono rounded px-2 py-1.5 w-28 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500">Presets:</span>
                {Object.entries(SOAP_PRESETS).map(([name, preset]) => (
                  <button
                    key={name}
                    onClick={() => {
                      setSoapMacro(preset.macro);
                      setSoapParamName(preset.paramName);
                      setSoapXsiType(preset.xsiType);
                      setSoapFieldPaths([...preset.fieldPaths]);
                      if (!useMappingMode) handleToggleMappingMode(true);
                    }}
                    className="text-xs px-2.5 py-1 rounded border border-violet-700 text-violet-300 hover:bg-violet-900/40 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
              <p className="font-mono text-xs text-violet-300 bg-slate-900 rounded px-3 py-2 break-all">
                POST {config.baseUrl?.replace(/\/$/, '') || '<baseURL>'}{soapPath || '/ws'} → executeMacro({soapMacro || 'Assignment'})
              </p>
            </div>
          )}

          {endpoint && feedProtocol === 'rest' && (
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

        {(endpoint || feedProtocol === 'soap') && (
          <>
            {/* Step 2 — File */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
                Upload CSV or Excel file
              </h2>

              {/* Parse options */}
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={e => setHasHeader(e.target.checked)}
                    className="accent-blue-500 w-4 h-4"
                  />
                  <span className="text-sm text-slate-300">First row is header</span>
                </label>
                {!hasHeader && (
                  <span className="text-xs text-slate-500">Columns will be named Column 1, Column 2, … — assign them in the mapping step below</span>
                )}
              </div>

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

              {/* Sheet selector — only for multi-sheet workbooks */}
              {sheetNames.length > 1 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs text-slate-400">Sheets to import:</p>
                    {selectedSheets.length < sheetNames.length && (
                      <button onClick={selectAllSheets} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">select all</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sheetNames.map(name => {
                      const active = selectedSheets.includes(name);
                      return (
                        <button
                          key={name}
                          onClick={() => toggleSheet(name)}
                          className={`text-xs px-2 py-1 rounded font-mono transition-colors ${
                            active
                              ? 'bg-blue-900/30 border border-blue-600 text-blue-300'
                              : 'bg-slate-900 border border-slate-700 text-slate-500 hover:border-slate-500'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Column names + strip-spaces toggles */}
              {rows.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2">
                    Detected columns → JSON paths (use dots for nesting, e.g. <code className="text-slate-400">category.id</code>).{' '}
                    <span className="text-amber-500">Click a column to strip spaces from its values.</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(rows[0]).filter(k => k && k !== '__EMPTY').map(col => {
                      const active = trimColumns.has(col);
                      return (
                        <button
                          key={col}
                          onClick={() => toggleTrimColumn(col)}
                          title={active ? 'Space stripping ON — click to disable' : 'Click to strip all spaces from this column'}
                          className={`text-xs px-2 py-1 rounded font-mono transition-colors flex items-center gap-1 ${
                            active
                              ? 'bg-amber-900/30 border border-amber-600 text-amber-300'
                              : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {active && <span className="text-amber-400 text-[10px] leading-none">✂</span>}
                          {col}
                        </button>
                      );
                    })}
                  </div>
                  {trimColumns.size > 0 && (
                    <p className="text-xs text-amber-400 mt-2">
                      Stripping spaces from: {[...trimColumns].join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Step 3 — Column mapping */}
            {rows.length > 0 && (effectivePaths.length > 0 || feedProtocol === 'soap') && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
                  Column mapping
                  <span className="text-slate-500 font-normal text-xs ml-1">— link {feedProtocol === 'soap' ? 'SOAP item fields' : 'template fields'} to file columns</span>
                </h2>

                {/* SOAP mode: user-defined field paths */}
                {feedProtocol === 'soap' && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2">Define the SOAP item fields to populate from file columns:</p>
                    <div className="space-y-1.5">
                      {soapFieldPaths.map((path, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={path}
                            onChange={e => {
                              const oldPath = soapFieldPaths[i];
                              const newPath = e.target.value;
                              setSoapFieldPaths(prev => { const n = [...prev]; n[i] = newPath; return n; });
                              if (oldPath && oldPath !== newPath) {
                                setFieldMappings(prev => {
                                  const m = { ...prev };
                                  if (oldPath in m) { m[newPath] = m[oldPath]; delete m[oldPath]; }
                                  return m;
                                });
                              }
                            }}
                            placeholder="e.g. id  or  category.id"
                            className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
                          />
                          <button
                            onClick={() => {
                              setSoapFieldPaths(prev => prev.filter((_, idx) => idx !== i));
                              setFieldMappings(prev => { const m = { ...prev }; delete m[path]; return m; });
                              setFieldLookup(path, null);
                            }}
                            className="text-slate-500 hover:text-red-400 transition-colors px-1"
                          >×</button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setSoapFieldPaths(prev => [...prev, '']);
                        if (!useMappingMode) handleToggleMappingMode(true);
                      }}
                      className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      + Add field
                    </button>
                  </div>
                )}

                {feedProtocol === 'rest' && (
                  <label className="flex items-center gap-2 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={useMappingMode}
                      onChange={e => handleToggleMappingMode(e.target.checked)}
                      className="accent-blue-500 w-4 h-4"
                    />
                    <span className="text-sm text-slate-300">Use column mapping</span>
                  </label>
                )}

                {(useMappingMode || feedProtocol === 'soap') && effectivePaths.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 pr-6 text-slate-400 font-medium">{feedProtocol === 'soap' ? 'SOAP field' : 'Template field'}</th>
                          <th className="text-left py-2 text-slate-400 font-medium">Source column</th>
                        </tr>
                      </thead>
                      <tbody>
                        {effectivePaths.map(path => {
                          const src = fieldMappings[path] ?? '';
                          const isColumn = src && src !== '__null' && src !== '__template';
                          const lookup = fieldLookups[path] ?? null;
                          const cacheKey = lookup ? `${lookup.envId}:${lookup.entityType}` : '';
                          const cacheEntries = cacheKey ? lookupCache[cacheKey] : undefined;
                          const isLoadingLookup = cacheKey ? lookupLoading.has(cacheKey) : false;
                          return (
                            <tr key={path} className="border-b border-slate-700/40">
                              <td className="py-2 pr-6 font-mono text-slate-300 whitespace-nowrap align-top pt-3">{path}</td>
                              <td className="py-2 w-full">
                                <div className="flex items-center gap-2">
                                  <select
                                    value={src}
                                    onChange={e => {
                                      setFieldMappings(prev => ({ ...prev, [path]: e.target.value }));
                                      if (!e.target.value || e.target.value === '__null' || e.target.value === '__template') {
                                        setFieldLookup(path, null);
                                      }
                                    }}
                                    className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                                  >
                                    <option value="">— ignore —</option>
                                    <option value="__null">null</option>
                                    {feedProtocol === 'rest' && templateValues[path] !== null && templateValues[path] !== undefined && templateValues[path] !== '' && (
                                      <option value="__template">← keep: {String(templateValues[path])}</option>
                                    )}
                                    {columnNames.map((col, i) => (
                                      <option key={col} value={col}>#{i + 1} · {col}</option>
                                    ))}
                                  </select>
                                  <label
                                    className={`flex items-center gap-1 shrink-0 ${isColumn ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}
                                    title="Match column text to object name and use its ID"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!!lookup}
                                      disabled={!isColumn}
                                      onChange={e => setFieldLookup(path, e.target.checked
                                        ? { entityType: ENTITY_TYPES[0], envId: allEnvs[0]?.id ?? '' }
                                        : null
                                      )}
                                      className="accent-violet-500 w-3.5 h-3.5"
                                    />
                                    <span className="text-slate-400 text-[11px]">→ ID</span>
                                  </label>
                                </div>
                                {lookup && (
                                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                    <select
                                      value={lookup.entityType}
                                      onChange={e => setFieldLookup(path, { ...lookup, entityType: e.target.value })}
                                      className="bg-slate-900 border border-violet-700 text-violet-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-violet-500"
                                    >
                                      {ENTITY_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                                    </select>
                                    <span className="text-slate-600 text-[11px]">from</span>
                                    <select
                                      value={lookup.envId}
                                      onChange={e => setFieldLookup(path, { ...lookup, envId: e.target.value })}
                                      className="bg-slate-900 border border-violet-700 text-violet-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-violet-500"
                                    >
                                      {allEnvs.length === 0
                                        ? <option value="">— no environments —</option>
                                        : allEnvs.map(env => <option key={env.id} value={env.id}>{env.name}</option>)
                                      }
                                    </select>
                                    {isLoadingLookup && <span className="text-slate-500 text-[11px]">loading…</span>}
                                    {cacheEntries && !isLoadingLookup && (
                                      <span className="text-violet-400 text-[11px]">{cacheEntries.length} entries</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Step 4 — Fixed fields + preview */}
            {rows.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">4</span>
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
                          {ff.value === '__now' ? (
                            <div className="flex-1 flex items-center gap-1">
                              <span className="flex-1 bg-slate-900 border border-violet-700 text-violet-300 text-xs rounded px-2 py-1.5 font-mono">
                                current datetime
                              </span>
                              <button
                                onClick={() => updateFixed(i, 'value', '')}
                                className="text-slate-600 hover:text-slate-400 text-xs px-1"
                                title="Clear"
                              >×</button>
                            </div>
                          ) : (
                            <>
                              <input
                                type="text"
                                value={ff.value}
                                onChange={e => updateFixed(i, 'value', e.target.value)}
                                placeholder="value"
                                className="flex-1 bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                              />
                              <button
                                onClick={() => updateFixed(i, 'value', '__now')}
                                title="Use current datetime"
                                className="text-slate-500 hover:text-violet-400 transition-colors shrink-0 text-xs px-1"
                              >
                                ⏱
                              </button>
                            </>
                          )}
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

            {/* Step 5 — Conversion */}
            {rows.length > 0 && results.length === 0 && allEnvs.length > 1 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold shrink-0">5</span>
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
                  {feedProtocol === 'soap' ? `Send ${rows.length} rows via SOAP` : `Send ${rows.length} rows to API`}
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
      {showPreview && (endpoint || feedProtocol === 'soap') && (
        <div className="fixed inset-0 bg-black/70 z-50 flex">
          <div className="flex-1" onClick={() => setShowPreview(false)} />
          <div className="w-full max-w-3xl bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
              <div>
                <h2 className="text-white font-semibold">Payload Preview</h2>
                <p className="text-slate-400 text-xs mt-0.5 font-mono truncate max-w-sm">
                  {feedProtocol === 'soap'
                    ? `POST → ${config.baseUrl?.replace(/\/$/, '') || '<baseURL>'}${soapPath || '/ws'} [SOAP: ${soapMacro || 'Assignment'}]`
                    : `POST → ${endpoint!.url.replace('{{baseURL}}', config.baseUrl?.replace(/\/$/, '') || '<baseURL>')}`
                  }
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
                      {feedProtocol === 'soap'
                        ? buildFeedSoapEnvelope(previewPayloads[previewIdx].payload as Record<string, unknown>, soapMacro, soapParamName, soapXsiType, soapReassign)
                        : JSON.stringify(previewPayloads[previewIdx].payload, null, 2)
                      }
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
