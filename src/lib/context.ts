import { useEffect, useMemo, useState } from "react";

/**
 * OneStock UI Extension context.
 *
 * OneStock loads the extension in an iframe with query parameters
 * (extension_id, user_id, site_id, lang, parent_url, host_app, ...), then the
 * extension posts `extension_ready` to the parent and receives `onestock_data`.
 * The extension_signature is deliberately NOT verified here (no backend / JWT).
 */
export interface OneStockContext {
  embedded: boolean;
  received: boolean;
  urlParams: Record<string, string>;
  data: Record<string, unknown> | null;
  siteId?: string;
  orderId?: string;
  userId?: string;
  apiUrl?: string;
  hostApp?: string;
  lang?: string;
  locale?: string;
}

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value) return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function pickOrderId(data: Record<string, unknown> | null, params: Record<string, string>): string | undefined {
  if (data) {
    const direct = str(data.order_id) ?? str(data.orderId);
    if (direct) return direct;
    if (Array.isArray(data.order_ids) && data.order_ids.length) return str(data.order_ids[0]);
    const order = data.order as Record<string, unknown> | undefined;
    if (order && typeof order === "object") return str(order.id);
  }
  return params.order_id ?? params.orderId;
}

export function useOneStockContext(): OneStockContext {
  const urlParams = useMemo(() => Object.fromEntries(new URLSearchParams(window.location.search)), []);
  const embedded = window.parent !== window;
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!embedded) return;
    let parentOrigin = "*";
    try {
      if (urlParams.parent_url) parentOrigin = new URL(urlParams.parent_url).origin;
    } catch {
      // invalid parent_url: keep wildcard
    }

    const onMessage = (event: MessageEvent) => {
      if (parentOrigin !== "*" && event.origin !== parentOrigin) return;
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "onestock_data") setData(event.data.data ?? {});
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "extension_ready" }, parentOrigin);

    // Keep the iframe height in sync with the content.
    const observer = new ResizeObserver(() => {
      window.parent.postMessage(
        { type: "extension_resize", height: document.documentElement.scrollHeight },
        parentOrigin,
      );
    });
    observer.observe(document.body);

    return () => {
      window.removeEventListener("message", onMessage);
      observer.disconnect();
    };
  }, [embedded, urlParams]);

  return {
    embedded,
    received: data !== null,
    urlParams,
    data,
    siteId: str(data?.site_id) ?? urlParams.site_id,
    orderId: pickOrderId(data, urlParams),
    userId: str(data?.user_id) ?? urlParams.user_id,
    apiUrl: str(data?.api_url),
    hostApp: str(data?.host_app) ?? urlParams.host_app,
    lang: str(data?.lang) ?? urlParams.lang,
    locale: str(data?.locale) ?? urlParams.locale,
  };
}
