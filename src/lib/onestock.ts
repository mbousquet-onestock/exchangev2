import { splitList, type Settings } from "./settings";

export interface ResolvedConnection {
  siteId: string;
  baseUrl: string; // includes the API version, no trailing slash
}

export type ApiErrorCode = "noToken" | "noCredentials" | "network" | "http" | "stockNotConfigured" | "notInCatalog";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details: { status?: number; requestId?: string; url?: string } = {},
  ) {
    super(message);
  }
}

export function resolveBaseUrl(settings: Settings, siteId: string, contextApiUrl?: string): string {
  let root: string;
  if (settings.useContextApiUrl && contextApiUrl) root = contextApiUrl;
  else if (settings.environment === "production") root = `https://${siteId}.api.onestock-retail.com`;
  else if (settings.environment === "custom") root = settings.customBaseUrl.replace("{site_id}", siteId);
  else root = `https://${siteId}.api.qualif.onestock-retail.com`;

  root = root.replace(/\/+$/, "");
  return /\/v\d+$/.test(root) ? root : `${root}/${settings.apiVersion}`;
}

async function call<T>(
  settings: Settings,
  url: string,
  body: Record<string, unknown>,
  { getSemantics = false, method = "POST" }: { getSemantics?: boolean; method?: "POST" | "PATCH" } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // GET routes take a JSON body: send them as POST + method override.
  if (getSemantics) headers["X-HTTP-Method-Override"] = "GET";

  const target = settings.useProxy ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
  let response: Response;
  try {
    response = await fetch(target, { method, headers, body: JSON.stringify(body) });
  } catch (error) {
    throw new ApiError("network", (error as Error).message, { url });
  }

  const text = await response.text();
  let payload: unknown = undefined;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object"
        ? ((payload as Record<string, unknown>).message ?? (payload as Record<string, unknown>).error ?? text)
        : text;
    throw new ApiError(
      "http",
      `HTTP ${response.status} — ${new URL(url).pathname}: ${String(detail || response.statusText)}`,
      { status: response.status, requestId: response.headers.get("request-id") ?? undefined, url },
    );
  }
  return payload as T;
}

let cachedToken: { key: string; token: string } | null = null;

export async function getToken(settings: Settings, conn: ResolvedConnection, forceRefresh = false): Promise<string> {
  if (settings.authMode === "token") {
    if (!settings.token) throw new ApiError("noToken", "No API token configured");
    return settings.token;
  }
  if (!settings.userId || !settings.password) {
    throw new ApiError("noCredentials", "Login / password missing");
  }
  const key = `${conn.baseUrl}|${conn.siteId}|${settings.userId}`;
  if (!forceRefresh && cachedToken?.key === key) return cachedToken.token;
  const { token } = await call<{ token: string }>(settings, `${conn.baseUrl}/login`, {
    site_id: conn.siteId,
    user_id: settings.userId,
    password: settings.password,
  });
  cachedToken = { key, token };
  return token;
}

