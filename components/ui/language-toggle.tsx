"use client";

import { useLocale } from "@/components/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const isEn = locale === "en";

  return (
    <button
      type="button"
      className="language-toggle relative flex items-center justify-between p-[3px] w-[70px] h-[32px] rounded-[18px] bg-[#f4f1eb] border border-[#081D60]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A07F31] transition-colors"
      onClick={() => setLocale(isEn ? "ar" : "en")}
      aria-label={isEn ? "Switch to Arabic" : "Switch to English"}
      dir="ltr"
    >
      {/* Moving Thumb */}
      <span
        className={cn(
          "absolute top-[3px] bottom-[3px] w-[30px] rounded-[15px] bg-[#081D60] transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
          isEn ? "translate-x-0" : "translate-x-[34px]"
        )}
      />

      {/* EN Label */}
      <span
        className={cn(
          "relative z-10 flex items-center justify-center w-[30px] text-[11px] font-semibold transition-colors duration-500",
          isEn ? "text-white" : "text-[#081D60]/60 hover:text-[#A07F31]"
        )}
      >
        EN
      </span>

      {/* AR Label */}
      <span
        className={cn(
          "relative z-10 flex items-center justify-center w-[30px] text-[13px] font-bold transition-colors duration-500 leading-none",
          !isEn ? "text-white" : "text-[#081D60]/60 hover:text-[#A07F31]"
        )}
      >
        ع
      </span>
    </button>
  );
}
