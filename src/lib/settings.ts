import { useCallback, useState } from "react";
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

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  const save = useCallback((next: Settings) => {
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore: settings still live in memory for this session
    }
  }, []);

  return { settings, save };
}

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
