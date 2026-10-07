import { authed, type Article, type RawAddress, type RawOrder } from "./onestock";
import type { ApiContext } from "./useCatalog";

export interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface RequestedItem {
  article: Article;
  action: "return" | "exchange";
  reason: string;
  /** Item sent to the customer for an exchange (the same item or a substitute). */
  exchangeItemId?: string;
  exchangeType?: "same_model" | "different_model";
}

export interface SubmitResult {
  /** Number of line item groups moved to the return state. */
  returned: number;
  subOrderId?: string;
}

/**
 * Confirms the request:
 * 1. every selected line goes from its current state to the return state
 *    (PATCH /line_item_groups, one call per current state);
 * 2. exchanged items are shipped through a 0-priced sub-order of the initial
 *    order (POST /orders with parent_order_id).
 */
export async function submitRequest(
  { settings, conn }: ApiContext,
  order: RawOrder,
  items: RequestedItem[],
  contact: Contact,
  returnMethod: string,
): Promise<SubmitResult> {
  const byState = new Map<string, Record<string, number>>();
  for (const { article } of items) {
    const quantities = byState.get(article.state) ?? {};
    quantities[article.sku] = (quantities[article.sku] ?? 0) + article.quantity;
    byState.set(article.state, quantities);
  }
  for (const [from, itemQuantities] of byState) {
    await authed(
      settings,
      conn,
      "/line_item_groups",
      { order_id: order.id, from, to: settings.returnState, item_quantities: itemQuantities },
      false,
      "PATCH",
    );
  }

  const exchanges = items.filter((i) => i.action === "exchange" && i.exchangeItemId);
  if (!exchanges.length) return { returned: items.length };

  const subOrder = buildSubOrder(order, exchanges, contact, returnMethod);
  await authed(settings, conn, "/orders", { order: subOrder }, false);
  return { returned: items.length, subOrderId: subOrder.id };
}

/** Copy of the initial order (customer, delivery, types, channel…) holding the exchanged items at 0. */
export function buildSubOrder(order: RawOrder, exchanges: RequestedItem[], contact: Contact, returnMethod: string) {
  const currency = order.pricing_details?.currency ?? exchanges[0].article.currency;
  const stamp = Date.now().toString(36).toUpperCase();
  const personal = {
    first_name: contact.firstName || undefined,
    last_name: contact.lastName || order.customer?.last_name || "-",
    email: contact.email || undefined,
    phone_number: contact.phone || undefined,
  };
  const destination = order.delivery?.destination ?? {};
  const address: RawAddress | undefined = destination.address && {
    ...destination.address,
    lines: contact.address ? contact.address.split(/\s*,\s*/) : destination.address.lines,
    city: contact.city || destination.address.city,
    zip_code: contact.zipCode || destination.address.zip_code,
    regions: contact.country ? { country: { code: contact.country } } : destination.address.regions,
    contact: { ...destination.address.contact, ...personal },
  };

  return {
    id: `${order.id}-EX${stamp}`,
    parent_order_id: order.id,
    types: order.types?.length ? order.types : ["ffs"],
    ...(order.sales_channel ? { sales_channel: order.sales_channel } : {}),
    information: {
      ...order.information,
      exchange_of: order.id,
      return_method: returnMethod,
      exchange_reasons: Object.fromEntries(exchanges.map((e) => [e.article.sku, e.reason])),
    },
    customer: { ...order.customer, ...personal },
    delivery: {
      ...(order.delivery?.type ? { type: order.delivery.type } : {}),
      destination: {
        ...(destination.endpoint_id ? { endpoint_id: destination.endpoint_id } : {}),
        ...(address ? { address } : {}),
        ...(destination.information ? { information: destination.information } : {}),
      },
    },
    pricing_details: {
      currency,
      price: 0,
      original_price: 0,
      ...(order.pricing_details?.address ? { address: order.pricing_details.address } : {}),
    },
    order_items: exchanges.map((e) => ({
      item_id: e.exchangeItemId!,
      quantity: e.article.quantity,
      pricing_details: { currency, price: 0, unit_price: 0, original_price: 0, original_unit_price: 0 },
      information: { exchanged_item_id: e.article.sku, exchange_type: e.exchangeType, reason: e.reason },
    })),
  };
}
