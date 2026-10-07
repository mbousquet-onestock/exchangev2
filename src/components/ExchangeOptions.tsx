import { useEffect, useMemo, useState } from "react";
import type { CatalogItem } from "../lib/catalog";
import { useI18n } from "../lib/i18n";
import { ApiError, type Article } from "../lib/onestock";
import type { CatalogState, Loadable } from "../lib/useCatalog";
import { FieldLabel, InfoBanner, ItemImage, inputClass, selectClass } from "./ui";

export interface ExchangeChoice {
  exchangeType: "same_model" | "different_model";
  exchangeSize?: string;
  exchangeColor?: string;
  /** Catalog item chosen for a same-model exchange (matching size / color). */
  exchangeItemId?: string;
  /** Catalog item chosen for a different-model exchange. */
  exchangeArticleSku?: string;
  exchangePrice?: number;
}

const unique = (values: (string | undefined)[]) => [...new Set(values.filter((v): v is string => !!v))];

export function ExchangeOptions({
  article,
  choice,
  onChange,
  state,
  fallbackSizes,
  fallbackColors,
  orderArticles,
}: {
  article: Article;
  choice: ExchangeChoice;
  onChange: (patch: Partial<ExchangeChoice>) => void;
  state?: CatalogState;
  fallbackSizes: string[];
  fallbackColors: string[];
  orderArticles: Article[];
}) {
  const { t } = useI18n();
  const catalog = state?.catalog.status === "ready" ? state.catalog.value : undefined;
  const stock = state?.stock;

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

      {state?.catalog.status === "loading" ? (
        <Loading text={t("catalog.loading")} />
      ) : (
        <>
          {state?.catalog.status === "error" && (
            <InfoBanner tone="warning" text={t("catalog.error", { detail: errorText(state.catalog.error) })} />
          )}
          {choice.exchangeType === "same_model" ? (
            <SameModel
              article={article}
              choice={choice}
              onChange={onChange}
              variants={catalog?.variants}
              reference={catalog?.item}
              stock={stock}
              fallbackSizes={fallbackSizes}
              fallbackColors={fallbackColors}
            />
          ) : (
            <DifferentModel
              article={article}
              choice={choice}
              onChange={onChange}
              substitutes={catalog?.substitutes}
              stock={stock}
              orderArticles={orderArticles}
            />
          )}
        </>
      )}
    </div>
  );
}

