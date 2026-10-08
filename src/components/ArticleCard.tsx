import { useI18n, type I18n } from "../lib/i18n";
import type { Article } from "../lib/onestock";
import { CheckIcon, ItemImage } from "./ui";

export function ArticleCard({
  article,
  isSelected,
  onToggle,
}: {
  article: Article;
  isSelected: boolean;
  onToggle?: (id: string) => void;
}) {
  const { t, formatPrice, formatDate, stateLabel } = useI18n();
  const disabled = !article.eligible;
  const details = [formatPrice(article.price, article.currency), article.color, article.size]
    .filter(Boolean)
    .join(" | ");
  return (
    <div
      onClick={() => !disabled && onToggle?.(article.id)}
      className={`group relative flex items-center p-2.5 mb-1.5 bg-white border rounded-lg transition-all ${
        disabled
          ? "border-gray-100 opacity-60 cursor-not-allowed"
          : `cursor-pointer hover:border-brand ${isSelected ? "border-brand shadow-sm" : "border-gray-200"}`
      }`}
    >
      <ItemImage
        src={article.imageUrl}
        alt={article.name}
        className="w-[56px] h-[56px] mr-3 rounded-md overflow-hidden flex-shrink-0 border border-gray-100"
      />
      <div className="flex-grow min-w-0">
        <h3 className="text-[14px] font-bold text-gray-800 leading-tight mb-0.5 truncate">{article.name}</h3>
        <p className="text-[13px] text-gray-600 font-medium">{details}</p>
        <p className="text-[11px] text-gray-400 tracking-tight font-medium">{article.sku}</p>
        {disabled ? (
          <p className="text-[11px] text-gray-500 font-medium">
            {t("article.notEligible", { state: stateLabel(article.state) })}
          </p>
        ) : (
          <ReturnInfo article={article} t={t} formatDate={formatDate} />
        )}
      </div>
      <div className="flex items-center gap-3 pr-1">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight ${
            disabled ? "bg-gray-100 text-gray-500" : "bg-brand-light text-brand"
          }`}
        >
          {stateLabel(article.state)}
        </span>
        <span className="text-[13px] text-gray-700 font-semibold whitespace-nowrap">
          {t("article.qty", { qty: article.quantity })}
        </span>
        {!disabled && (
          <div
            className={`w-[18px] h-[18px] border-2 rounded transition-all duration-200 flex items-center justify-center ${
              isSelected ? "bg-brand border-brand" : "border-gray-300"
            }`}
          >
            {isSelected && <CheckIcon className="w-3 h-3 text-white" strokeWidth={5} />}
          </div>
        )}
      </div>
    </div>
  );
}

/** Return rules of the item sheet: deadline, or why only an exchange is possible. */
function ReturnInfo({ article, t, formatDate }: { article: Article } & Pick<I18n, "t" | "formatDate">) {
  if (article.returnable) {
    return article.returnDeadline ? (
      <p className="text-[11px] text-green-700 font-medium">
        {t("article.returnUntil", { date: formatDate(article.returnDeadline) })}
      </p>
    ) : null;
  }
  return (
    <p className="text-[11px] text-orange-700 font-medium">
      {article.returnBlock === "expired" && article.returnDeadline
        ? t("article.returnExpired", { date: formatDate(article.returnDeadline) })
        : t("article.notReturnable")}
    </p>
  );
}
