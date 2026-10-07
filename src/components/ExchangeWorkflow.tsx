import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n, type MessageKey } from "../lib/i18n";
import type { Article, RawOrder } from "../lib/onestock";
import { splitList } from "../lib/settings";
import { useCatalog, type ApiContext } from "../lib/useCatalog";
import { ArticleCard } from "./ArticleCard";
import { ExchangeOptions, type ExchangeChoice } from "./ExchangeOptions";
import { Step, StepIndicator } from "./StepIndicator";
import { CheckIcon, FieldLabel, InfoBanner, ItemImage, inputClass, selectClass } from "./ui";

interface ItemConfig extends ExchangeChoice {
  action: "return" | "exchange";
  reason: string;
}

interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
}

const RETURN_METHODS: { id: string; label: MessageKey; description: MessageKey; icon: ReactNode }[] = [
  {
    id: "in-store",
    label: "method.inStore",
    description: "method.inStoreDesc",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
  {
    id: "carrier",
    label: "method.carrier",
    description: "method.carrierDesc",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
  },
];

function contactFromOrder(order: RawOrder): Contact {
  const address = order.delivery?.destination?.address;
  const customer = order.customer ?? {};
  const contact = address?.contact ?? {};
  return {
    firstName: customer.first_name ?? contact.first_name ?? "",
    lastName: customer.last_name ?? contact.last_name ?? "",
    email: customer.email ?? contact.email ?? "",
    phone: customer.phone_number ?? contact.phone_number ?? "",
    address: (address?.lines ?? []).join(", "),
    city: address?.city ?? "",
    zipCode: address?.zip_code ?? "",
    country: address?.regions?.country?.code ?? "",
  };
}

export function ExchangeWorkflow({
  order,
  articles,
  api,
  onReload,
  onOpenSettings,
}: {
  order: RawOrder;
  articles: Article[];
  api: ApiContext;
  onReload: () => void;
  onOpenSettings: () => void;
}) {
  const { settings } = api;
  const catalog = useCatalog(api);
  const [step, setStep] = useState<Step>(Step.Selection);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [configs, setConfigs] = useState<Record<string, ItemConfig>>({});
  const [method, setMethod] = useState("");
  const [contact, setContact] = useState<Contact>(() => contactFromOrder(order));

  const { t, rich, formatPrice } = useI18n();
  // Return and exchange reasons are distinct lists; empty settings fall back to translated defaults.
  const reasons = useMemo(
    () => ({
      return: splitList(settings.returnReasons || t("reasons.return")),
      exchange: splitList(settings.exchangeReasons || t("reasons.exchange")),
    }),
    [settings.returnReasons, settings.exchangeReasons, t],
  );
  const sizes = useMemo(() => splitList(settings.exchangeSizes), [settings.exchangeSizes]);
  const colors = useMemo(() => splitList(settings.exchangeColors), [settings.exchangeColors]);

  const eligible = articles.filter((a) => a.eligible);
  const notEligible = articles.filter((a) => !a.eligible);
  const selected = articles.filter((a) => selectedIds.includes(a.id));

  // Load catalog + stock as soon as an item is set to "exchange".
  const { ensure } = catalog;
  useEffect(() => {
    for (const a of selected) if (configs[a.id]?.action === "exchange") ensure(a.sku);
  }, [selected, configs, ensure]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setConfigs((prev) =>
      prev[id]
        ? prev
        : { ...prev, [id]: { action: "return", reason: reasons.return[0] ?? "", exchangeType: "same_model" } },
    );
  };
  const update = useCallback(
    (id: string, patch: Partial<ItemConfig>) => setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })),
    [],
  );

  const canGoNext = !(step === Step.Selection && selectedIds.length === 0) && !(step === Step.Method && !method);
  const next = () => canGoNext && setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const request = useMemo(
    () => ({
      order_id: order.id,
      return_method: method,
      contact,
      items: selected.map((a) => {
        const c = configs[a.id];
        return {
          line_item_group_id: a.id,
          order_item_id: a.orderItemId,
          item_id: a.sku,
          quantity: a.quantity,
          action: c.action,
          reason: c.reason,
          ...(c.action === "exchange"
            ? c.exchangeType === "same_model"
              ? {
                  exchange: {
                    type: c.exchangeType,
                    item_id: c.exchangeItemId,
                    size: c.exchangeSize ?? a.size,
                    color: c.exchangeColor ?? a.color,
                  },
                }
              : { exchange: { type: c.exchangeType, item_id: c.exchangeArticleSku, price: c.exchangePrice } }
            : {}),
        };
      }),
    }),
    [order.id, method, contact, selected, configs],
  );

  const renderSelection = () => (
    <div className="space-y-2">
      <InfoBanner text={t("selection.banner", { order: order.id })} />
      {eligible.length === 0 && (
        <InfoBanner tone="warning" text={t("selection.noneEligible", { states: settings.eligibleStates || "—" })} />
      )}
      {eligible.map((a) => (
        <ArticleCard key={a.id} article={a} isSelected={selectedIds.includes(a.id)} onToggle={toggle} />
      ))}
      {notEligible.length > 0 && (
        <details className="pt-2">
          <summary className="text-[12px] font-semibold text-gray-500 cursor-pointer select-none">
            {t("selection.notEligible", { count: notEligible.length })}
          </summary>
          <div className="mt-2">
            {notEligible.map((a) => (
              <ArticleCard key={a.id} article={a} isSelected={false} />
            ))}
          </div>
        </details>
      )}
    </div>
  );

  const renderConfiguration = () => (
    <div className="space-y-4">
      <InfoBanner text={t("config.banner")} />
      {selected.map((a) => {
        const c = configs[a.id];
        const actionReasons = reasons[c.action];
        return (
          <div key={a.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="flex items-center p-2.5 border-b border-gray-100 bg-gray-50/50">
              <ItemImage
                src={a.imageUrl}
                alt=""
                className="w-10 h-10 rounded-md mr-3 border border-gray-200 overflow-hidden"
              />
              <div className="flex flex-col">
                <span className="font-bold text-gray-800 text-[14px]">{a.name}</span>
                <span className="text-[12px] text-gray-500">
                  {a.sku} • {formatPrice(a.price, a.currency)}
                </span>
              </div>
            </div>
            <div className="p-3 space-y-3">
              <div className="flex gap-2">
                {(["return", "exchange"] as const).map((action) => (
                  <button
                    key={action}
                    // Each action has its own reasons: reset to the first one when switching.
                    onClick={() => action !== c.action && update(a.id, { action, reason: reasons[action][0] ?? "" })}
                    className={`flex-1 py-2 px-3 rounded-lg border text-[13px] font-bold transition-all ${
                      c.action === action
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {t(action === "return" ? "config.return" : "config.exchange")}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <FieldLabel>{t(c.action === "return" ? "config.returnReason" : "config.exchangeReason")}</FieldLabel>
                <select
                  className={selectClass}
                  value={c.reason}
                  onChange={(e) => update(a.id, { reason: e.target.value })}
                >
                  {actionReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {c.action === "exchange" && (
                <ExchangeOptions
                  article={a}
                  choice={c}
                  onChange={(patch) => update(a.id, patch)}
                  state={catalog.entries[a.sku]}
                  fallbackSizes={sizes}
                  fallbackColors={colors}
                  orderArticles={articles}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderMethod = () => (
    <div className="space-y-2">
      <InfoBanner text={t("method.banner")} />
      {RETURN_METHODS.map((m) => (
        <div
          key={m.id}
          onClick={() => setMethod(m.id)}
          className={`group flex items-center p-3.5 bg-white border rounded-lg cursor-pointer transition-all hover:border-brand shadow-sm ${
            method === m.id ? "border-brand ring-2 ring-brand/5" : "border-gray-200"
          }`}
        >
          <div className="mr-4 text-gray-400 group-hover:text-brand transition-colors scale-90">{m.icon}</div>
          <div className="flex-grow">
            <h4 className="text-[14px] font-bold text-gray-800 leading-tight">{t(m.label)}</h4>
            <p className="text-[12px] text-gray-500 mt-0.5">{t(m.description)}</p>
          </div>
          <div
            className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
              method === m.id ? "border-brand" : "border-gray-300"
            }`}
          >
            {method === m.id && <div className="w-[8px] h-[8px] rounded-full bg-brand" />}
          </div>
        </div>
      ))}
    </div>
  );

  const contactField = (key: keyof Contact, label: MessageKey, type = "text") => (
    <div className="space-y-0.5">
      <FieldLabel>{t(label)}</FieldLabel>
      <input
        type={type}
        className={inputClass}
        value={contact[key]}
        onChange={(e) => setContact((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  );

  const renderValidation = () => (
    <div className="space-y-3">
      <InfoBanner text={t("validation.banner")} />
      <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2.5 shadow-sm">
        <div className="grid grid-cols-2 gap-2.5">
          {contactField("firstName", "field.firstName")}
          {contactField("lastName", "field.lastName")}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {contactField("email", "field.email", "email")}
          {contactField("phone", "field.phone", "tel")}
        </div>
        {contactField("address", "field.address")}
        <div className="grid grid-cols-3 gap-2.5">
          {contactField("city", "field.city")}
          {contactField("zipCode", "field.zip")}
          {contactField("country", "field.country")}
        </div>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="text-center py-8 px-2">
      <div className="w-14 h-14 bg-brand-light text-brand rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckIcon className="w-7 h-7" strokeWidth={3} />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">{t("confirm.title")}</h2>
      <p className="text-[13px] text-gray-500 max-w-sm mx-auto mb-4 leading-relaxed">
        {rich("confirm.text", {
          order: <strong>{order.id}</strong>,
          email: <strong>{contact.email || t("confirm.customer")}</strong>,
        })}
      </p>
      <details className="text-left max-w-xl mx-auto mb-6">
        <summary className="text-[12px] font-semibold text-gray-500 cursor-pointer">{t("confirm.payload")}</summary>
        <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg text-[11px] overflow-auto">
          {JSON.stringify(request, null, 2)}
        </pre>
      </details>
      <button
        onClick={() => {
          setStep(Step.Selection);
          setSelectedIds([]);
          setConfigs({});
          setMethod("");
          onReload();
        }}
        className="px-6 py-2 bg-brand text-white text-[14px] font-bold rounded-lg hover:bg-brand-dark transition-colors"
      >
        {t("confirm.done")}
      </button>
    </div>
  );

  return (
    <>
      {step !== Step.Confirmation && <StepIndicator currentStep={step} />}
      <main className="flex-grow max-w-2xl w-full mx-auto px-4 pb-20">
        {step === Step.Selection && renderSelection()}
        {step === Step.Configuration && renderConfiguration()}
        {step === Step.Method && renderMethod()}
        {step === Step.Validation && renderValidation()}
        {step === Step.Confirmation && renderConfirmation()}
      </main>
      {step !== Step.Confirmation && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 z-50">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              {step > Step.Selection && (
                <button
                  onClick={back}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-[13px] font-bold rounded-lg hover:bg-gray-50"
                >
                  {t("footer.back")}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {/* Discreet entry point to the Settings tab, left of Cancel. */}
              <button
                onClick={onOpenSettings}
                title={t("footer.settings")}
                aria-label={t("footer.settings")}
                className="w-9 flex items-center justify-center text-gray-300 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              <button
                onClick={() => {
                  setStep(Step.Selection);
                  setSelectedIds([]);
                }}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-[13px] font-bold rounded-lg hover:bg-gray-50"
              >
                {t("footer.cancel")}
              </button>
              <button
                onClick={next}
                disabled={!canGoNext}
                className={`px-6 py-2 bg-brand text-white text-[13px] font-bold rounded-lg hover:bg-brand-dark transition-all ${
                  canGoNext ? "" : "opacity-50 cursor-not-allowed"
                }`}
              >
                {t(step === Step.Validation ? "footer.confirm" : "footer.next")}
              </button>
            </div>
          </div>
        </footer>
      )}
    </>
  );
}
