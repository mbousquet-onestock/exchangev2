import { useCallback, useEffect, useMemo, useState } from "react";
import type { Language } from "./i18n";

export type Environment = "qualif" | "production" | "custom";
export type AuthMode = "token" | "credentials";

export interface Settings {
  /** Bumped when stored defaults change meaning (see load()). */
  version: number;
  /** "auto" follows the lang sent by OneStock in the extension context. */
  uiLanguage: "auto" | Language;
  /** Which OneStock API host to target. */
  environment: Environment;
  /** Base URL used when environment is "custom" (without the version). */
  customBaseUrl: string;
  /** Prefer the api_url sent by OneStock in the extension context, when present. */
  useContextApiUrl: boolean;
  apiVersion: "v1" | "v2" | "v3" | "v4";
  authMode: AuthMode;
  token: string;
  userId: string;
  password: string;
  /** Route API calls through /api/proxy to work around CORS. */
  useProxy: boolean;
  /** Fallback values when the app is opened outside of OneStock (no context). */
  siteIdOverride: string;
  orderIdOverride: string;
  /** Empty = interface language. */
  itemFeaturesLang: string;
  /** Item feature names used to display articles. */
  featureName: string;
  featureColor: string;
  featureSize: string;
  /** Image feature, or several candidates (comma separated): the first one found is used. */
  featureImage: string;
  /** Item feature holding the price, used for substitutes (GET /items). */
  featurePrice: string;
  /** Item feature telling whether the item can be returned (oui / non, true / false). */
  featureReturnEligible: string;
  /** Item feature holding the withdrawal period, in days. */
  featureReturnDelay: string;
  /** Order item feature listing the substitution item ids. */
  featureSubstitution: string;
  /** Extra features shown on the substitute sheets (comma separated). */
  sheetFeatures: string;
  /** Stock query (OMC > Configuration > Stock > Stock Queries) used by GET /stock_export. */
  stockRequestName: string;
  /** Optional stock locations (comma separated endpoint ids). */
  stockEndpointIds: string;
  /** Close the extension once the request is confirmed. */
  closeOnConfirm: boolean;
  /** postMessage type sent to OneStock to close the extension. */
  closeMessageType: string;
  /** Refresh the OneStock page the extension was opened from once the request is confirmed. */
  refreshOnConfirm: boolean;
  /** postMessage type sent to OneStock to refresh its page. */
  refreshMessageType: string;
  /** Page to reload ({site_id}, {order_id} replaced); empty = parent_url sent by OneStock. */
  refreshUrl: string;
  /** Id of the exchange sub-order: {order_id} and {n} (1, 2… first free number) are replaced. */
  subOrderIdFormat: string;
  /** State the returned / exchanged lines are moved to on confirmation. */
  returnState: string;
  /** Line item group states eligible for return / exchange (comma separated). */
  eligibleStates: string;
  /** Comma separated; empty = default reasons in the interface language. */
  returnReasons: string;
  exchangeReasons: string;
  /** Runtime only: the OneStock credentials are kept server-side (Settings API) and added by the proxy. */
  serverAuth?: boolean;
}

const SETTINGS_VERSION = 4;

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  uiLanguage: "auto",
  environment: "qualif",
  customBaseUrl: "",
  useContextApiUrl: true,
  apiVersion: "v3",
  authMode: "token",
  token: "",
  userId: "",
  password: "",
  useProxy: true,
  siteIdOverride: "",
  orderIdOverride: "",
  itemFeaturesLang: "",
  featureName: "name",
  featureColor: "color",
  featureSize: "size",
  featureImage: "image_url, image",
  featurePrice: "price",
  featureReturnEligible: "eligible_retour",
  featureReturnDelay: "delai_retractation",
  featureSubstitution: "substitution",
  sheetFeatures: "description",
  stockRequestName: "detailed",
  stockEndpointIds: "",
  closeOnConfirm: true,
  closeMessageType: "extension_close",
  refreshOnConfirm: true,
  refreshMessageType: "extension_refresh",
  refreshUrl: "",
  subOrderIdFormat: "{order_id}-S{n}",
  returnState: "returning",
  eligibleStates: "fulfilled",
  returnReasons: "",
  exchangeReasons: "",
};

const STORAGE_KEY = "onestock-exchange-settings";

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (!stored.version) {
        // v1 stored English defaults: drop them so the context language applies.
        delete stored.returnReasons;
        delete stored.itemFeaturesLang;
      }
      if ((stored.version ?? 0) < 3 && !stored.stockRequestName) delete stored.stockRequestName;
      if ((stored.version ?? 0) < 4 && stored.featureImage === "image_url") delete stored.featureImage;
      // Keep only known keys (drops removed settings).
      const known = Object.fromEntries(Object.entries(stored).filter(([key]) => key in DEFAULT_SETTINGS));
      return { ...DEFAULT_SETTINGS, ...known, version: SETTINGS_VERSION };
    }
  } catch {
    // storage unavailable or corrupted: fall back to defaults
  }
  return DEFAULT_SETTINGS;
}

