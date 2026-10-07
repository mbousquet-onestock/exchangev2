import type { ReactNode } from "react";

export function InfoBanner({ text, tone = "info" }: { text: ReactNode; tone?: "info" | "error" | "warning" }) {
  const tones = {
    info: "bg-[#f2f2f2] text-[#555]",
    error: "bg-red-50 text-red-700 border border-red-100",
    warning: "bg-orange-50 text-orange-800 border border-orange-100",
  };
  return (
    <div className={`rounded-lg py-2.5 px-4 mb-2 flex items-center gap-3 ${tones[tone]}`}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="text-[13px] font-medium break-words min-w-0">{text}</div>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{children}</label>;
}

export const inputClass =
  "w-full p-2 bg-[#f9fafb] border border-gray-200 rounded-md text-[13px] outline-none focus:bg-white focus:border-brand transition-all";

export const selectClass =
  "select-chevron w-full p-2 bg-white border border-gray-200 rounded-md text-[13px] outline-none focus:border-brand";

export function CheckIcon({ className = "w-3 h-3", strokeWidth = 4 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function ItemImage({ src, alt, className }: { src?: string; alt: string; className: string }) {
  if (!src) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 text-gray-300`}>
        <svg className="w-1/2 h-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>
    );
  }
  return <img src={src} alt={alt} className={`${className} object-cover`} />;
}
