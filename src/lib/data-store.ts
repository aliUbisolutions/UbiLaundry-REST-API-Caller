import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readFile<T>(name: string, fallback: T): T {
  ensureDir();
  const p = path.join(DATA_DIR, name);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function writeFile(name: string, data: unknown): void {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data, null, 2));
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  profile: 'admin' | 'user';
  allowedMethods: string[];
  serverEnvAccess: string[] | 'all';
  allowedEndpoints: string[] | 'all';
}

export interface PublicUser extends Omit<StoredUser, 'passwordHash'> {}

function readUsers(): StoredUser[] {
  return readFile<StoredUser[]>('users.json', []);
}
function writeUsers(users: StoredUser[]): void {
  writeFile('users.json', users);
}

export function countUsers(): number {
  return readUsers().length;
}

export function findUserByUsername(username: string): StoredUser | undefined {
  return readUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
}

export function findUserById(id: string): StoredUser | undefined {
  return readUsers().find(u => u.id === id);
}

export function listUsers(): PublicUser[] {
  return readUsers().map(({ passwordHash: _, ...u }) => u);
}

export function createUser(user: StoredUser): void {
  const users = readUsers();
  users.push(user);
  writeUsers(users);
}

export function updateUser(id: string, patch: Partial<Omit<StoredUser, 'id'>>): boolean {
  const users = readUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  users[idx] = { ...users[idx], ...patch };
  writeUsers(users);
  return true;
}

export function deleteUser(id: string): boolean {
  const users = readUsers();
  const next = users.filter(u => u.id !== id);
  if (next.length === users.length) return false;
  writeUsers(next);
  return true;
}

// ─── Server environments ──────────────────────────────────────────────────────

export interface ServerEnvironment {
  id: string;
  name: string;
  baseUrl: string;
  username: string;
  password: string;
}

function readServerEnvs(): ServerEnvironment[] {
  return readFile<ServerEnvironment[]>('server-environments.json', []);
}
function writeServerEnvs(envs: ServerEnvironment[]): void {
  writeFile('server-environments.json', envs);
}

export function listServerEnvs(): ServerEnvironment[] {
  return readServerEnvs();
}

export function listServerEnvsForUser(user: PublicUser | StoredUser): ServerEnvironment[] {
  const envs = readServerEnvs();
  if (user.profile === 'admin' || user.serverEnvAccess === 'all') return envs;
  const allowed = new Set(user.serverEnvAccess as string[]);
  return envs.filter(e => allowed.has(e.id));
}

export function createServerEnv(env: ServerEnvironment): void {
  const envs = readServerEnvs();
  envs.push(env);
  writeServerEnvs(envs);
}

export function updateServerEnv(id: string, patch: Partial<Omit<ServerEnvironment, 'id'>>): boolean {
  const envs = readServerEnvs();
  const idx = envs.findIndex(e => e.id === id);
  if (idx === -1) return false;
  envs[idx] = { ...envs[idx], ...patch };
  writeServerEnvs(envs);
  return true;
}

export function deleteServerEnv(id: string): boolean {
  const envs = readServerEnvs();
  const next = envs.filter(e => e.id !== id);
  if (next.length === envs.length) return false;
  writeServerEnvs(next);
  return true;
}

// ─── Server conversion tables ─────────────────────────────────────────────────

export interface ConversionMapping {
  sourceId: string;
  targetId: string;
  label?: string;
}
export type FallbackStrategy = 'error' | 'default' | 'keep-source';

export interface ServerConversionTable {
  id: string;
  name: string;
  sourceEnvId: string;
  targetEnvId: string;
  fieldPaths: string[];
  mappings: ConversionMapping[];
  fallback: FallbackStrategy;
  fallbackDefaultId?: string;
  fallbackDefaultLabel?: string;
}

function readServerConversions(): ServerConversionTable[] {
  return readFile<ServerConversionTable[]>('server-conversions.json', []);
}
function writeServerConversions(tables: ServerConversionTable[]): void {
  writeFile('server-conversions.json', tables);
}

export function listServerConversions(): ServerConversionTable[] {
  return readServerConversions();
}

export function createServerConversion(table: ServerConversionTable): void {
  const tables = readServerConversions();
  tables.push(table);
  writeServerConversions(tables);
}

export function updateServerConversion(id: string, patch: Partial<Omit<ServerConversionTable, 'id'>>): boolean {
  const tables = readServerConversions();
  const idx = tables.findIndex(t => t.id === id);
  if (idx === -1) return false;
  tables[idx] = { ...tables[idx], ...patch };
  writeServerConversions(tables);
  return true;
}

export function deleteServerConversion(id: string): boolean {
  const tables = readServerConversions();
  const next = tables.filter(t => t.id !== id);
  if (next.length === tables.length) return false;
  writeServerConversions(next);
  return true;
}

// ─── Call history ─────────────────────────────────────────────────────────────

export interface BatchRecord {
  batchNum: number;
  startedAt: string;
  durationMs: number;
  total: number;
  ok: number;
  errors: number;
  skipped: number;
  avgElapsedMs: number | null;
}

export interface CallHistoryRecord {
  id: string;
  userId: string;
  username: string;
  environment: string;
  environmentName: string;
  protocol: 'rest' | 'soap';
  operation: string;
  sourceFile: string;
  startedAt: string;
  endedAt: string;
  totalRows: number;
  totalOk: number;
  totalErrors: number;
  totalSkipped: number;
  batches: BatchRecord[];
}

const MAX_HISTORY = 5000;

function readHistory(): CallHistoryRecord[] {
  return readFile<CallHistoryRecord[]>('call-history.json', []);
}

export function listHistory(): CallHistoryRecord[] {
  return readHistory();
}

export function appendHistory(record: CallHistoryRecord): void {
  const history = readHistory();
  history.unshift(record);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  writeFile('call-history.json', history);
}

export function clearHistory(): void {
  writeFile('call-history.json', []);
}
