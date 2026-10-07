import { ApiError, authed, type ResolvedConnection } from "./onestock";
import { splitList, type Settings } from "./settings";

/** An item of the OneStock catalog (GET /items), flattened for display. */
export interface CatalogItem {
  id: string;
  productId?: string;
  categoryIds: string[];
  name: string;
  color?: string;
  size?: string;
  imageUrl?: string;
  price?: number;
}

/** Catalog data around an ordered item, used by the exchange options. */
export interface CatalogEntry {
  item: CatalogItem;
  /** Same product (other sizes / colors), the ordered item included. */
  variants: CatalogItem[];
  /** Other products of the same category: possible substitutes. */
  substitutes: CatalogItem[];
}

interface RawItem {
  id: string;
  product_id?: string;
  category_ids?: string[];
  features?: Record<string, unknown>;
}

function first(value: unknown): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v === undefined || v === null || v === "" ? undefined : String(v);
}

function toCatalogItem(raw: RawItem, settings: Settings, lang: string): CatalogItem {
  // Features are returned per language ({ en: {...} }); be lenient with flat objects too.
  const all = raw.features ?? {};
  const byLang = (all[lang] ?? Object.values(all).find((v) => v && typeof v === "object" && !Array.isArray(v))) as
    | Record<string, unknown>
    | undefined;
  const features = byLang ?? all;
  const price = Number.parseFloat(first(features[settings.featurePrice]) ?? "");
  return {
    id: raw.id,
    productId: raw.product_id,
    categoryIds: raw.category_ids ?? [],
    name: first(features[settings.featureName]) ?? raw.id,
    color: first(features[settings.featureColor]),
    size: first(features[settings.featureSize]),
    imageUrl: first(features[settings.featureImage]),
    price: Number.isFinite(price) ? price : undefined,
  };
}

async function fetchItems(
  settings: Settings,
  conn: ResolvedConnection,
  lang: string,
  query: Record<string, unknown>,
): Promise<CatalogItem[]> {
  const features = [
    settings.featureName,
    settings.featureColor,
    settings.featureSize,
    settings.featureImage,
    settings.featurePrice,
  ].filter(Boolean);
  const result = await authed<{ items?: RawItem[] }>(
    settings,
    conn,
    "/items",
    {
      features,
      fields: ["product_id", "category_ids"],
      lang,
      pagination: { limit: settings.catalogLimit || 100, start: 0 },
      ...query,
    },
    true,
  );
  return (result?.items ?? []).map((raw) => toCatalogItem(raw, settings, lang));
}

/**
 * Loads the ordered item from the catalog, then the items of its category (or,
 * without category, the items sharing its name) and splits them between
 * variants of the same product and substitutes from other products.
 */
export async function loadCatalogEntry(
  settings: Settings,
  conn: ResolvedConnection,
  sku: string,
  lang: string,
): Promise<CatalogEntry> {
  const [item] = await fetchItems(settings, conn, lang, { item_ids: [sku] });
  if (!item) throw new ApiError("notInCatalog", `Item ${sku} not found in the catalog`);

  const category = item.categoryIds[0];
  const pool = category
    ? await fetchItems(settings, conn, lang, { category_id: category })
    : await fetchItems(settings, conn, lang, {
        pattern: item.name,
        searchable_fields: [{ name: settings.featureName, priority: 1 }],
      });

  const sameProduct = (other: CatalogItem) =>
    other.id === item.id || (item.productId !== undefined && other.productId === item.productId);
  const variants = [item, ...pool.filter((x) => x.id !== item.id && sameProduct(x))];
  const substitutes = pool.filter((x) => !sameProduct(x));
  return { item, variants, substitutes };
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
