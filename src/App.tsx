import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ExchangeWorkflow } from "./components/ExchangeWorkflow";
import { SettingsPanel } from "./components/SettingsPanel";
import { InfoBanner } from "./components/ui";
import { useOneStockContext } from "./lib/context";
import { ApiError, fetchOrder, resolveBaseUrl, toArticles, type RawOrder } from "./lib/onestock";
import { useSettings } from "./lib/settings";

type Tab = "exchange" | "settings";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string; requestId?: string }
  | { status: "loaded"; order: RawOrder };

export default function App() {
  const context = useOneStockContext();
  const { settings, save } = useSettings();
  const [tab, setTab] = useState<Tab>("exchange");
  const [load, setLoad] = useState<LoadState>({ status: "idle" });
  const [reloadKey, setReloadKey] = useState(0);

  const siteId = context.siteId || settings.siteIdOverride.trim();
  const orderId = context.orderId || settings.orderIdOverride.trim();
  const missing = [!siteId && "site id", !orderId && "order id"].filter(Boolean) as string[];

  // Wait briefly for onestock_data when embedded, so we don't fire a call with fallback values.
  const [contextWaitOver, setContextWaitOver] = useState(!context.embedded);
  useEffect(() => {
    if (contextWaitOver) return;
    const timer = setTimeout(() => setContextWaitOver(true), 1500);
    return () => clearTimeout(timer);
  }, [contextWaitOver]);
  const ready = context.received || contextWaitOver;

  useEffect(() => {
    if (!ready || missing.length) return;
    let cancelled = false;
    setLoad({ status: "loading" });
    const conn = { siteId, baseUrl: resolveBaseUrl(settings, siteId, context.apiUrl) };
    fetchOrder(settings, conn, orderId)
      .then((order) => !cancelled && setLoad({ status: "loaded", order }))
      .catch(
        (error: unknown) =>
          !cancelled &&
          setLoad({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
            requestId: error instanceof ApiError ? error.requestId : undefined,
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [ready, siteId, orderId, settings, context.apiUrl, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const articles = useMemo(
    () => (load.status === "loaded" ? toArticles(load.order, settings) : []),
    [load, settings],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
          <nav className="flex gap-4">
            {(
              [
                ["exchange", "Exchange"],
                ["settings", "Settings"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`py-3 text-[13px] font-bold border-b-2 transition-colors ${
                  tab === id ? "border-brand text-gray-800" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="text-[11px] text-gray-400 truncate">
            {siteId || "no site"} · {orderId || "no order"}
          </div>
        </div>
      </header>

      {tab === "settings" ? (
        <SettingsPanel
          settings={settings}
          context={context}
          onSave={save}
          onTest={() => {
            reload();
            setTab("exchange");
          }}
        />
      ) : missing.length ? (
        <Notice
          tone="warning"
          text={`Missing ${missing.join(" and ")}: open this page from OneStock or set fallback values in Settings.`}
          action="Open settings"
          onAction={() => setTab("settings")}
        />
      ) : load.status === "error" ? (
        <Notice
          tone="error"
          text={
            <>
              {load.message}
              {load.requestId && <span className="block text-[11px] opacity-70">Request-Id: {load.requestId}</span>}
            </>
          }
          action="Open settings"
          onAction={() => setTab("settings")}
          secondary="Retry"
          onSecondary={reload}
        />
      ) : load.status === "loaded" ? (
        <ExchangeWorkflow
          key={`${load.order.id}-${reloadKey}`}
          order={load.order}
          articles={articles}
          settings={settings}
          onReload={reload}
        />
      ) : (
        <div className="flex-grow flex items-center justify-center py-16 text-[13px] text-gray-400">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin mr-3" />
          {ready ? `Loading order ${orderId}…` : "Waiting for OneStock context…"}
        </div>
      )}
    </div>
  );
}

function Notice({
  text,
  tone,
  action,
  onAction,
  secondary,
  onSecondary,
}: {
  text: ReactNode;
  tone: "warning" | "error";
  action: string;
  onAction: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  return (
    <main className="max-w-2xl w-full mx-auto px-4 py-6">
      <InfoBanner tone={tone} text={text} />
      <div className="flex gap-2 mt-3">
        <button
          onClick={onAction}
          className="px-4 py-2 bg-brand text-white text-[13px] font-bold rounded-lg hover:bg-brand-dark"
        >
          {action}
        </button>
        {secondary && (
          <button
            onClick={onSecondary}
            className="px-4 py-2 border border-gray-200 text-gray-600 text-[13px] font-bold rounded-lg hover:bg-gray-50"
          >
            {secondary}
          </button>
        )}
      </div>
    </main>
  );
}
