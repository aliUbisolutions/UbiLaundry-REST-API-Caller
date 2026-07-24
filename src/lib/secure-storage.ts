// Client-side only. Encrypts endpoint request bodies before writing them to
// localStorage, so credentials typed into the app aren't left in plaintext
// in devtools/localStorage. The passphrase is a fixed app constant (not a
// secret) — this protects against casual inspection, not a determined
// attacker with access to the running page.

const PASSPHRASE = 'ubilaundry-rest-api-caller/local-store/v1';
const BODY_PREFIX = 'ubilaundry-body-enc:';
const TOKEN_STORE_KEY = 'ubilaundry-bearer-tokens';

async function deriveKey(salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(PASSPHRASE), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

function toB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromB64(str: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

async function encrypt(plaintext: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return [toB64(salt), toB64(iv), toB64(new Uint8Array(ciphertext))].join('.');
}

async function decrypt(payload: string): Promise<string | null> {
  try {
    const [saltB64, ivB64, ctB64] = payload.split('.');
    const key = await deriveKey(fromB64(saltB64));
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(ivB64) }, key, fromB64(ctB64));
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null;
  }
}

// ─── Encrypted request bodies ──────────────────────────────────────────────

export async function savePersistedBody(endpointId: string, value: string): Promise<void> {
  localStorage.setItem(BODY_PREFIX + endpointId, await encrypt(value));
}

export async function loadPersistedBody(endpointId: string): Promise<string | null> {
  const raw = localStorage.getItem(BODY_PREFIX + endpointId);
  if (!raw) return null;
  return decrypt(raw);
}

// ─── Bearer tokens (captured from a login-style call, reused by others) ───

export interface StoredToken {
  token: string;
  generationDateUTC?: string;
  peremptionDateUTC?: string;
}

function readTokenStore(): Record<string, StoredToken> {
  try { return JSON.parse(localStorage.getItem(TOKEN_STORE_KEY) ?? '{}'); } catch { return {}; }
}

export function setStoredToken(sourceEndpointId: string, token: StoredToken): void {
  const store = readTokenStore();
  store[sourceEndpointId] = token;
  localStorage.setItem(TOKEN_STORE_KEY, JSON.stringify(store));
}

export function getStoredToken(sourceEndpointId: string): StoredToken | null {
  const entry = readTokenStore()[sourceEndpointId];
  if (!entry) return null;
  if (entry.peremptionDateUTC && Date.parse(entry.peremptionDateUTC) < Date.now()) return null;
  return entry;
}
