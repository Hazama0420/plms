"use client";

import {
  Sliders,
  LayoutGrid,
  List,
  Type,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

export type ThemeChoice = "light" | "dark" | "system";
export type CatalogViewMode = "grid" | "table";

interface AppearanceTabProps {
  // Mode Tema
  theme: string | undefined;
  handleThemeSelect: (selectedTheme: ThemeChoice) => void;

  // Language Setting (Optional override; uses useTranslation internally)
  language?: "id" | "en";
  handleLanguageSelect?: (lang: "id" | "en") => void;

  // Compact Mode
  compactView: boolean;
  handleCompactToggle: (isCompact: boolean) => void;

  // Default Layout Katalog Properti
  defaultCatalogView?: CatalogViewMode;
  handleDefaultCatalogViewChange?: (mode: CatalogViewMode) => void;

  // Preferensi Ukuran Teks
  fontSize?: "normal" | "compact" | "large";
  handleFontSizeChange?: (size: "normal" | "compact" | "large") => void;
}

export function AppearanceTab({
  theme,
  handleThemeSelect,
  language: propLanguage,
  handleLanguageSelect: propHandleLanguageSelect,
  compactView,
  handleCompactToggle,
  defaultCatalogView = "grid",
  handleDefaultCatalogViewChange,
  fontSize = "normal",
  handleFontSizeChange,
}: AppearanceTabProps) {
  const { language: activeLanguage, setLanguage, t } = useTranslation();

  const currentLang = propLanguage || activeLanguage;
  const onSelectLang = propHandleLanguageSelect || ((lang: "id" | "en") => setLanguage(lang));

  return (
    <div className="space-y-6">
      {/* 🌐 PENGATURAN BAHASA APLIKASI (LANGUAGE SETTINGS) */}
      <Card className="border shadow-xs">
        <CardHeader className="p-5 border-b bg-muted/20">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t("settings.language")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("settings.languageDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-card gap-4">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground">{t("settings.language")}</Label>
              <p className="text-[11px] text-muted-foreground">
                {t("settings.languageSyncDesc")}
              </p>
            </div>

            <div className="inline-flex p-1 bg-muted rounded-xl border gap-1 self-stretch sm:self-auto justify-stretch">
              <button
                type="button"
                onClick={() => onSelectLang("id")}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  currentLang === "id"
                    ? "bg-background text-foreground shadow-xs font-bold ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{t("settings.languageOptions.id")}</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectLang("en")}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  currentLang === "en"
                    ? "bg-background text-foreground shadow-xs font-bold ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{t("settings.languageOptions.en")}</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ☀️/🌙 SAKELAR TEMA TERANG, GELAP & OTOMATIS */}
      <Card className="border shadow-xs">
        <CardHeader className="p-5 border-b bg-muted/20">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t("settings.appearance.themeTitle")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("settings.appearance.themeDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-card gap-4">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground">{t("settings.appearance.themeLabel")}</Label>
              <p className="text-[11px] text-muted-foreground">
                {t("settings.appearance.themeSyncDesc")}
              </p>
            </div>

            <div className="inline-flex p-1 bg-muted rounded-xl border gap-1 self-stretch sm:self-auto justify-stretch">
              <button
                type="button"
                onClick={() => handleThemeSelect("light")}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  theme === "light"
                    ? "bg-background text-foreground shadow-xs font-bold ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>{t("settings.appearance.light")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeSelect("dark")}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  theme === "dark"
                    ? "bg-background text-foreground shadow-xs font-bold ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>{t("settings.appearance.dark")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeSelect("system")}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  theme === "system"
                    ? "bg-background text-foreground shadow-xs font-bold ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Monitor className="w-4 h-4 text-slate-500" />
                <span>{t("settings.appearance.system")}</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📐 LAYOUT & KEPADATAN APLIKASI */}
      <Card className="border shadow-xs">
        <CardHeader className="p-5 border-b bg-muted/20">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t("settings.appearance.layoutTitle")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("settings.appearance.layoutDesc")}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* COMPACT MODE TOGGLE */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground block">
                {t("settings.appearance.compactLabel")}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {t("settings.appearance.compactDesc")}
              </p>
            </div>
            <Switch checked={compactView} onCheckedChange={handleCompactToggle} />
          </div>

          <Separator />

          {/* DEFAULT KATALOG PROPERTI */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-card gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground block">
                {t("settings.appearance.catalogLabel")}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {t("settings.appearance.catalogDesc")}
              </p>
            </div>

            <div className="inline-flex p-1 bg-muted rounded-xl border gap-1 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleDefaultCatalogViewChange?.("grid")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  defaultCatalogView === "grid"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t("settings.appearance.catalogGrid")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDefaultCatalogViewChange?.("table")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  defaultCatalogView === "table"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-3.5 h-3.5 text-blue-600" />
                <span>{t("settings.appearance.catalogTable")}</span>
              </button>
            </div>
          </div>

          <Separator />

          {/* UKURAN TEKS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-card gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-muted-foreground" /> {t("settings.appearance.fontScaleLabel")}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {t("settings.appearance.fontScaleDesc")}
              </p>
            </div>

            <div className="inline-flex p-1 bg-muted rounded-xl border gap-1 shrink-0 self-start sm:self-auto">
              {(["compact", "normal", "large"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleFontSizeChange?.(size)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize cursor-pointer",
                    fontSize === size
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {size === "compact"
                    ? t("settings.appearance.fontSmall")
                    : size === "normal"
                    ? t("settings.appearance.fontNormal")
                    : t("settings.appearance.fontLarge")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-[11px] text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {t("settings.appearance.savedNotice")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}