function SameModel({
  article,
  choice,
  onChange,
  variants,
  reference,
  stock,
  fallbackSizes,
  fallbackColors,
}: {
  article: Article;
  choice: ExchangeChoice;
  onChange: (patch: Partial<ExchangeChoice>) => void;
  variants?: CatalogItem[];
  /** The ordered item as found in the catalog: its color / size are the defaults. */
  reference?: CatalogItem;
  stock?: Loadable<Record<string, number>>;
  fallbackSizes: string[];
  fallbackColors: string[];
}) {
  const { t } = useI18n();
  const fromCatalog = !!variants && variants.length > 0;
  const color = choice.exchangeColor ?? reference?.color ?? article.color ?? "";
  const size = choice.exchangeSize ?? reference?.size ?? article.size ?? "";

  const colors = fromCatalog ? unique(variants.map((v) => v.color)) : unique([article.color, ...fallbackColors]);
  const sizesFor = (c: string) =>
    fromCatalog
      ? unique(variants.filter((v) => (v.color ?? "") === c).map((v) => v.size))
      : unique([article.size, ...fallbackSizes]);
  const sizes = sizesFor(color);
  const variantOf = (c: string, s: string) => variants?.find((v) => (v.color ?? "") === c && (v.size ?? "") === s);
  const variant = fromCatalog ? variantOf(color, size) : undefined;
  // Without catalog, only the ordered item itself has a known id.
  const stockItemId = fromCatalog
    ? variant?.id
    : color === (article.color ?? "") && size === (article.size ?? "")
      ? article.sku
      : undefined;

  // Keep the chosen catalog item in the request payload.
  useEffect(() => {
    if (choice.exchangeItemId !== variant?.id) onChange({ exchangeItemId: variant?.id });
  }, [variant?.id, choice.exchangeItemId, onChange]);

  const quantity = (id?: string) => (id && stock?.status === "ready" ? stock.value[id] : undefined);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <FieldLabel>{t("config.color")}</FieldLabel>
          <select
            className={selectClass}
            value={color}
            onChange={(e) => {
              const next = e.target.value;
              // Keep the size when it exists in the new color, otherwise take the first one.
              const nextSizes = sizesFor(next);
              onChange({ exchangeColor: next, exchangeSize: nextSizes.includes(size) ? size : nextSizes[0] });
            }}
          >
            {!color && <option value="">—</option>}
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("config.size")}</FieldLabel>
          <select className={selectClass} value={size} onChange={(e) => onChange({ exchangeSize: e.target.value })}>
            {!size && <option value="">—</option>}
            {sizes.map((s) => {
              const q = fromCatalog ? quantity(variantOf(color, s)?.id) : undefined;
              return (
                <option key={s} value={s}>
                  {q === undefined ? s : `${s} — ${q > 0 ? t("stock.short", { count: q }) : t("stock.out")}`}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      {fromCatalog && !variant ? (
        <InfoBanner tone="warning" text={t("config.variantNotFound")} />
      ) : (
        <StockBadge stock={stock} itemId={stockItemId} />
      )}
    </div>
  );
}

function DifferentModel({
  article,
  choice,
  onChange,
  substitutes,
  stock,
  orderArticles,
}: {
  article: Article;
  choice: ExchangeChoice;
  onChange: (patch: Partial<ExchangeChoice>) => void;
  substitutes?: CatalogItem[];
  stock?: Loadable<Record<string, number>>;
  orderArticles: Article[];
}) {
  const { t, formatPrice } = useI18n();
  const [search, setSearch] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const quantities = stock?.status === "ready" ? stock.value : undefined;

  // Substitutes from the catalog; without catalog, fall back on the other items of the order.
  const candidates: CatalogItem[] = useMemo(
    () =>
      substitutes ??
      [...new Map(orderArticles.filter((a) => a.sku !== article.sku).map((a) => [a.sku, a])).values()].map((a) => ({
        id: a.sku,
        categoryIds: [],
        name: a.name,
        color: a.color,
        size: a.size,
        imageUrl: a.imageUrl,
        price: a.price,
      })),
    [substitutes, orderArticles, article.sku],
  );

  const needle = search.toLowerCase();
  const list = candidates
    .filter((x) => x.name.toLowerCase().includes(needle) || x.id.toLowerCase().includes(needle))
    .filter((x) => !inStockOnly || (quantities?.[x.id] ?? 0) > 0)
    .sort((a, b) => (quantities?.[b.id] ?? -1) - (quantities?.[a.id] ?? -1));
  const chosen = candidates.find((x) => x.id === choice.exchangeArticleSku);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel>{t("config.substitutes", { count: candidates.length })}</FieldLabel>
        {quantities && (
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              className="accent-brand"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
            />
            {t("config.inStockOnly")}
          </label>
        )}
      </div>
      <input
        type="text"
        placeholder={t("config.search")}
        className={inputClass}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {stock?.status === "error" && <StockBadge stock={stock} />}
      <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
        {list.length > 0 ? (
          list.map((x) => {
            const q = quantities?.[x.id];
            const disabled = q === 0;
            const active = choice.exchangeArticleSku === x.id;
            return (
              <div
                key={x.id}
                onClick={() => !disabled && onChange({ exchangeArticleSku: x.id, exchangePrice: x.price })}
                className={`flex items-center p-1.5 border rounded-md transition-all ${
                  disabled
                    ? "opacity-50 cursor-not-allowed border-gray-100"
                    : active
                      ? "cursor-pointer border-brand bg-brand/5"
                      : "cursor-pointer border-gray-200 hover:border-gray-300"
                }`}
              >
                <ItemImage
                  src={x.imageUrl}
                  alt=""
                  className="w-8 h-8 rounded mr-2.5 border border-gray-100 overflow-hidden flex-shrink-0"
                />
                <div className="flex-grow min-w-0">
                  <p className="text-[12px] font-bold text-gray-800 truncate">{x.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {[x.color, x.size, x.price !== undefined ? formatPrice(x.price, article.currency) : undefined, x.id]
                      .filter(Boolean)
                      .join(" | ")}
                  </p>
                </div>
                <StockPill quantity={q} loading={stock?.status === "loading"} />
              </div>
            );
          })
        ) : (
          <p className="text-center py-2 text-gray-400 text-[11px]">{t("config.noArticles")}</p>
        )}
      </div>
      {chosen?.price !== undefined && <PriceDifference from={article} toPrice={chosen.price} />}
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
      className={`ml-2 flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
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
