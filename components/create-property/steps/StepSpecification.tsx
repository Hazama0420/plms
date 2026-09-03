// components/create-property/steps/StepSpecification.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bed,
  Bath,
  Car,
  Warehouse,
  Layers,
  Zap,
  Maximize2,
  Home,
  Calendar,
  FileCheck,
  Wrench,
  Armchair,
  Compass,
  Droplets,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

interface StepSpecificationProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

// Data Pilihan
const certificateOptions = [
  { value: "SHM", label: "SHM (Sertifikat Hak Milik)" },
  { value: "HGB", label: "HGB (Hak Guna Bangunan)" },
  { value: "Hak Pakai", label: "Hak Pakai" },
  { value: "Hak Sewa", label: "Hak Sewa" },
  { value: "HGU", label: "HGU" },
  { value: "Adat", label: "Adat" },
  { value: "Girik", label: "Girik" },
  { value: "PPJB", label: "PPJB" },
  { value: "Lainnya", label: "Lainnya" },
];

const conditionOptions = [
  { value: "Bagus", label: "✨ Bagus / Siap Huni" },
  { value: "Butuh Minim Renovasi", label: "🛠️ Minim Renovasi" },
  { value: "Butuh Renovasi Total", label: "🏚️ Renovasi Total" },
  { value: "Terenovasi", label: "🏗️ Baru Terenovasi" },
];

const furnishingOptions = [
  { value: "Furnished", label: "🛋️ Full Furnished" },
  { value: "Semi Furnished", label: "🪑 Semi Furnished" },
  { value: "Unfurnished", label: "📦 Unfurnished (Kosong)" },
];

const facingOptions = [
  "Utara",
  "Selatan",
  "Timur",
  "Barat",
  "Timur Laut",
  "Tenggara",
  "Barat Daya",
  "Barat Laut",
];

const waterOptions = ["PAM / PDAM", "Sumur Bor / Jetpump", "PDAM & Sumur", "Lainnya"];

