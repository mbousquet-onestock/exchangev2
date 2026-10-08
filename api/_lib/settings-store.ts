/**
 * Server-side client of the Settings API (Extensions app). The API key and the
 * decrypted secrets never leave the server.
 *
 * Environment variables:
 * - SETTINGS_API_URL       default https://extensions-lemon.vercel.app/api/settings
 * - SETTINGS_API_KEY       key declared in SETTINGS_API_KEYS of the Extensions app
 * - SETTINGS_ENCRYPTION_KEY optional, to decrypt `enc:v1:` values locally
 * - SETTINGS_EXTENSION_ID  extension_id of this app's settings, default "exchange"
 */
import { decryptSetting, isEncrypted } from "./settings-secrets.js";

export interface RemoteSetting {
  key: string;
  site_id: string;
  extension_id: string;
  environment: string;
  value: string | null;
  secret?: boolean;
  encrypted?: boolean;
  decrypt_error?: boolean;
}

export class SettingsApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const SENSITIVE = /token|secret|password|passwd|api_key|apikey|credential/i;
export const isSecretKey = (key: string) => SENSITIVE.test(key);

export const extensionId = () => process.env.SETTINGS_EXTENSION_ID || "exchange";
const apiUrl = () =>
  (process.env.SETTINGS_API_URL || "https://extensions-lemon.vercel.app/api/settings").replace(/\/+$/, "");

export function settingsConfigured(): boolean {
  return !!process.env.SETTINGS_API_KEY;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  if (!settingsConfigured()) throw new SettingsApiError(503, "SETTINGS_API_KEY is not set");
  const response = await fetch(`${apiUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.SETTINGS_API_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok && response.status !== 404) {
    throw new SettingsApiError(response.status, body.error ?? `Settings API HTTP ${response.status}`);
  }
  return { status: response.status, body };
}

async function list(params: Record<string, string>): Promise<RemoteSetting[]> {
  const { body } = await request<{ settings?: RemoteSetting[] }>(`?${new URLSearchParams(params)}`);
  return body.settings ?? [];
}

/** Clear value of a setting: decrypted by the API (decrypt=1), else locally with SETTINGS_ENCRYPTION_KEY. */
function clearValue(setting: RemoteSetting): string | null {
  if (setting.value === null) return null;
  if (!isEncrypted(setting.value)) return setting.value;
  try {
    return decryptSetting(setting.value);
  } catch {
    return null;
  }
}

/**
 * All settings of this extension for a site and an environment, merged by
 * priority: site + extension > site + "*" > global + extension > global + "*".
 * Secrets are decrypted only when `withSecrets` is true.
 */
export async function readMerged(
  siteId: string,
  environment: string,
  { withSecrets = false } = {},
): Promise<{ values: Record<string, string>; secrets: string[] }> {
  const ext = extensionId();
  const scopes: Record<string, string>[] = [{ site_id: "", environment }];
  if (siteId) scopes.push({ site_id: siteId, environment });
  const decrypt: Record<string, string> = withSecrets ? { decrypt: "1" } : {};
  const rows = (await Promise.all(scopes.map((p) => list({ ...p, ...decrypt }))))
    .flat()
    .filter((r) => r.extension_id === ext || r.extension_id === "*");

  // Secrets the API could not decrypt: read them raw and decrypt them here.
  if (withSecrets && rows.some((r) => r.decrypt_error) && process.env.SETTINGS_ENCRYPTION_KEY) {
    const raw = (await Promise.all(scopes.map(list))).flat();
    for (const row of rows.filter((r) => r.decrypt_error)) {
      const same = raw.find(
        (r) => r.key === row.key && r.site_id === row.site_id && r.extension_id === row.extension_id,
      );
      if (same && isEncrypted(same.value)) row.value = same.value;
    }
  }

  const rank = (r: RemoteSetting) => (r.site_id === siteId && siteId ? 2 : 0) + (r.extension_id === ext ? 1 : 0);
  const best = new Map<string, RemoteSetting>();
  for (const row of rows) {
    const current = best.get(row.key);
    if (!current || rank(row) > rank(current)) best.set(row.key, row);
  }

  const values: Record<string, string> = {};
  const secrets: string[] = [];
  for (const [key, row] of best) {
    if (row.secret || isSecretKey(key)) {
      secrets.push(key);
      if (!withSecrets) continue;
    }
    const value = clearValue(row);
    if (value !== null) values[key] = value;
  }
  return { values, secrets };
}

const hasCredentials = (values: Record<string, string>) =>
  !!values.onestock_token || (!!values.onestock_user_id && !!values.onestock_password);

type Credentials = { values: Record<string, string>; environment: string };

/** Credentials kept in memory between calls (per function instance), to spare a Settings API round trip. */
const credentialsCache = new Map<string, { credentials: Promise<Credentials>; expires: number }>();
const CREDENTIALS_TTL_MS = 5 * 60 * 1000;

/**
 * OneStock credentials (decrypted) for a site and an environment, cached 5 minutes
 * (`fresh` bypasses the cache, e.g. after a 401). In prod, when none are stored,
 * the qualif ones are used.
 */
export function readCredentials(siteId: string, environment: string, { fresh = false } = {}): Promise<Credentials> {
  const key = `${environment}|${siteId}`;
  const cached = credentialsCache.get(key);
  if (cached && cached.expires > Date.now() && !fresh) return cached.credentials;
  const credentials = loadCredentials(siteId, environment);
  credentialsCache.set(key, { credentials, expires: Date.now() + CREDENTIALS_TTL_MS });
  credentials.catch(() => credentialsCache.delete(key));
  return credentials;
}

async function loadCredentials(siteId: string, environment: string): Promise<Credentials> {
  const { values } = await readMerged(siteId, environment, { withSecrets: true });
  if (environment !== "prod" || hasCredentials(values)) return { values, environment };
  const qualif = (await readMerged(siteId, "qualif", { withSecrets: true })).values;
  return hasCredentials(qualif) ? { values: qualif, environment: "qualif" } : { values, environment };
}

/** Creates or replaces settings of this extension (site_id "" = all sites). Secrets are encrypted by the API. */
export async function writeSettings(siteId: string, environment: string, values: Record<string, string>) {
  credentialsCache.clear();
  for (const [key, value] of Object.entries(values)) {
    const params = new URLSearchParams({ key, site_id: siteId, extension_id: extensionId(), environment, upsert: "1" });
    await request(`/item?${params}`, { method: "PUT", body: JSON.stringify({ value }) });
  }
}

/** Removes settings of this extension (back to the global / default value). */
export async function deleteSettings(siteId: string, environment: string, keys: string[]) {
  for (const key of keys) {
    const params = new URLSearchParams({ key, site_id: siteId, extension_id: extensionId(), environment });
    await request(`/item?${params}`, { method: "DELETE" });
  }
}