/** Settings that stay in this browser: they select which remote settings to read. */
const LOCAL_ONLY = ["version", "siteIdOverride", "orderIdOverride", "environment"] as const;
type LocalOnly = (typeof LOCAL_ONLY)[number];
const isLocalOnly = (field: string): field is LocalOnly => (LOCAL_ONLY as readonly string[]).includes(field);

/** Settings API key of a field: the OneStock credentials use the shared names (onestock_token…). */
const REMOTE_KEYS: Partial<Record<keyof Settings, string>> = {
  token: "onestock_token",
  userId: "onestock_user_id",
  password: "onestock_password",
};
export const remoteKey = (field: keyof Settings) =>
  REMOTE_KEYS[field] ?? field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const SECRET_FIELDS: (keyof Settings)[] = ["token", "password"];

/** Environment of the Settings API for an OneStock environment. */
export const remoteEnvironment = (environment: Environment) => (environment === "production" ? "prod" : "qualif");

export type SettingsScope = "site" | "global";

export interface SettingsStorage {
  /** "remote" = Settings API, "local" = this browser (API not configured or unreachable). */
  mode: "loading" | "remote" | "local";
  error?: string;
  siteId: string;
  environment: string;
  /** Secret settings stored remotely (their values are never sent to the browser). */
  secrets: string[];
}

function fromRemote(values: Record<string, string>): Partial<Settings> {
  const result: Record<string, unknown> = {};
  for (const [field, fallback] of Object.entries(DEFAULT_SETTINGS)) {
    if (isLocalOnly(field)) continue;
    const value = values[remoteKey(field as keyof Settings)];
    if (value === undefined) continue;
    result[field] =
      typeof fallback === "boolean" ? value === "true" : typeof fallback === "number" ? Number(value) || 0 : value;
  }
  return result as Partial<Settings>;
}

function persistLocal(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore: settings still live in memory for this session
  }
}

/**
 * Settings of the app, read from / saved to the Settings API (through /api/settings)
 * for the site and environment in use; falls back on this browser's storage when the
 * API is not available.
 */
export function useSettings(contextSiteId?: string) {
  const [local, setLocal] = useState<Settings>(load);
  const [remote, setRemote] = useState<{ values: Record<string, string>; secrets: string[] } | null>(null);
  const [storage, setStorage] = useState<SettingsStorage>({
    mode: "loading",
    siteId: "",
    environment: "",
    secrets: [],
  });
  const [reloadKey, setReloadKey] = useState(0);

  const siteId = contextSiteId || local.siteIdOverride.trim();
  const environment = remoteEnvironment(local.environment);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ site_id: siteId, environment });
    fetch(`/api/settings?${params}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
        return body as { values: Record<string, string>; secrets: string[] };
      })
      .then(
        (body) => {
          if (cancelled) return;
          setRemote(body);
          setStorage({ mode: "remote", siteId, environment, secrets: body.secrets });
        },
        (error: Error) => {
          if (cancelled) return;
          setRemote(null);
          setStorage({ mode: "local", siteId, environment, secrets: [], error: error.message });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [siteId, environment, reloadKey]);

  const settings = useMemo<Settings>(() => {
    if (!remote) return local;
    const secrets = new Set(remote.secrets);
    const bootstrap = Object.fromEntries(LOCAL_ONLY.map((field) => [field, local[field]]));
    return {
      ...DEFAULT_SETTINGS,
      ...fromRemote(remote.values),
      ...bootstrap,
      // Secrets stay on the server: the proxy adds them to the OneStock calls.
      token: "",
      password: "",
      useProxy: true,
      serverAuth:
        secrets.has("onestock_token") || (!!remote.values.onestock_user_id && secrets.has("onestock_password")),
    };
  }, [local, remote]);

  const save = useCallback(
    async (next: Settings, scope: SettingsScope = "site") => {
      const nextLocal = remote
        ? { ...local, ...Object.fromEntries(LOCAL_ONLY.map((field) => [field, next[field]])) }
        : next;
      setLocal(nextLocal);
      persistLocal(nextLocal);
      if (!remote) return;

      // Only what changed; an empty secret means "keep the stored one".
      const values: Record<string, string> = {};
      for (const field of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
        if (isLocalOnly(field)) continue;
        const value = next[field];
        if (SECRET_FIELDS.includes(field) ? !value : String(value) === String(settings[field])) continue;
        values[remoteKey(field)] = String(value);
      }
      if (Object.keys(values).length) {
        const response = await fetch("/api/settings", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ site_id: siteId, environment, scope, values }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${response.status}`);
        }
      }
      setReloadKey((k) => k + 1);
    },
    [local, remote, settings, siteId, environment],
  );

  return { settings, save, storage };
}

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
