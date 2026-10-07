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
  const disabled = !article.eligible;
  const details = [`${article.currency}${article.price}`, article.color, article.size].filter(Boolean).join(" | ");
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
      </div>
      <div className="flex items-center gap-3 pr-1">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight ${
            disabled ? "bg-gray-100 text-gray-500" : "bg-brand-light text-brand"
          }`}
        >
          {article.state}
        </span>
        <span className="text-[13px] text-gray-700 font-semibold whitespace-nowrap">Qty {article.quantity}</span>
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
