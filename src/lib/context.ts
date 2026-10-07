import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * OneStock UI Extension context.
 *
 * OneStock loads the extension in an iframe with query parameters
 * (extension_id, user_id, site_id, lang, parent_url, host_app, ...), then the
 * extension posts `extension_ready` to the parent and receives `onestock_data`.
 * The extension_signature is deliberately NOT verified here (no backend / JWT).
 */
export interface FinishOptions {
  /** postMessage types sent to the OneStock parent page (e.g. extension_close, extension_refresh). */
  messages: string[];
  /** Origin page to reload; when empty, nothing is navigated. */
  refreshUrl?: string;
  close: boolean;
}

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
  /** Ends the extension after a confirmation: notifies OneStock, refreshes the origin page and closes. */
  finish: (options: FinishOptions) => void;
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

function parentOriginOf(urlParams: Record<string, string>): string {
  try {
    if (urlParams.parent_url) return new URL(urlParams.parent_url).origin;
  } catch {
    // invalid parent_url: keep wildcard
  }
  return "*";
}

export function useOneStockContext(): OneStockContext {
  const urlParams = useMemo(() => Object.fromEntries(new URLSearchParams(window.location.search)), []);
  const embedded = window.parent !== window;
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const finish = useCallback(
    ({ messages, refreshUrl, close }: FinishOptions) => {
      const parentOrigin = parentOriginOf(urlParams);
      if (embedded) for (const type of messages) window.parent.postMessage({ type }, parentOrigin);

      // Opened as a popup / new tab: refresh the opener, then close ourselves.
      if (window.opener && !window.opener.closed) {
        if (refreshUrl) {
          try {
            window.opener.location.href = refreshUrl;
          } catch {
            // navigation refused: OneStock messages above are the only signal
          }
        }
        if (close) window.close();
        return;
      }
      // Embedded in an iframe: reloading the top page also removes the extension.
      if (embedded && refreshUrl) {
        try {
          window.top!.location.href = refreshUrl;
          return;
        } catch {
          // top navigation blocked by the iframe sandbox
        }
      }
      // Only effective when the page was opened by script.
      if (close) window.close();
    },
    [embedded, urlParams],
  );

  useEffect(() => {
    if (!embedded) return;
    const parentOrigin = parentOriginOf(urlParams);

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
    finish,
    lang: str(data?.lang) ?? urlParams.lang,
    locale: str(data?.locale) ?? urlParams.locale,
  };
}
