// ─── Types ───────────────────────────────────────────────────────────────────

export interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  username: string;
  password: string;
}

export interface ConversionMapping {
  sourceId: string;
  targetId: string;
  label?: string;
}

export type FallbackStrategy = 'error' | 'default' | 'keep-source';

export interface ConversionTable {
  id: string;
  name: string;
  sourceEnvId: string;
  targetEnvId: string;
  fieldPaths: string[];
  mappings: ConversionMapping[];
  fallback: FallbackStrategy;       // what to do when no mapping matches
  fallbackDefaultId?: string;       // used when fallback === 'default'
  fallbackDefaultLabel?: string;    // display label for the default value
}

// ─── Key constants ────────────────────────────────────────────────────────────

export const ACTIVE_CONFIG_KEY   = 'ubilaundry-config';
export const ENVS_KEY            = 'ubilaundry-environments';
export const TABLES_KEY          = 'ubilaundry-conversion-tables';
export const FEED_TEMPLATES_KEY  = 'ubilaundry-feed-templates';

// ─── ID generator ─────────────────────────────────────────────────────────────

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Environments ─────────────────────────────────────────────────────────────

export function loadEnvironments(): Environment[] {
  try { return JSON.parse(localStorage.getItem(ENVS_KEY) ?? '[]'); } catch { return []; }
}

export function saveEnvironments(envs: Environment[]): void {
  localStorage.setItem(ENVS_KEY, JSON.stringify(envs));
}

// ─── Conversion tables ────────────────────────────────────────────────────────

function migrate(tables: ConversionTable[]): ConversionTable[] {
  return tables.map(t => {
    const legacy = t as ConversionTable & { fieldPath?: string };
    const withPaths = (!t.fieldPaths && legacy.fieldPath)
      ? { ...t, fieldPaths: [legacy.fieldPath] }
      : !t.fieldPaths ? { ...t, fieldPaths: [] } : t;
    // default fallback for tables created before this field existed
    if (!withPaths.fallback) return { ...withPaths, fallback: 'error' as FallbackStrategy };
    return withPaths;
  });
}

export function loadConversionTables(): ConversionTable[] {
  try { return migrate(JSON.parse(localStorage.getItem(TABLES_KEY) ?? '[]')); } catch { return []; }
}

export function saveConversionTables(tables: ConversionTable[]): void {
  localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
}

// ─── Feed templates ───────────────────────────────────────────────────────────

export interface FeedTemplate {
  id: string;
  name: string;
  endpointId: string;
  hasHeader: boolean;
  trimColumns: string[];
  useMappingMode: boolean;
  fieldMappings: Record<string, string>;
  fixedFields: { key: string; value: string; lookup?: { entityType: string; envId: string } }[];
  fieldLookups?: Record<string, { entityType: string; envId: string }>;
  soapMode?: boolean;
  soapPath?: string;
  soapMacro?: string;
  soapParamName?: string;
  soapXsiType?: string;
  soapReassign?: boolean;
  soapFieldPaths?: string[];
}

export function loadFeedTemplates(): FeedTemplate[] {
  try { return JSON.parse(localStorage.getItem(FEED_TEMPLATES_KEY) ?? '[]'); } catch { return []; }
}

export function saveFeedTemplates(templates: FeedTemplate[]): void {
  localStorage.setItem(FEED_TEMPLATES_KEY, JSON.stringify(templates));
}

// ─── Active config ────────────────────────────────────────────────────────────

export interface ActiveConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export function loadActiveConfig(): ActiveConfig {
  try { return JSON.parse(localStorage.getItem(ACTIVE_CONFIG_KEY) ?? '{}'); } catch { return { baseUrl: '', username: '', password: '' }; }
}

export function saveActiveConfig(c: ActiveConfig): void {
  localStorage.setItem(ACTIVE_CONFIG_KEY, JSON.stringify(c));
}

// ─── Entity types available for ID loading ────────────────────────────────────

export const ENTITY_TYPES = [
  'Category', 'Client', 'Container', 'Department', 'Device',
  'GPITrigger', 'Holder', 'ItemAttribute', 'Item', 'ItemType',
  'LinkAttributeItem', 'Location', 'LocationType', 'MovementType',
  'Server', 'StartTriggerAutoConfig', 'StopTriggerAutoConfig',
  'SwitchBox', 'Workstation', 'WorkstationType',
] as const;

export type EntityType = typeof ENTITY_TYPES[number];

// ─── URL helpers ──────────────────────────────────────────────────────────────

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

// ─── Proxy helper ─────────────────────────────────────────────────────────────

export async function proxyGet(env: Environment, path: string): Promise<unknown[]> {
  const url = `${normalizeBaseUrl(env.baseUrl)}${path}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (env.username) headers['Authorization'] = 'Basic ' + btoa(`${env.username}:${env.password}`);

  const res = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, method: 'GET', headers }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (data.status < 200 || data.status >= 300) throw new Error(`${data.status} ${data.statusText}`);
  return Array.isArray(data.body) ? data.body : [];
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

function getPath(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let cur: unknown = obj;
  for (const k of keys) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

function coerceId(id: string): unknown {
  const n = Number(id);
  return isNaN(n) ? id : n;
}

export interface ConversionNote {
  fieldPath: string;
  sourceId: string;
  action: 'mapped' | 'default' | 'kept-source' | 'error';
  detail: string;
}

export interface ConversionResult {
  converted: Record<string, unknown>;
  errors: string[];   // fatal — row should not be sent
  notes: ConversionNote[];  // informational — row is sent but something was substituted
}

export function applyConversions(
  json: Record<string, unknown>,
  tables: ConversionTable[]
): ConversionResult {
  const converted: Record<string, unknown> = JSON.parse(JSON.stringify(json));
  const errors: string[] = [];
  const notes: ConversionNote[] = [];

  for (const table of tables) {
    for (const fieldPath of table.fieldPaths) {
      const raw = getPath(converted, fieldPath);
      if (raw === null || raw === undefined) continue;

      const sourceId = String(raw);
      const mapping  = table.mappings.find(m => String(m.sourceId) === sourceId);

      if (mapping) {
        setPath(converted, fieldPath, coerceId(mapping.targetId));
        notes.push({ fieldPath, sourceId, action: 'mapped', detail: `→ ${mapping.targetId}${mapping.label ? ` (${mapping.label})` : ''}` });
        continue;
      }

      // No mapping found — apply fallback strategy
      switch (table.fallback) {
        case 'error':
          errors.push(`[${table.name}] ${fieldPath}="${sourceId}": no mapping found`);
          break;

        case 'default':
          if (!table.fallbackDefaultId) {
            errors.push(`[${table.name}] ${fieldPath}="${sourceId}": no mapping and no default configured`);
          } else {
            setPath(converted, fieldPath, coerceId(table.fallbackDefaultId));
            notes.push({ fieldPath, sourceId, action: 'default', detail: `→ default ${table.fallbackDefaultId}${table.fallbackDefaultLabel ? ` (${table.fallbackDefaultLabel})` : ''}` });
          }
          break;

        case 'keep-source':
          // value stays as-is
          notes.push({ fieldPath, sourceId, action: 'kept-source', detail: 'source value kept' });
          break;
      }
    }
  }

  return { converted, errors, notes };
}
