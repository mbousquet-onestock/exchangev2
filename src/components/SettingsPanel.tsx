import { useState, type ReactNode } from "react";
import type { OneStockContext } from "../lib/context";
import { resolveBaseUrl } from "../lib/onestock";
import type { Settings } from "../lib/settings";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { FieldLabel, InfoBanner, inputClass, selectClass } from "./ui";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="px-3 py-2 border-b border-gray-100 text-[13px] font-bold text-gray-700">{title}</h3>
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
}: {
  settings: Settings;
  context: OneStockContext;
  onSave: (s: Settings) => void;
  onTest: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const text = (key: keyof Settings, label: string, hint?: ReactNode, type = "text", placeholder?: string) => (
    <div className="space-y-0.5">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        className={inputClass}
        value={draft[key] as string}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => set(key, e.target.value as never)}
      />
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
  const checkbox = (key: keyof Settings, label: string, hint?: ReactNode) => (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5 accent-brand"
        checked={draft[key] as boolean}
        onChange={(e) => set(key, e.target.checked as never)}
      />
      <span>
        <span className="text-[13px] font-medium text-gray-700">{label}</span>
        {hint && <Hint>{hint}</Hint>}
      </span>
    </label>
  );

  const siteId = context.siteId || draft.siteIdOverride || "{site_id}";
  const preview = resolveBaseUrl(draft, siteId, context.apiUrl);

  return (
    <main className="max-w-2xl w-full mx-auto px-4 py-4 pb-24 space-y-4">
      <InfoBanner text="Settings are stored in this browser only (localStorage)." />

      <Section title="OneStock context">
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <ContextRow label="Mode" value={context.embedded ? "Embedded (iframe)" : "Standalone"} />
          <ContextRow label="onestock_data" value={context.received ? "received" : "not received"} />
          <ContextRow label="Site id" value={context.siteId} />
          <ContextRow label="Order id" value={context.orderId} />
          <ContextRow label="User id" value={context.userId} />
          <ContextRow label="Host app" value={context.hostApp} />
          <ContextRow label="API url" value={context.apiUrl} />
        </div>
        <details>
          <summary className="text-[12px] font-semibold text-gray-500 cursor-pointer">Raw context</summary>
          <pre className="mt-2 p-2 bg-gray-50 border border-gray-100 rounded text-[11px] overflow-auto">
            {JSON.stringify({ urlParams: context.urlParams, data: context.data }, null, 2)}
          </pre>
        </details>
        <div className="grid grid-cols-2 gap-2.5">
          {text("siteIdOverride", "Site id (fallback)", "Used when the context has no site_id.", "text", "c00")}
          {text("orderIdOverride", "Order id (fallback)", "Used when the context has no order id.", "text", "ORD000001")}
        </div>
      </Section>

      <Section title="API connection">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-0.5">
            <FieldLabel>Environment</FieldLabel>
            <select
              className={selectClass}
              value={draft.environment}
              onChange={(e) => set("environment", e.target.value as Settings["environment"])}
            >
              <option value="qualif">Qualification</option>
              <option value="production">Production</option>
              <option value="custom">Custom URL</option>
            </select>
          </div>
          <div className="space-y-0.5">
            <FieldLabel>API version</FieldLabel>
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
            "Custom base URL",
            "Without version. {site_id} is replaced.",
            "text",
            "https://{site_id}.api.qualif.onestock-retail.com",
          )}
        {checkbox("useContextApiUrl", "Use the api_url sent by OneStock when available")}
        {checkbox(
          "useProxy",
          "Route calls through the /api/proxy CORS proxy",
          "Needed when the OneStock API refuses browser calls from this domain.",
        )}
        <p className="text-[11px] text-gray-500">
          Resolved base URL: <code className="text-gray-700">{preview}</code>
        </p>
      </Section>

      <Section title="Authentication">
        <div className="flex p-1 bg-gray-100 rounded-md">
          {(
            [
              ["token", "API token"],
              ["credentials", "Login / password"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => set("authMode", mode)}
              className={`flex-1 py-1 text-[11px] font-bold rounded transition-all ${
                draft.authMode === mode ? "bg-white shadow-sm text-brand" : "text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {draft.authMode === "token" ? (
          text("token", "Token", "Sent in the body of each request (root-level `token`).", "password")
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {text("userId", "User id", "A token is requested via POST /login.")}
            {text("password", "Password", undefined, "password")}
          </div>
        )}
      </Section>

      <Section title="Articles">
        <div className="grid grid-cols-2 gap-2.5">
          {text("itemFeaturesLang", "Item features lang")}
          {text("eligibleStates", "Eligible line states", "Comma separated, e.g. fulfilled, delivered")}
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {text("featureName", "Name feature")}
          {text("featureColor", "Color feature")}
          {text("featureSize", "Size feature")}
          {text("featureImage", "Image feature")}
        </div>
        {text("exchangeSizes", "Exchange sizes")}
        {text("exchangeColors", "Exchange colors")}
        {text("returnReasons", "Return reasons")}
      </Section>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setDraft({ ...DEFAULT_SETTINGS });
              setSaved(false);
            }}
            className="px-4 py-2 border border-gray-200 text-gray-600 text-[13px] font-bold rounded-lg hover:bg-gray-50"
          >
            Reset defaults
          </button>
          <div className="flex items-center gap-2">
            {saved && !dirty && <span className="text-[12px] text-brand font-semibold">Saved</span>}
            <button
              onClick={() => {
                onSave(draft);
                setSaved(true);
                onTest();
              }}
              className="px-4 py-2 border border-brand text-brand text-[13px] font-bold rounded-lg hover:bg-brand/5"
            >
              Save &amp; load order
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
              Save
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ContextRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <span className="text-gray-400">{label}: </span>
      <span className={`font-medium break-all ${value ? "text-gray-700" : "text-gray-300"}`}>{value || "—"}</span>
    </div>
  );
}
