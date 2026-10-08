import { ApiError, authed, pickImage, type ResolvedConnection } from "./onestock";
import { splitList, type Settings } from "./settings";

/** An item sheet from the OneStock catalog (GET /items), flattened for display. */
export interface CatalogItem {
  id: string;
  name: string;
  color?: string;
  size?: string;
  imageUrl?: string;
  price?: number;
  /** All features returned for the item, values joined. */
  features: Record<string, string>;
}

interface RawItem {
  id: string;
  features?: Record<string, unknown>;
}

function flatten(value: unknown): string | undefined {
  const values = (Array.isArray(value) ? value.flat(2) : [value]).filter(
    (v) => v !== undefined && v !== null && v !== "",
  );
  return values.length ? values.map(String).join(", ") : undefined;
}

function toCatalogItem(raw: RawItem, settings: Settings, lang: string): CatalogItem {
  // Features are returned per language ({ en: {...} }); be lenient with flat objects too.
  const all = raw.features ?? {};
  const byLang = (all[lang] ?? Object.values(all).find((v) => v && typeof v === "object" && !Array.isArray(v))) as
    | Record<string, unknown>
    | undefined;
  const features: Record<string, string> = {};
  for (const [name, value] of Object.entries(byLang ?? all)) {
    const text = flatten(value);
    if (text !== undefined) features[name] = text;
  }
  const price = Number.parseFloat(features[settings.featurePrice] ?? "");
  return {
    id: raw.id,
    name: features[settings.featureName] ?? raw.id,
    color: features[settings.featureColor],
    size: features[settings.featureSize],
    imageUrl: pickImage(byLang ?? all, settings.featureImage),
    price: Number.isFinite(price) ? price : undefined,
    features,
  };
}

/** Whether GET /items accepts item_ids, per API base URL (known after the first attempt). */
const itemIdsSupport = new Map<string, Promise<boolean>>();

/**
 * Item sheets for the given ids. GET /items has no public filter on ids, so we
 * try `item_ids` first, then a pattern search on each id.
 */
export async function fetchItemSheets(
  settings: Settings,
  conn: ResolvedConnection,
  ids: string[],
  lang: string,
): Promise<CatalogItem[]> {
  const features = [
    ...new Set(
      [
        settings.featureName,
        settings.featureColor,
        settings.featureSize,
        ...splitList(settings.featureImage),
        settings.featurePrice,
        ...splitList(settings.sheetFeatures),
      ].filter(Boolean),
    ),
  ];
  const query = (body: Record<string, unknown>) =>
    authed<{ items?: RawItem[] }>(settings, conn, "/items", { features, lang, ...body }, true).then((r) =>
      (r?.items ?? []).map((raw) => toCatalogItem(raw, settings, lang)),
    );

  // item_ids is internal and may be refused (HTTP 500): once it failed for this API, go straight to
  // the pattern search. Concurrent calls wait for the first attempt instead of all trying it.
  let firstError: unknown;
  const support = itemIdsSupport.get(conn.baseUrl);
  if (!support || (await support)) {
    const attempt = query({ item_ids: ids, pagination: { limit: ids.length, start: 0 } });
    if (!support)
      itemIdsSupport.set(
        conn.baseUrl,
        attempt.then(
          () => true,
          () => false,
        ),
      );
    try {
      const items = await attempt;
      if (items.length) return items;
    } catch (error) {
      firstError = error;
    }
  }
  const results = await Promise.allSettled(
    ids.map((id) =>
      query({
        pattern: id,
        searchable_fields: [{ name: "id", priority: 1 }],
        pagination: { limit: 10, start: 0 },
      }).then((items) => items.find((item) => item.id === id)),
    ),
  );
  const items = results.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
  if (!items.length) {
    const rejected = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    throw firstError ?? rejected?.reason ?? new ApiError("notInCatalog", "Items not found in the catalog");
  }
  return items;
}

/** Available quantity per item id, summed over the locations of the stock query. */
export async function fetchStock(
  settings: Settings,
  conn: ResolvedConnection,
  itemIds: string[],
): Promise<Record<string, number>> {
  if (!settings.stockRequestName.trim()) throw new ApiError("stockNotConfigured", "Stock query not configured");
  const endpointIds = splitList(settings.stockEndpointIds);
  const result = await authed<{ stocks?: { item_id: string; quantity?: number }[] }>(
    settings,
    conn,
    "/stock_export",
    {
      request_name: settings.stockRequestName.trim(),
      aggregates: {
        "*": {
          item_filter: { ids: itemIds },
          ...(endpointIds.length ? { endpoint_filter: { ids: endpointIds } } : {}),
        },
      },
      unification: { by_endpoint: true, by_stock_type: true },
    },
    true,
  );
  const stock: Record<string, number> = Object.fromEntries(itemIds.map((id) => [id, 0]));
  for (const line of result?.stocks ?? []) stock[line.item_id] = (stock[line.item_id] ?? 0) + (line.quantity ?? 0);
  return stock;
}
