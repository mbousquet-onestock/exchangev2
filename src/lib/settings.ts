import { useCallback, useState } from "react";

export type Environment = "qualif" | "production" | "custom";
export type AuthMode = "token" | "credentials";

export interface Settings {
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
  itemFeaturesLang: string;
  /** Item feature names used to display articles. */
  featureName: string;
  featureColor: string;
  featureSize: string;
  featureImage: string;
  /** Line item group states eligible for return / exchange (comma separated). */
  eligibleStates: string;
  /** Proposed values for a same-model exchange (comma separated). */
  exchangeSizes: string;
  exchangeColors: string;
  returnReasons: string;
}

export const DEFAULT_SETTINGS: Settings = {
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
  itemFeaturesLang: "en",
  featureName: "name",
  featureColor: "color",
  featureSize: "size",
  featureImage: "image_url",
  eligibleStates: "fulfilled",
  exchangeSizes: "XS, S, M, L, XL",
  exchangeColors: "Black, Grey, White, Navy, Red",
  returnReasons: "Too small, Too big, Damaged item, Color not as expected, Style doesn't suit me, Changed my mind",
};

const STORAGE_KEY = "onestock-exchange-settings";

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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
