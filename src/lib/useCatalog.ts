import { useCallback, useEffect, useRef, useState } from "react";
import { fetchItemSheets, fetchStock, type CatalogItem } from "./catalog";
import type { Article, ResolvedConnection } from "./onestock";
import type { Settings } from "./settings";

export type Loadable<T> = { status: "loading" } | { status: "ready"; value: T } | { status: "error"; error: unknown };

export interface CatalogState {
  /** Stock of the ordered item and of its substitutes, keyed by item id. */
  stock: Loadable<Record<string, number>>;
  /** Sheets of the substitution items listed on the ordered item. */
  substitutes: Loadable<CatalogItem[]>;
}

export interface ApiContext {
  settings: Settings;
  conn: ResolvedConnection;
  featuresLang: string;
}

const LOADING: CatalogState = { stock: { status: "loading" }, substitutes: { status: "loading" } };

/** Lazily loads stock + substitute sheets around ordered items, once per SKU. */
export function useCatalog({ settings, conn, featuresLang }: ApiContext) {
  const [entries, setEntries] = useState<Record<string, CatalogState>>({});
  const requested = useRef(new Set<string>());

  // New connection / settings: forget what was loaded.
  useEffect(() => {
    requested.current.clear();
    setEntries({});
  }, [settings, conn.baseUrl, conn.siteId, featuresLang]);

  const ensure = useCallback(
    (article: Article) => {
      const { sku, substitutionIds } = article;
      if (requested.current.has(sku)) return;
      requested.current.add(sku);
      const set = (patch: Partial<CatalogState>) =>
        setEntries((prev) => ({ ...prev, [sku]: { ...(prev[sku] ?? LOADING), ...patch } }));
      set({});

      fetchStock(settings, conn, [sku, ...substitutionIds]).then(
        (value) => set({ stock: { status: "ready", value } }),
        (error) => set({ stock: { status: "error", error } }),
      );
      if (!substitutionIds.length) set({ substitutes: { status: "ready", value: [] } });
      else
        fetchItemSheets(settings, conn, substitutionIds, featuresLang).then(
          (value) => set({ substitutes: { status: "ready", value } }),
          (error) => set({ substitutes: { status: "error", error } }),
        );
    },
    [settings, conn, featuresLang],
  );

  return { entries, ensure };
}
