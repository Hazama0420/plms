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
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type ThemeChoice = "light" | "dark" | "system";
export type CatalogViewMode = "grid" | "table";

interface AppearanceTabProps {
  // Mode Tema
  theme: string | undefined;
  handleThemeSelect: (selectedTheme: ThemeChoice) => void;

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
  compactView,
  handleCompactToggle,
  defaultCatalogView = "grid",
  handleDefaultCatalogViewChange,
  fontSize = "normal",
  handleFontSizeChange,
}: AppearanceTabProps) {
  return (
    <div className="space-y-6">
      {/* ☀️/🌙 SAKELAR TEMA TERANG, GELAP & OTOMATIS */}
      <Card className="border shadow-xs">
        <CardHeader className="p-5 border-b bg-muted/20">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Mode Tema Tampilan (Light & Dark Mode)
          </CardTitle>
          <CardDescription className="text-xs">
            Ubah skema warna dasar aplikasi antara mode terang, mode gelap, atau ikuti pengaturan perangkat Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-card gap-4">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground">Mode Tampilan Aplikasi</Label>
              <p className="text-[11px] text-muted-foreground">
                Tersinkronisasi otomatis dengan tombol tema di Header Layout Global
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
                <span>Terang</span>
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
                <span>Gelap</span>
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
                <span>Otomatis</span>
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
            Preferensi Layout & Kepadatan Layar
          </CardTitle>
          <CardDescription className="text-xs">
            Atur kerapatan antarmuka dan tampilan standar katalog properti sesuai kenyamanan kerja Anda.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* COMPACT MODE TOGGLE */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground block">
                Tampilan Padat (Compact Mode)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Memangkas jarak padding & margin tabel untuk memuat lebih banyak data properti di layar
              </p>
            </div>
            <Switch checked={compactView} onCheckedChange={handleCompactToggle} />
          </div>

          <Separator />

          {/* DEFAULT KATALOG PROPERTI */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-card gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground block">
                Tampilan Default Katalog Properti
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Pilih format otomatis saat pertama kali membuka halaman direktori properti
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
                <span>Kartu (Grid)</span>
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
                <span>Tabel Rinci</span>
              </button>
            </div>
          </div>

          <Separator />

          {/* UKURAN TEKS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-card gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-muted-foreground" /> Skala Ukuran Teks Antarmuka
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Sesuaikan keterbacaan huruf judul dan teks informasi pada menu dasbor
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
                  {size === "compact" ? "Kecil" : size === "normal" ? "Normal" : "Besar"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-[11px] text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Semua preferensi tema dan tampilan tersimpan secara otomatis ke akun Anda dan tersinkron saat login di perangkat lain.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}