export function StepSpecification({
  formData,
  updateFormData,
  nextStep,
  prevStep,
}: StepSpecificationProps) {
  const handleChange = (field: string, value: any) => {
    updateFormData({ [field]: value });
  };

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-600" />
          Spesifikasi Properti
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Lengkapi detail fisik, ukuran, kelengkapan legalitas, dan kondisi properti Anda.
        </p>
      </div>

      {/* 1. KELOMPOK KAMAR & PARKER */}
      <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Bed className="w-4 h-4 text-emerald-600" />
          Kapasitas & Fasilitas Utama
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Kamar Tidur */}
          <div className="space-y-1.5">
            <Label htmlFor="bedroom" className="text-xs font-semibold flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-slate-500" /> Kamar Tidur
            </Label>
              <Input
                id="bedroom"
                type="number"
                placeholder="0"
                value={formData.bedroom ?? 0}
                onChange={(e) => handleChange("bedroom", e.target.value)}
                className="h-9 text-xs bg-background"
              />
          </div>

          {/* Kamar Mandi */}
          <div className="space-y-1.5">
            <Label htmlFor="bathroom" className="text-xs font-semibold flex items-center gap-1.5">
              <Bath className="w-3.5 h-3.5 text-slate-500" /> Kamar Mandi
            </Label>
              <Input
                id="bathroom"
                type="number"
                placeholder="0"
                value={formData.bathroom ?? 0}
                onChange={(e) => handleChange("bathroom", e.target.value)}
                className="h-9 text-xs bg-background"
              />
          </div>

          {/* Garasi */}
          <div className="space-y-1.5">
            <Label htmlFor="garage" className="text-xs font-semibold flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-slate-500" /> Garasi
            </Label>
            <Input
              id="garage"
              type="number"
              placeholder="1"
              value={formData.garage || ""}
              onChange={(e) => handleChange("garage", e.target.value)}
              className="h-9 text-xs bg-background"
            />
          </div>

          {/* Carport */}
          <div className="space-y-1.5">
            <Label htmlFor="carport" className="text-xs font-semibold flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-slate-500" /> Carport
            </Label>
            <Input
              id="carport"
              type="number"
              placeholder="1"
              value={formData.carport || ""}
              onChange={(e) => handleChange("carport", e.target.value)}
              className="h-9 text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* 2. KELOMPOK LUAS & BANGUNAN */}
      <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-emerald-600" />
          Dimensi & Bangunan
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Luas Tanah */}
          <div className="space-y-1.5">
            <Label htmlFor="land_area" className="text-xs font-semibold flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" /> Luas Tanah (m²)
            </Label>
              <Input
                id="land_area"
                type="number"
                placeholder="0"
                value={formData.land_area ?? 0}
                onChange={(e) => handleChange("land_area", e.target.value)}
                className="h-9 text-xs bg-background"
              />
          </div>

          {/* Luas Bangunan */}
          <div className="space-y-1.5">
            <Label htmlFor="building_area" className="text-xs font-semibold flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-slate-500" /> Luas Bangunan (m²)
            </Label>
              <Input
                id="building_area"
                type="number"
                placeholder="0"
                value={formData.building_area ?? 0}
                onChange={(e) => handleChange("building_area", e.target.value)}
                className="h-9 text-xs bg-background"
              />
          </div>

          {/* Jumlah Lantai */}
          <div className="space-y-1.5">
            <Label htmlFor="floor" className="text-xs font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" /> Jumlah Lantai
            </Label>
            <Input
              id="floor"
              type="number"
              placeholder="2"
              value={formData.floor || ""}
              onChange={(e) => handleChange("floor", e.target.value)}
              className="h-9 text-xs bg-background"
            />
          </div>

          {/* Tahun Bangun */}
          <div className="space-y-1.5">
            <Label htmlFor="year_built" className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Tahun Bangun
            </Label>
            <Input
              id="year_built"
              type="number"
              placeholder="2022"
              value={formData.year_built || ""}
              onChange={(e) => handleChange("year_built", e.target.value)}
              className="h-9 text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* 3. KELOMPOK LEGALITAS & UTILITAS */}
      <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-600" />
          Legalitas & Utilitas
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Sertifikat */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-slate-500" /> Jenis Sertifikat
            </Label>
            <Select
              value={formData.certificate || ""}
              onValueChange={(val) => handleChange("certificate", val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Pilih Sertifikat" />
              </SelectTrigger>
              <SelectContent>
                {certificateOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Daya Listrik */}
          <div className="space-y-1.5">
            <Label htmlFor="electricity" className="text-xs font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-500" /> Daya Listrik (VA)
            </Label>
            <Input
              id="electricity"
              type="number"
              placeholder="2200"
              value={formData.electricity || ""}
              onChange={(e) => handleChange("electricity", e.target.value)}
              className="h-9 text-xs bg-background"
            />
          </div>

          {/* Sumber Air */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-slate-500" /> Sumber Air
            </Label>
            <Select
              value={formData.water_source || ""}
              onValueChange={(val) => handleChange("water_source", val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Pilih Sumber Air" />
              </SelectTrigger>
              <SelectContent>
                {waterOptions.map((w) => (
                  <SelectItem key={w} value={w} className="text-xs">
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Arah Hadap */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-slate-500" /> Hadap / Arah
            </Label>
            <Select
              value={formData.facing || ""}
              onValueChange={(val) => handleChange("facing", val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Pilih Arah Hadap" />
              </SelectTrigger>
              <SelectContent>
                {facingOptions.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 4. KELOMPOK KONDISI & PERABOTAN */}
      <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-emerald-600" />
          Kondisi Bangunan & Interior
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kondisi Properti Selector Cards */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-500" /> Kondisi Bangunan
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {conditionOptions.map((cond) => (
                <button
                  key={cond.value}
                  type="button"
                  onClick={() => handleChange("condition", cond.value)}
                  className={cn(
                    "p-2.5 rounded-xl border text-[11px] font-semibold text-left transition-all",
                    formData.condition === cond.value
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-600"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-background hover:bg-slate-100/50"
                  )}
                >
                  {cond.label}
                </button>
              ))}
            </div>
          </div>

          {/* Perabotan Selector Cards */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Armchair className="w-3.5 h-3.5 text-slate-500" /> Kondisi Perabotan (Furnishing)
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {furnishingOptions.map((furn) => (
                <button
                  key={furn.value}
                  type="button"
                  onClick={() => handleChange("furnishing", furn.value)}
                  className={cn(
                    "p-2.5 rounded-xl border text-[11px] font-semibold text-left transition-all flex items-center justify-between",
                    formData.furnishing === furn.value
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-600"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-background hover:bg-slate-100/50"
                  )}
                >
                  <span>{furn.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}