"use client";

import { useTranslation } from "@/hooks/use-translation";

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="flex items-center space-x-2 text-[11px] sm:text-xs font-bold rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm p-1 shadow-sm">
      <button
        onClick={() => setLanguage("id")}
        className={`px-2 py-1 rounded-md transition-colors ${
          language === "id"
            ? "bg-emerald-600 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        ID
      </button>
      <span className="text-border/50">|</span>
      <button
        onClick={() => setLanguage("en")}
        className={`px-2 py-1 rounded-md transition-colors ${
          language === "en"
            ? "bg-emerald-600 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}
