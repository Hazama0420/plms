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

import { useTranslation } from "@/hooks/use-translation";

interface StepSpecificationProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepSpecification({
  formData,
  updateFormData,
  nextStep,
  prevStep,
}: StepSpecificationProps) {
  const { t } = useTranslation();

  const certificateOptions = [
    { value: "SHM", label: t("createProperty.specificationStep.certificates.shm") },
    { value: "HGB", label: t("createProperty.specificationStep.certificates.hgb") },
    { value: "Hak Pakai", label: t("createProperty.specificationStep.certificates.hak_pakai") },
    { value: "Hak Sewa", label: t("createProperty.specificationStep.certificates.hak_sewa") },
    { value: "HGU", label: t("createProperty.specificationStep.certificates.hgu") },
    { value: "Adat", label: t("createProperty.specificationStep.certificates.adat") },
    { value: "Girik", label: t("createProperty.specificationStep.certificates.girik") },
    { value: "PPJB", label: t("createProperty.specificationStep.certificates.ppjb") },
    { value: "Lainnya", label: t("createProperty.specificationStep.certificates.lainnya") },
  ];

  const conditionOptions = [
    { value: "Bagus", label: t("createProperty.specificationStep.conditions.bagus") },
    { value: "Butuh Minim Renovasi", label: t("createProperty.specificationStep.conditions.minim_renovasi") },
    { value: "Butuh Renovasi Total", label: t("createProperty.specificationStep.conditions.renovasi_total") },
    { value: "Terenovasi", label: t("createProperty.specificationStep.conditions.terenovasi") },
  ];

  const furnishingOptions = [
    { value: "Furnished", label: t("createProperty.specificationStep.furnishings.furnished") },
    { value: "Semi Furnished", label: t("createProperty.specificationStep.furnishings.semi_furnished") },
    { value: "Unfurnished", label: t("createProperty.specificationStep.furnishings.unfurnished") },
  ];

  const facingOptions = [
    { value: "Utara", label: t("createProperty.specificationStep.directions.utara") },
    { value: "Selatan", label: t("createProperty.specificationStep.directions.selatan") },
    { value: "Timur", label: t("createProperty.specificationStep.directions.timur") },
    { value: "Barat", label: t("createProperty.specificationStep.directions.barat") },
    { value: "Timur Laut", label: t("createProperty.specificationStep.directions.timur_laut") },
    { value: "Tenggara", label: t("createProperty.specificationStep.directions.tenggara") },
    { value: "Barat Daya", label: t("createProperty.specificationStep.directions.barat_daya") },
    { value: "Barat Laut", label: t("createProperty.specificationStep.directions.barat_laut") },
  ];

  const waterOptions = [
    { value: "PAM / PDAM", label: t("createProperty.specificationStep.waterOptions.pam") },
    { value: "Sumur Bor / Jetpump", label: t("createProperty.specificationStep.waterOptions.sumur") },
    { value: "PDAM & Sumur", label: t("createProperty.specificationStep.waterOptions.pam_sumur") },
    { value: "Lainnya", label: t("createProperty.specificationStep.waterOptions.lainnya") },
  ];

  const handleChange = (field: string, value: any) => {
    updateFormData({ [field]: value });
  };

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-600" />
          {t("createProperty.specificationStep.title")}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("createProperty.specificationStep.subtitle")}
        </p>
      </div>

      {/* 1. KELOMPOK KAMAR & PARKER */}
      <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Bed className="w-4 h-4 text-emerald-600" />
          {t("createProperty.specificationStep.capacityTitle")}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Kamar Tidur */}
          <div className="space-y-1.5">
            <Label htmlFor="bedroom" className="text-xs font-semibold flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.bedroom")}
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
              <Bath className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.bathroom")}
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
              <Warehouse className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.garage")}
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
              <Car className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.carport")}
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
          {t("createProperty.specificationStep.dimensionTitle")}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Luas Tanah */}
          <div className="space-y-1.5">
            <Label htmlFor="land_area" className="text-xs font-semibold flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.landArea")}
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
              <Home className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.buildingArea")}
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
              <Layers className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.floors")}
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
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.yearBuilt")}
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
          {t("createProperty.specificationStep.legalityTitle")}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Sertifikat */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.certificate")}
            </Label>
            <Select
              value={formData.certificate || ""}
              onValueChange={(val) => handleChange("certificate", val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder={t("createProperty.specificationStep.selectCertificate")} />
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
              <Zap className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.electricity")}
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
              <Droplets className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.waterSource")}
            </Label>
            <Select
              value={formData.water_source || ""}
              onValueChange={(val) => handleChange("water_source", val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder={t("createProperty.specificationStep.selectWater")} />
              </SelectTrigger>
              <SelectContent>
                {waterOptions.map((w) => (
                  <SelectItem key={w.value} value={w.value} className="text-xs">
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Arah Hadap */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.facing")}
            </Label>
            <Select
              value={formData.facing || ""}
              onValueChange={(val) => handleChange("facing", val)}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder={t("createProperty.specificationStep.selectFacing")} />
              </SelectTrigger>
              <SelectContent>
                {facingOptions.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">
                    {f.label}
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
          {t("createProperty.specificationStep.conditionTitle")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kondisi Properti Selector Cards */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.buildingCondition")}
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
              <Armchair className="w-3.5 h-3.5 text-slate-500" /> {t("createProperty.specificationStep.furnishing")}
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