export async function authed<T>(
  settings: Settings,
  conn: ResolvedConnection,
  path: string,
  body: Record<string, unknown>,
  getSemantics: boolean,
  method: "POST" | "PATCH" = "POST",
): Promise<T> {
  const run = async (forceRefresh: boolean) => {
    const token = await getToken(settings, conn, forceRefresh);
    return call<T>(
      settings,
      `${conn.baseUrl}${path}`,
      { site_id: conn.siteId, token, ...body },
      { getSemantics, method },
    );
  };
  try {
    return await run(false);
  } catch (error) {
    // Expired token: log in again once when using credentials.
    if (error instanceof ApiError && error.details.status === 401 && settings.authMode === "credentials")
      return run(true);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface RawOrder {
  id: string;
  /** Parent order of this (split) order, when there is one. */
  parent_order_id?: string;
  original_ruleset_id?: string;
  original_ruleset_chaining_id?: string;
  ordering?: { endpoint_id?: string; user_id?: string };
  state?: string;
  date?: number;
  types?: string[];
  sales_channel?: string;
  information?: Record<string, unknown>;
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    [key: string]: unknown;
  };
  delivery?: {
    type?: string;
    destination?: { address?: RawAddress; endpoint_id?: string; information?: Record<string, unknown> };
  };
  pricing_details?: { currency?: string; address?: RawAddress };
  order_items?: RawOrderItem[];
  line_item_groups?: RawLineItemGroup[];
}

export interface RawAddress {
  [key: string]: unknown;
  city?: string;
  zip_code?: string;
  lines?: string[];
  regions?: { country?: { code?: string } };
  contact?: { first_name?: string; last_name?: string; email?: string; phone_number?: string };
}

export interface RawOrderItem {
  id?: string;
  _id?: string;
  item_id: string;
  quantity?: number;
  pricing_details?: {
    price?: number;
    unit_price?: number;
    currency?: string;
  };
  item?: { features?: Record<string, unknown> };
}

export interface RawLineItemGroup {
  id: string;
  order_item_id?: string;
  item_id: string;
  quantity: number;
  state?: string;
  endpoint_id?: string;
  item?: { features?: Record<string, unknown> };
}

const ORDER_FIELDS = [
  "parent_order_id",
  "id",
  "types",
  "date",
  "last_update",
  "sales_channel",
  "state",
  "information",
  "original_ruleset_id",
  "original_ruleset_chaining_id",
  "ruleset_id",
  "expiration_dates",
  "customer",
  "customer.first_name",
  "customer.last_name",
  "customer.email",
  "customer.phone_number",
  "ordering.endpoint_id",
  "ordering.user_id",
  "reservation_rank",
  "delivery.type",
  "delivery.destination.address",
  "delivery.destination.endpoint_id",
  "delivery.destination.information",
  "pricing_details",
  "pricing_details.currency",
  "pricing_details.address",
  "pricing_details.price",
  "pricing_details.original_price",
  "pricing_details.taxes",
  "pricing_details.discounts",
  "order_items._id",
  "order_items.item_id",
  "order_items.quantity",
  "order_items.pricing_details",
  "order_items.pricing_details.price",
  "order_items.pricing_details.currency",
  "order_items.pricing_details.original_price",
  "order_items.pricing_details.unit_price",
  "order_items.pricing_details.original_unit_price",
  "order_items.pricing_details.taxes",
  "order_items.pricing_details.discounts",
  "order_items.information",
  "line_item_groups.id",
  "line_item_groups.order_id",
  "line_item_groups.order_item_id",
  "line_item_groups.item_id",
  "line_item_groups.endpoint_id",
  "line_item_groups.quantity",
  "line_item_groups.parcel_id",
  "line_item_groups.reason",
  "line_item_groups.epcs",
  "line_item_groups.last_update",
  "line_item_groups.state",
  "line_item_groups.index_ranges",
  "shipping_fees",
  "shipping_fees.price",
  "shipping_fees.original_price",
  "shipping_fees.taxes",
  "shipping_fees.discounts",
  "parcels.id",
  "parcels.order_id",
  "parcels.state",
  "parcels.line_item_index_ranges",
  "parcels.information",
  "parcels.delivery.destination.address",
  "parcels.delivery.destination.endpoint_id",
  "parcels.delivery.origin",
  "parcels.delivery.carrier",
  "parcels.delivery.type",
  "parcels.shipment.tracking_code",
  "parcels.shipment.tracking_link",
  "parcels.date",
  "parcels.last_update",
  "parcels.cutoffs_sets",
  "parcels.documents",
  "sent_delivery_option",
  "delivery_promise.original_delivery_option.delivery_routes",
  "delivery_promise.original_delivery_option.metric_values",
  "current_delivery_etas",
  "bundles",
];

export async function fetchOrder(
  settings: Settings,
  conn: ResolvedConnection,
  orderId: string,
  featuresLang: string,
): Promise<RawOrder> {
  const features = [
    settings.featureName,
    settings.featureColor,
    settings.featureSize,
    ...splitList(settings.featureImage),
    settings.featureSubstitution,
  ].filter(Boolean);
  // Same fields as the GET /orders reference payload ({name} expanded to the configured features).
  const fields = [
    ...ORDER_FIELDS,
    ...features.map((f) => `order_items.item.features.${f}`),
    ...features.map((f) => `line_item_groups.item.features.${f}`),
  ];
  const result = await authed<RawOrder | { order: RawOrder }>(
    settings,
    conn,
    `/orders/${encodeURIComponent(orderId)}`,
    { fields, item_features_lang: featuresLang },
    true,
  );
  return "order" in result && result.order ? result.order : (result as RawOrder);
}

// ---------------------------------------------------------------------------
// Mapping to UI articles
// ---------------------------------------------------------------------------

export interface Article {
  /** Line item group id: unique key of a selectable row. */
  id: string;
  orderItemId?: string;
  sku: string;
  name: string;
  color?: string;
  size?: string;
  imageUrl?: string;
  price: number;
  /** ISO 4217 code, formatted by the UI according to the locale. */
  currency: string;
  quantity: number;
  state: string;
  eligible: boolean;
  /** Substitution item ids listed in the item feature set in Settings. */
  substitutionIds: string[];
}

function feature(features: Record<string, unknown> | undefined, name: string): string | undefined {
  if (!features || !name) return undefined;
  const value = features[name];
  if (Array.isArray(value)) return value.length ? String(value[0]) : undefined;
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
}

/** Ids listed in an item feature: an array and/or a string separated by , ; | or spaces. */
const IMAGE_URL = /^(https?:)?\/\/\S+\.(jpe?g|png|webp|gif|avif|svg)(\?\S*)?$/i;

/**
 * Image URL of an item: the first configured image feature that has a value,
 * else any feature value that looks like an image URL.
 */
export function pickImage(features: Record<string, unknown>, candidates: string): string | undefined {
  for (const name of splitList(candidates)) {
    const value = feature(features, name);
    if (value) return value;
  }
  for (const value of Object.values(features)) {
    const url = (Array.isArray(value) ? value : [value]).map(String).find((v) => IMAGE_URL.test(v.trim()));
    if (url) return url.trim();
  }
  return undefined;
}

export function parseIdList(value: unknown): string[] {
  const values = Array.isArray(value) ? value.flat(2) : [value];
  return [
    ...new Set(
      values
        .filter((v) => v !== undefined && v !== null)
        .flatMap((v) => String(v).split(/[,;|\s]+/))
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}

export function toArticles(order: RawOrder, settings: Settings): Article[] {
  const eligibleStates = new Set(splitList(settings.eligibleStates).map((s) => s.toLowerCase()));
  const orderItems = order.order_items ?? [];
  const byId = new Map(orderItems.map((oi) => [oi.id ?? oi._id ?? "", oi]));
  const orderCurrency = order.pricing_details?.currency ?? "EUR";

  const fromItem = (
    key: string,
    oi: RawOrderItem | undefined,
    itemId: string,
    quantity: number,
    state: string,
    lig?: RawLineItemGroup,
  ): Article => {
    const features = { ...(oi?.item?.features ?? {}), ...(lig?.item?.features ?? {}) };
    const unit = oi?.pricing_details?.unit_price ?? oi?.pricing_details?.price ?? 0;
    return {
      id: key,
      orderItemId: oi?.id ?? oi?._id,
      sku: itemId,
      name: feature(features, settings.featureName) ?? itemId,
      color: feature(features, settings.featureColor),
      size: feature(features, settings.featureSize),
      imageUrl: pickImage(features, settings.featureImage),
      price: unit,
      currency: (oi?.pricing_details?.currency ?? orderCurrency).toUpperCase(),
      quantity,
      state,
      eligible: eligibleStates.has(state.toLowerCase()),
      substitutionIds: settings.featureSubstitution
        ? parseIdList(features[settings.featureSubstitution]).filter((id) => id !== itemId)
        : [],
    };
  };

  const groups = order.line_item_groups ?? [];
  if (groups.length) {
    return groups.map((lig) => {
      const oi =
        (lig.order_item_id && byId.get(lig.order_item_id)) || orderItems.find((o) => o.item_id === lig.item_id);
      return fromItem(lig.id, oi, lig.item_id, lig.quantity, lig.state ?? order.state ?? "unknown", lig);
    });
  }
  // No line item groups returned: fall back on order items with the order state.
  return orderItems.map((oi, index) =>
    fromItem(oi.id ?? oi._id ?? `${oi.item_id}-${index}`, oi, oi.item_id, oi.quantity ?? 1, order.state ?? "unknown"),
  );
}
