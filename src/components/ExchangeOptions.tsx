import type { CatalogItem } from "../lib/catalog";
import { useI18n } from "../lib/i18n";
import { ApiError, type Article } from "../lib/onestock";
import type { CatalogState, Loadable } from "../lib/useCatalog";
import { FieldLabel, InfoBanner, ItemImage } from "./ui";

export interface ExchangeChoice {
  exchangeType: "same_model" | "different_model";
  /** Substitution item chosen for a different-model exchange. */
  exchangeArticleSku?: string;
  exchangePrice?: number;
}

export function ExchangeOptions({
  article,
  choice,
  onChange,
  state,
}: {
  article: Article;
  choice: ExchangeChoice;
  onChange: (patch: Partial<ExchangeChoice>) => void;
  state?: CatalogState;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3 pt-1 border-t border-gray-100 mt-1">
      <div className="flex p-1 bg-gray-100 rounded-md">
        {(
          [
            ["same_model", "config.sameModel"],
            ["different_model", "config.differentModel"],
          ] as const
        ).map(([type, label]) => (
          <button
            key={type}
            onClick={() => onChange({ exchangeType: type })}
            className={`flex-1 py-1 text-[11px] font-bold rounded transition-all ${
              choice.exchangeType === type ? "bg-white shadow-sm text-brand" : "text-gray-500"
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>
      {choice.exchangeType === "same_model" ? (
        // Same model: the ordered item itself, only its stock is shown.
        <StockBadge stock={state?.stock} itemId={article.sku} />
      ) : (
        <Substitutes article={article} choice={choice} onChange={onChange} state={state} />
      )}
    </div>
  );
}

function Substitutes({
  article,
  choice,
  onChange,
  state,
}: {
  article: Article;
  choice: ExchangeChoice;
  onChange: (patch: Partial<ExchangeChoice>) => void;
  state?: CatalogState;
}) {
  const { t } = useI18n();
  if (!article.substitutionIds.length) return <InfoBanner tone="warning" text={t("config.noSubstitutes")} />;
  if (!state || state.substitutes.status === "loading") return <Loading text={t("catalog.loading")} />;

  const quantities = state.stock.status === "ready" ? state.stock.value : undefined;
  const sheets = state.substitutes.status === "ready" ? state.substitutes.value : [];
  // Keep the order of the substitution feature; ids without sheet are still listed.
  const items: CatalogItem[] = article.substitutionIds.map(
    (id) => sheets.find((s) => s.id === id) ?? { id, name: id, features: {} },
  );
  const chosen = items.find((x) => x.id === choice.exchangeArticleSku);

  return (
    <div className="space-y-2">
      <FieldLabel>{t("config.substitutes", { count: items.length })}</FieldLabel>
      {state.substitutes.status === "error" && (
        <InfoBanner tone="warning" text={t("catalog.error", { detail: errorText(state.substitutes.error) })} />
      )}
      {state.stock.status === "error" && <StockBadge stock={state.stock} />}
      <div className="grid grid-cols-1 gap-2">
        {items.map((x) => (
          <SubstituteSheet
            key={x.id}
            item={x}
            article={article}
            quantity={quantities?.[x.id]}
            stockLoading={state.stock.status === "loading"}
            active={choice.exchangeArticleSku === x.id}
            onSelect={() => onChange({ exchangeArticleSku: x.id, exchangePrice: x.price })}
          />
        ))}
      </div>
      {chosen?.price !== undefined && <PriceDifference from={article} toPrice={chosen.price} />}
    </div>
  );
}

/** Item sheet of a substitute: picture, main attributes, stock and the other features. */
function SubstituteSheet({
  item,
  article,
  quantity,
  stockLoading,
  active,
  onSelect,
}: {
  item: CatalogItem;
  article: Article;
  quantity?: number;
  stockLoading: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  const { t, formatPrice } = useI18n();
  const disabled = quantity === 0;
  const shown = new Set(["name", "color", "size", "price", "image", "image_url"]);
  const extra = Object.entries(item.features).filter(([name, value]) => !shown.has(name) && !value.startsWith("http"));
  return (
    <div
      onClick={() => !disabled && onSelect()}
      className={`p-2 border rounded-lg transition-all ${
        disabled
          ? "opacity-50 cursor-not-allowed border-gray-100"
          : active
            ? "cursor-pointer border-brand bg-brand/5"
            : "cursor-pointer border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <ItemImage
          src={item.imageUrl}
          alt={item.name}
          className="w-16 h-16 rounded-md border border-gray-100 overflow-hidden flex-shrink-0"
        />
        <div className="flex-grow min-w-0">
          <p className="text-[13px] font-bold text-gray-800 leading-tight">{item.name}</p>
          <p className="text-[12px] text-gray-600">
            {[item.price !== undefined ? formatPrice(item.price, article.currency) : undefined, item.color, item.size]
              .filter(Boolean)
              .join(" | ")}
          </p>
          <p className="text-[10px] text-gray-400">{item.id}</p>
        </div>
        <StockPill quantity={quantity} loading={stockLoading} />
      </div>
      {extra.length > 0 && (
        <details className="mt-1.5" onClick={(e) => e.stopPropagation()}>
          <summary className="text-[11px] text-gray-500 cursor-pointer select-none">{t("config.sheetDetails")}</summary>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
            {extra.map(([name, value]) => (
              <div key={name} className="contents">
                <dt className="text-gray-400">{name}</dt>
                <dd className="text-gray-700 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-gray-400 py-1">
      <div className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      {text}
    </div>
  );
}

/** Stock line for one item, or the stock error when there is one. */
function StockBadge({ stock, itemId }: { stock?: Loadable<Record<string, number>>; itemId?: string }) {
  const { t } = useI18n();
  if (!stock || stock.status === "loading") return <Loading text={t("stock.loading")} />;
  if (stock.status === "error") {
    const notConfigured = stock.error instanceof ApiError && stock.error.code === "stockNotConfigured";
    return (
      <p className="text-[11px] text-gray-400">
        {notConfigured ? t("stock.notConfigured") : t("stock.error", { detail: errorText(stock.error) })}
      </p>
    );
  }
  const q = itemId ? stock.value[itemId] : undefined;
  if (q === undefined) return <p className="text-[11px] text-gray-400">{t("stock.unknown")}</p>;
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold ${
        q > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${q > 0 ? "bg-green-500" : "bg-red-500"}`} />
      {q > 0 ? t("stock.available", { count: q }) : t("stock.out")}
    </div>
  );
}

function StockPill({ quantity, loading }: { quantity?: number; loading?: boolean }) {
  const { t } = useI18n();
  if (quantity === undefined) {
    return loading ? (
      <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin flex-shrink-0" />
    ) : null;
  }
  return (
    <span
      className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
        quantity > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
      }`}
    >
      {quantity > 0 ? t("stock.short", { count: quantity }) : t("stock.out")}
    </span>
  );
}

export function PriceDifference({ from, toPrice }: { from: Article; toPrice: number }) {
  const { t, rich, formatPrice } = useI18n();
  const diff = toPrice - from.price;
  const tone =
    diff > 0
      ? "bg-orange-50 border-orange-100 text-orange-800"
      : diff < 0
        ? "bg-green-50 border-green-100 text-green-800"
        : "bg-gray-50 border-gray-100 text-gray-600";
  const amount = <strong>{formatPrice(Math.abs(diff), from.currency)}</strong>;
  return (
    <div className={`p-2 rounded-md border text-[11px] font-medium leading-tight ${tone}`}>
      {diff > 0 ? rich("price.payByLink", { amount }) : diff < 0 ? rich("price.refund", { amount }) : t("price.even")}
    </div>
  );
}
