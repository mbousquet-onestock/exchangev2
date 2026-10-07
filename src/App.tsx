import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ExchangeWorkflow } from "./components/ExchangeWorkflow";
import { SettingsPanel } from "./components/SettingsPanel";
import { InfoBanner } from "./components/ui";
import { useOneStockContext } from "./lib/context";
import { createI18n, I18nProvider, normalizeLanguage, type I18n } from "./lib/i18n";
import { ApiError, fetchOrder, resolveBaseUrl, toArticles, type RawOrder } from "./lib/onestock";
import { useSettings } from "./lib/settings";

type Tab = "exchange" | "settings";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "loaded"; order: RawOrder };

export default function App() {
  const context = useOneStockContext();
  const { settings, save } = useSettings();
  const [tab, setTab] = useState<Tab>("exchange");
  const [load, setLoad] = useState<LoadState>({ status: "idle" });
  const [reloadKey, setReloadKey] = useState(0);

  // UI language: the lang sent by OneStock, unless forced in Settings.
  const auto = settings.uiLanguage === "auto";
  const language = normalizeLanguage(auto ? context.lang : settings.uiLanguage);
  const locale = auto ? context.locale : undefined;
  const i18n = useMemo(() => createI18n(language, locale), [language, locale]);
  const { t } = i18n;
  // Item features follow the context lang even when the UI has no translation for it.
  const featuresLang =
    settings.itemFeaturesLang.trim() || (auto && context.lang ? context.lang.slice(0, 2).toLowerCase() : language);

  const siteId = context.siteId || settings.siteIdOverride.trim();
  const orderId = context.orderId || settings.orderIdOverride.trim();
  const missing = [!siteId && t("app.siteId"), !orderId && t("app.orderId")].filter(Boolean) as string[];

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
    fetchOrder(settings, conn, orderId, featuresLang)
      .then((order) => !cancelled && setLoad({ status: "loaded", order }))
      .catch((error: unknown) => !cancelled && setLoad({ status: "error", error }));
    return () => {
      cancelled = true;
    };
  }, [ready, siteId, orderId, settings, context.apiUrl, featuresLang, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const articles = useMemo(() => (load.status === "loaded" ? toArticles(load.order, settings) : []), [load, settings]);

  return (
    <I18nProvider language={language} locale={locale}>
      <div className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
            <nav className="flex gap-4">
              {(
                [
                  ["exchange", "tabs.exchange"],
                  ["settings", "tabs.settings"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`py-3 text-[13px] font-bold border-b-2 transition-colors ${
                    tab === id ? "border-brand text-gray-800" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t(label)}
                </button>
              ))}
            </nav>
            <div className="text-[11px] text-gray-400 truncate">
              {siteId || t("header.noSite")} · {orderId || t("header.noOrder")}
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
            text={t("app.missing", { what: missing.join(` ${t("app.and")} `) })}
            action={t("app.openSettings")}
            onAction={() => setTab("settings")}
          />
        ) : load.status === "error" ? (
          <Notice
            tone="error"
            text={<ErrorMessage error={load.error} i18n={i18n} useProxy={settings.useProxy} />}
            action={t("app.openSettings")}
            onAction={() => setTab("settings")}
            secondary={t("app.retry")}
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
            {ready ? t("app.loading", { order: orderId }) : t("app.waiting")}
          </div>
        )}
      </div>
    </I18nProvider>
  );
}

function ErrorMessage({ error, i18n, useProxy }: { error: unknown; i18n: I18n; useProxy: boolean }) {
  const { t } = i18n;
  if (!(error instanceof ApiError)) return <>{error instanceof Error ? error.message : String(error)}</>;
  switch (error.code) {
    case "noToken":
      return <>{t("error.noToken")}</>;
    case "noCredentials":
      return <>{t("error.noCredentials")}</>;
    case "network":
      return (
        <>
          {t("error.network", { url: error.details.url ?? "", detail: error.message })}
          {!useProxy && <span className="block">{t("error.networkCors")}</span>}
        </>
      );
    default:
      return (
        <>
          {error.message}
          {error.details.requestId && (
            <span className="block text-[11px] opacity-70">Request-Id: {error.details.requestId}</span>
          )}
        </>
      );
  }
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
