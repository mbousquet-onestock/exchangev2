import { splitList, type Settings } from "./settings";

export interface ResolvedConnection {
  siteId: string;
  baseUrl: string; // includes the API version, no trailing slash
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly requestId?: string,
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
  { getSemantics = false }: { getSemantics?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // GET routes take a JSON body: send them as POST + method override.
  if (getSemantics) headers["X-HTTP-Method-Override"] = "GET";

  const target = settings.useProxy ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
  let response: Response;
  try {
    response = await fetch(target, { method: "POST", headers, body: JSON.stringify(body) });
  } catch (error) {
    throw new ApiError(
      `Network error calling ${url}: ${(error as Error).message}. ` +
        (settings.useProxy ? "" : "This is often a CORS issue — try enabling the proxy in Settings."),
    );
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
      `HTTP ${response.status} on ${new URL(url).pathname}: ${String(detail || response.statusText)}`,
      response.status,
      response.headers.get("request-id") ?? undefined,
    );
  }
  return payload as T;
}

let cachedToken: { key: string; token: string } | null = null;

export async function getToken(settings: Settings, conn: ResolvedConnection, forceRefresh = false): Promise<string> {
  if (settings.authMode === "token") {
    if (!settings.token) throw new ApiError("No API token configured. Fill it in the Settings tab.");
    return settings.token;
  }
  if (!settings.userId || !settings.password) {
    throw new ApiError("Login / password missing. Fill them in the Settings tab.");
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

async function authed<T>(
  settings: Settings,
  conn: ResolvedConnection,
  path: string,
  body: Record<string, unknown>,
  getSemantics: boolean,
): Promise<T> {
  const run = async (forceRefresh: boolean) => {
    const token = await getToken(settings, conn, forceRefresh);
    return call<T>(settings, `${conn.baseUrl}${path}`, { site_id: conn.siteId, token, ...body }, { getSemantics });
  };
  try {
    return await run(false);
  } catch (error) {
    // Expired token: log in again once when using credentials.
    if (error instanceof ApiError && error.status === 401 && settings.authMode === "credentials") return run(true);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface RawOrder {
  id: string;
  state?: string;
  date?: number;
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
  };
  delivery?: { destination?: { address?: RawAddress } };
  pricing_details?: { currency?: string };
  order_items?: RawOrderItem[];
  line_item_groups?: RawLineItemGroup[];
}

export interface RawAddress {
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

export async function fetchOrder(settings: Settings, conn: ResolvedConnection, orderId: string): Promise<RawOrder> {
  const features = [settings.featureName, settings.featureColor, settings.featureSize, settings.featureImage].filter(
    Boolean,
  );
  const fields = [
    "id",
    "state",
    "date",
    "customer",
    "delivery.destination.address",
    "pricing_details.currency",
    "order_items._id",
    "order_items.item_id",
    "order_items.quantity",
    "order_items.pricing_details",
    ...features.map((f) => `order_items.item.features.${f}`),
    "line_item_groups.id",
    "line_item_groups.order_item_id",
    "line_item_groups.item_id",
    "line_item_groups.quantity",
    "line_item_groups.state",
    "line_item_groups.endpoint_id",
  ];
  const result = await authed<RawOrder | { order: RawOrder }>(
    settings,
    conn,
    `/orders/${encodeURIComponent(orderId)}`,
    { fields, item_features_lang: settings.itemFeaturesLang },
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
  currency: string;
  quantity: number;
  state: string;
  eligible: boolean;
}

function feature(features: Record<string, unknown> | undefined, name: string): string | undefined {
  if (!features || !name) return undefined;
  const value = features[name];
  if (Array.isArray(value)) return value.length ? String(value[0]) : undefined;
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
}

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" };

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code.toUpperCase()] ?? `${code} `;
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
      imageUrl: feature(features, settings.featureImage),
      price: unit,
      currency: currencySymbol(oi?.pricing_details?.currency ?? orderCurrency),
      quantity,
      state,
      eligible: eligibleStates.has(state.toLowerCase()),
    };
  };

  const groups = order.line_item_groups ?? [];
  if (groups.length) {
    return groups.map((lig) => {
      const oi = (lig.order_item_id && byId.get(lig.order_item_id)) || orderItems.find((o) => o.item_id === lig.item_id);
      return fromItem(lig.id, oi, lig.item_id, lig.quantity, lig.state ?? order.state ?? "unknown", lig);
    });
  }
  // No line item groups returned: fall back on order items with the order state.
  return orderItems.map((oi, index) =>
    fromItem(oi.id ?? oi._id ?? `${oi.item_id}-${index}`, oi, oi.item_id, oi.quantity ?? 1, order.state ?? "unknown"),
  );
}
