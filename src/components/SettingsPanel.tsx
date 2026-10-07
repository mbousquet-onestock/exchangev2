import { useState, type ReactNode } from "react";
import type { OneStockContext } from "../lib/context";
import { LANGUAGES, useI18n, type MessageKey } from "../lib/i18n";
import { resolveBaseUrl } from "../lib/onestock";
import type { Settings } from "../lib/settings";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { FieldLabel, InfoBanner, inputClass, selectClass } from "./ui";

function Section({ title, children }: { title: MessageKey; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="px-3 py-2 border-b border-gray-100 text-[13px] font-bold text-gray-700">{t(title)}</h3>
      <div className="p-3 space-y-3">{children}</div>
    </section>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-gray-400 mt-0.5">{children}</p>;
}

export function SettingsPanel({
  settings,
  context,
  onSave,
  onTest,
  onClose,
}: {
  settings: Settings;
  context: OneStockContext;
  onSave: (s: Settings) => void;
  onTest: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const text = (key: keyof Settings, label: MessageKey, hint?: ReactNode, type = "text", placeholder?: string) => (
    <div className="space-y-0.5">
      <FieldLabel>{t(label)}</FieldLabel>
      <input
        type={type}
        className={inputClass}
        value={draft[key] as string | number}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) =>
          set(key, (typeof draft[key] === "number" ? Number(e.target.value) || 0 : e.target.value) as never)
        }
      />
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
  const checkbox = (key: keyof Settings, label: MessageKey, hint?: ReactNode) => (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5 accent-brand"
        checked={draft[key] as boolean}
        onChange={(e) => set(key, e.target.checked as never)}
      />
      <span>
        <span className="text-[13px] font-medium text-gray-700">{t(label)}</span>
        {hint && <Hint>{hint}</Hint>}
      </span>
    </label>
  );

  const siteId = context.siteId || draft.siteIdOverride || "{site_id}";
  const preview = resolveBaseUrl(draft, siteId, context.apiUrl);

  return (
    <main className="max-w-2xl w-full mx-auto px-4 py-4 pb-24 space-y-4">
      <InfoBanner text={t("settings.stored")} />

      <Section title="settings.context">
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <ContextRow
            label={t("settings.mode")}
            value={t(context.embedded ? "settings.embedded" : "settings.standalone")}
          />
          <ContextRow
            label="onestock_data"
            value={t(context.received ? "settings.received" : "settings.notReceived")}
          />
          <ContextRow label={t("settings.siteId")} value={context.siteId} />
          <ContextRow label={t("settings.orderId")} value={context.orderId} />
          <ContextRow label={t("settings.userId")} value={context.userId} />
          <ContextRow label={t("settings.hostApp")} value={context.hostApp} />
          <ContextRow
            label={t("settings.language")}
            value={[context.lang, context.locale].filter(Boolean).join(" / ")}
          />
          <ContextRow label={t("settings.apiUrl")} value={context.apiUrl} />
        </div>
        <details>
          <summary className="text-[12px] font-semibold text-gray-500 cursor-pointer">
            {t("settings.rawContext")}
          </summary>
          <pre className="mt-2 p-2 bg-gray-50 border border-gray-100 rounded text-[11px] overflow-auto">
            {JSON.stringify({ urlParams: context.urlParams, data: context.data }, null, 2)}
          </pre>
        </details>
        <div className="grid grid-cols-2 gap-2.5">
          {text("siteIdOverride", "settings.siteIdFallback", t("settings.siteIdFallbackHint"), "text", "c00")}
          {text("orderIdOverride", "settings.orderIdFallback", t("settings.orderIdFallbackHint"), "text", "ORD000001")}
        </div>
      </Section>

      <Section title="settings.connection">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-0.5">
            <FieldLabel>{t("settings.environment")}</FieldLabel>
            <select
              className={selectClass}
              value={draft.environment}
              onChange={(e) => set("environment", e.target.value as Settings["environment"])}
            >
              <option value="qualif">{t("settings.qualif")}</option>
              <option value="production">{t("settings.production")}</option>
              <option value="custom">{t("settings.custom")}</option>
            </select>
          </div>
          <div className="space-y-0.5">
            <FieldLabel>{t("settings.apiVersion")}</FieldLabel>
            <select
              className={selectClass}
              value={draft.apiVersion}
              onChange={(e) => set("apiVersion", e.target.value as Settings["apiVersion"])}
            >
              {["v1", "v2", "v3", "v4"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        {draft.environment === "custom" &&
          text(
            "customBaseUrl",
            "settings.customBaseUrl",
            t("settings.customBaseUrlHint"),
            "text",
            "https://{site_id}.api.qualif.onestock-retail.com",
          )}
        {checkbox("useContextApiUrl", "settings.useContextApiUrl")}
        {checkbox("useProxy", "settings.useProxy", t("settings.useProxyHint"))}
        <p className="text-[11px] text-gray-500">
          {t("settings.resolvedUrl")} <code className="text-gray-700">{preview}</code>
        </p>
      </Section>

      <Section title="settings.auth">
        <div className="flex p-1 bg-gray-100 rounded-md">
          {(
            [
              ["token", "settings.authToken"],
              ["credentials", "settings.authCredentials"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => set("authMode", mode)}
              className={`flex-1 py-1 text-[11px] font-bold rounded transition-all ${
                draft.authMode === mode ? "bg-white shadow-sm text-brand" : "text-gray-500"
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>
        {draft.authMode === "token" ? (
          text("token", "settings.token", t("settings.tokenHint"), "password")
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {text("userId", "settings.user", t("settings.userHint"))}
            {text("password", "settings.password", undefined, "password")}
          </div>
        )}
      </Section>

      <Section title="settings.display">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-0.5">
            <FieldLabel>{t("settings.uiLanguage")}</FieldLabel>
            <select
              className={selectClass}
              value={draft.uiLanguage}
              onChange={(e) => set("uiLanguage", e.target.value as Settings["uiLanguage"])}
            >
              <option value="auto">{t("settings.auto", { lang: context.lang || "—" })}</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_NAMES[l]}
                </option>
              ))}
            </select>
          </div>
          {text("itemFeaturesLang", "settings.featuresLang", t("settings.featuresLangHint"))}
        </div>
      </Section>

      <Section title="settings.articles">
        <div className="grid grid-cols-2 gap-2.5">
          {text("eligibleStates", "settings.eligibleStates", t("settings.eligibleStatesHint"))}
          {text("returnState", "settings.returnState", t("settings.returnStateHint"))}
        </div>
        {checkbox("closeOnConfirm", "settings.closeOnConfirm", t("settings.closeOnConfirmHint"))}
        {draft.closeOnConfirm &&
          text("closeMessageType", "settings.closeMessageType", t("settings.closeMessageTypeHint"))}
        {checkbox("refreshOnConfirm", "settings.refreshOnConfirm", t("settings.refreshOnConfirmHint"))}
        {draft.refreshOnConfirm && (
          <div className="grid grid-cols-2 gap-2.5">
            {text("refreshMessageType", "settings.refreshMessageType")}
            {text(
              "refreshUrl",
              "settings.refreshUrl",
              t("settings.refreshUrlHint"),
              "text",
              "https://admin-qualif.onestock-retail.com/{site_id}/order/detail/{order_id}",
            )}
          </div>
        )}
        {text("subOrderIdFormat", "settings.subOrderIdFormat", t("settings.subOrderIdFormatHint"))}
        <div className="grid grid-cols-4 gap-2.5">
          {text("featureName", "settings.featureName")}
          {text("featureColor", "settings.featureColor")}
          {text("featureSize", "settings.featureSize")}
          {text("featureImage", "settings.featureImage")}
        </div>
      </Section>

      <Section title="settings.stock">
        {text("stockRequestName", "settings.stockRequestName", t("settings.stockRequestNameHint"))}
        {text("stockEndpointIds", "settings.stockEndpointIds", t("settings.stockEndpointIdsHint"))}
        {text("featureSubstitution", "settings.featureSubstitution", t("settings.featureSubstitutionHint"))}
        <div className="grid grid-cols-2 gap-2.5">
          {text("featurePrice", "settings.featurePrice")}
          {text("sheetFeatures", "settings.sheetFeatures", t("settings.sheetFeaturesHint"))}
        </div>
      </Section>

      <Section title="settings.reasons">
        <Hint>{t("settings.reasonsHint")}</Hint>
        {text("returnReasons", "settings.returnReasons", undefined, "text", t("reasons.return"))}
        {text("exchangeReasons", "settings.exchangeReasons", undefined, "text", t("reasons.exchange"))}
      </Section>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-[13px] font-bold rounded-lg hover:bg-gray-50"
            >
              {t("settings.backToExchange")}
            </button>
            <button
              onClick={() => {
                setDraft({ ...DEFAULT_SETTINGS });
                setSaved(false);
              }}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-[13px] font-bold rounded-lg hover:bg-gray-50"
            >
              {t("settings.reset")}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {saved && !dirty && <span className="text-[12px] text-brand font-semibold">{t("settings.saved")}</span>}
            <button
              onClick={() => {
                onSave(draft);
                setSaved(true);
                onTest();
              }}
              className="px-4 py-2 border border-brand text-brand text-[13px] font-bold rounded-lg hover:bg-brand/5"
            >
              {t("settings.saveAndLoad")}
            </button>
            <button
              onClick={() => {
                onSave(draft);
                setSaved(true);
              }}
              disabled={!dirty}
              className={`px-6 py-2 bg-brand text-white text-[13px] font-bold rounded-lg hover:bg-brand-dark ${
                dirty ? "" : "opacity-50 cursor-not-allowed"
              }`}
            >
              {t("settings.save")}
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}

const LANGUAGE_NAMES: Record<(typeof LANGUAGES)[number], string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
};

function ContextRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <span className="text-gray-400">{label}: </span>
      <span className={`font-medium break-all ${value ? "text-gray-700" : "text-gray-300"}`}>{value || "—"}</span>
    </div>
  );
}
