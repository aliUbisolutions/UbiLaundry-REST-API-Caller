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

export interface ConversionTable {
  id: string;
  name: string;
  sourceEnvId: string;
  targetEnvId: string;
  fieldPaths: string[];  // all dot-notation paths sharing the same ID space, e.g. ["lastSeenLocation.id", "reportLocation.id"]
  mappings: ConversionMapping[];
}

// ─── Key constants ────────────────────────────────────────────────────────────

export const ACTIVE_CONFIG_KEY = 'ubilaundry-config';
export const ENVS_KEY          = 'ubilaundry-environments';
export const TABLES_KEY        = 'ubilaundry-conversion-tables';

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

// Migrate tables that still use the old single fieldPath string
function migrate(tables: ConversionTable[]): ConversionTable[] {
  return tables.map(t => {
    const legacy = t as ConversionTable & { fieldPath?: string };
    if (!t.fieldPaths && legacy.fieldPath) return { ...t, fieldPaths: [legacy.fieldPath] };
    if (!t.fieldPaths) return { ...t, fieldPaths: [] };
    return t;
  });
}

export function loadConversionTables(): ConversionTable[] {
  try { return migrate(JSON.parse(localStorage.getItem(TABLES_KEY) ?? '[]')); } catch { return []; }
}

export function saveConversionTables(tables: ConversionTable[]): void {
  localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
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

// ─── Proxy helper ─────────────────────────────────────────────────────────────

export async function proxyGet(env: Environment, path: string): Promise<unknown[]> {
  const url = `${env.baseUrl.replace(/\/$/, '')}${path}`;
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

export interface ConversionResult {
  converted: Record<string, unknown>;
  errors: string[];
}

export function applyConversions(
  json: Record<string, unknown>,
  tables: ConversionTable[]
): ConversionResult {
  const converted: Record<string, unknown> = JSON.parse(JSON.stringify(json));
  const errors: string[] = [];

  for (const table of tables) {
    for (const fieldPath of table.fieldPaths) {
      const raw = getPath(converted, fieldPath);
      if (raw === null || raw === undefined) continue;
      const sourceId = String(raw);
      const mapping = table.mappings.find(m => String(m.sourceId) === sourceId);
      if (!mapping) {
        errors.push(`No mapping for ${fieldPath}="${sourceId}" in table "${table.name}"`);
      } else {
        const n = Number(mapping.targetId);
        setPath(converted, fieldPath, isNaN(n) ? mapping.targetId : n);
      }
    }
  }

  return { converted, errors };
}
