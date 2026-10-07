import { useCallback, useEffect, useRef, useState } from "react";
import { fetchStock, loadCatalogEntry, type CatalogEntry } from "./catalog";
import type { ResolvedConnection } from "./onestock";
import type { Settings } from "./settings";

export type Loadable<T> = { status: "loading" } | { status: "ready"; value: T } | { status: "error"; error: unknown };

export interface CatalogState {
  catalog: Loadable<CatalogEntry>;
  /** Stock of the variants and substitutes, keyed by item id. */
  stock: Loadable<Record<string, number>>;
}

export interface ApiContext {
  settings: Settings;
  conn: ResolvedConnection;
  featuresLang: string;
}

const LOADING: CatalogState = { catalog: { status: "loading" }, stock: { status: "loading" } };

/** Lazily loads catalog + stock around ordered items, once per SKU. */
export function useCatalog({ settings, conn, featuresLang }: ApiContext) {
  const [entries, setEntries] = useState<Record<string, CatalogState>>({});
  const requested = useRef(new Set<string>());

  // New connection / settings: forget what was loaded.
  useEffect(() => {
    requested.current.clear();
    setEntries({});
  }, [settings, conn.baseUrl, conn.siteId, featuresLang]);

  const ensure = useCallback(
    (sku: string) => {
      if (requested.current.has(sku)) return;
      requested.current.add(sku);
      const set = (patch: Partial<CatalogState>) =>
        setEntries((prev) => ({
          ...prev,
          [sku]: { ...(prev[sku] ?? LOADING), ...patch },
        }));
      set({});

      const loadStock = (ids: string[]) =>
        fetchStock(settings, conn, ids).then(
          (value) => set({ stock: { status: "ready", value } }),
          (error) => set({ stock: { status: "error", error } }),
        );

      loadCatalogEntry(settings, conn, sku, featuresLang).then(
        (entry) => {
          set({ catalog: { status: "ready", value: entry } });
          loadStock([...entry.variants, ...entry.substitutes].map((x) => x.id));
        },
        (error) => {
          set({ catalog: { status: "error", error } });
          // Without catalog we can still show the stock of the ordered item.
          loadStock([sku]);
        },
      );
    },
    [settings, conn, featuresLang],
  );

  return { entries, ensure };
}
