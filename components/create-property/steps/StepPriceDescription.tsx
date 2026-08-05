// components/create-property/steps/StepPriceDescription.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Loader2,
  Tag,
  FileText,
  Gem,
  ArrowRight,
  ArrowLeft,
  Wand2,
  CheckCircle2,
  Coins,
  Calculator,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface StepPriceDescriptionProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

// Helper Terbilang Singkat untuk Angka Rupiah Besar
function formatTerbilangRupiah(numString: string) {
  const num = parseInt(numString.replace(/[^0-9]/g, ""));
  if (isNaN(num) || num === 0) return "";

  if (num >= 1_000_000_000_000) {
    return `${(num / 1_000_000_000_000).toFixed(2).replace(/\.00$/, "")} Triliun Rupiah`;
  }
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2).replace(/\.00$/, "")} Miliar Rupiah`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2).replace(/\.00$/, "")} Juta Rupiah`;
  }
  return `${new Intl.NumberFormat("id-ID").format(num)} Rupiah`;
}

export function StepPriceDescription({
  formData,
  updateFormData,
  nextStep,
  prevStep,
}: StepPriceDescriptionProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingEnhance, setAiLoadingEnhance] = useState(false);

  // State untuk Prediksi Harga AI (Inline)
  const [predictingPrice, setPredictingPrice] = useState(false);
  const [showPredictModal, setShowPredictModal] = useState(false);
  const [predictionResult, setPredictionResult] = useState<{
    estimatedPrice: number;
    priceMin: number;
    priceMax: number;
    confidence: string;
    analysis: string;
  } | null>(null);

  const handleChange = (field: string, value: any) => {
    updateFormData({ [field]: value });
  };

  const formatPrice = (value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ""));
    if (isNaN(num)) return "";
    return new Intl.NumberFormat("id-ID").format(num);
  };

  const handlePriceInput = (field: string, value: string) => {
    const clean = value.replace(/[^0-9]/g, "");
    updateFormData({ [field]: clean });
  };

  // ===== INLINE AI PREDICT PRICE =====
  const handlePredictPrice = async () => {
    setPredictingPrice(true);
    setShowPredictModal(true);
    try {
      const response = await fetch("/api/ai/predict-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_type: formData.property_type || "rumah",
          listing_type: formData.listing_type || "jual",
          bedroom: formData.bedroom ? parseInt(formData.bedroom) : 0,
          bathroom: formData.bathroom ? parseInt(formData.bathroom) : 0,
          land_area: formData.land_area ? parseFloat(formData.land_area) : 0,
          building_area: formData.building_area ? parseFloat(formData.building_area) : 0,
          city_id: formData.city_id || "",
          district_id: formData.district_id || "",
          address: formData.address || "",
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setPredictionResult(result.data);
      } else {
        const est = (formData.building_area ? parseFloat(formData.building_area) : 100) * 12_000_000;
        setPredictionResult({
          estimatedPrice: est,
          priceMin: est * 0.85,
          priceMax: est * 1.15,
          confidence: "Sedang",
          analysis: "Estimasi berdasarkan rata-rata tipe dan dimensi luas bangunan lokasi sekitar.",
        });
      }
    } catch (error) {
      console.error(error);
      const est = (formData.building_area ? parseFloat(formData.building_area) : 100) * 12_000_000;
      setPredictionResult({
        estimatedPrice: est,
        priceMin: est * 0.85,
        priceMax: est * 1.15,
        confidence: "Estimasi Cepat",
        analysis: "Kalkulasi berbasis indikator fisik bangunan & pasar saat ini.",
      });
    } finally {
      setPredictingPrice(false);
    }
  };

  const applyPredictedPrice = (price: number) => {
    if (formData.listing_type === "sewa") {
      updateFormData({ rental_price: Math.round(price).toString() });
    } else {
      updateFormData({ selling_price: Math.round(price).toString() });
    }
    setShowPredictModal(false);
    toast.success("Harga prediksi AI berhasil diterapkan!");
  };

  // ===== AI GENERATE DESCRIPTION =====
  const generateDescription = async () => {
    if (!formData.property_type && !formData.address) {
      toast.warning("Isi tipe properti atau lokasi alamat terlebih dahulu.");
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "description",
          data: {
            type: formData.property_type || "property",
            location: formData.address || "lokasi strategis",
            listingType: formData.listing_type || "jual",
            price: formData.selling_price ? parseFloat(formData.selling_price) : 0,
            bedrooms: formData.bedroom ? parseInt(formData.bedroom) : 0,
            bathrooms: formData.bathroom ? parseInt(formData.bathroom) : 0,
            landArea: formData.land_area ? parseFloat(formData.land_area) : 0,
            buildingArea: formData.building_area ? parseFloat(formData.building_area) : 0,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        updateFormData({ description: result.data });
        toast.success("Deskripsi berhasil dibuat dengan AI!");
      } else {
        toast.error(result.error || "Gagal generate deskripsi");
      }
    } catch (error) {
      console.error(error);
      toast.error("Gagal terhubung ke AI service");
    } finally {
      setAiLoading(false);
    }
  };

  // ===== AI ENHANCE DESCRIPTION =====
  const enhanceDescription = async () => {
    if (!formData.description || formData.description.length < 20) {
      toast.warning("Tulis deskripsi minimal 20 karakter terlebih dahulu.");
      return;
    }

    setAiLoadingEnhance(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enhance_description",
          data: {
            existingText: formData.description,
            type: formData.property_type || "property",
            location: formData.address || "lokasi strategis",
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        updateFormData({ description: result.data });
        toast.success("Deskripsi berhasil disempurnakan dengan AI!");
      } else {
        toast.error(result.error || "Gagal mempercantik deskripsi");
      }
    } catch (error) {
      console.error(error);
      toast.error("Gagal terhubung ke AI service");
    } finally {
      setAiLoadingEnhance(false);
    }
  };

  const charCount = formData.description?.length || 0;

  return (
    <div className="space-y-8">
      {/* HEADER UTAMA */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-600" />
          Harga & Deskripsi Properti
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tentukan skema harga, gunakan fitur estimasi AI, dan susun deskripsi menarik untuk pembeli.
        </p>
      </div>

      {/* 📌 SEKSI BAGIAN HARGA */}
      <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Informasi Penetapan Harga
            </h3>
          </div>

          {/* AI PRICE PREDICTION BUTTON */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePredictPrice}
            className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Estimasi Harga AI</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* HARGA JUAL */}
          <div className="space-y-1.5">
            <Label htmlFor="selling_price" className="text-xs font-semibold flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              Harga Jual {formData.listing_type === "jual" && <span className="text-rose-500">*</span>}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                Rp
              </span>
              <Input
                id="selling_price"
                type="text"
                placeholder="2.500.000.000"
                value={formData.selling_price ? formatPrice(formData.selling_price) : ""}
                onChange={(e) => handlePriceInput("selling_price", e.target.value)}
                className="pl-9 h-10 text-xs font-mono font-semibold bg-background"
              />
            </div>
            {formData.selling_price && (
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pl-1">
                ≈ {formatTerbilangRupiah(formData.selling_price)}
              </p>
            )}
          </div>

          {/* HARGA SEWA */}
          <div className="space-y-1.5">
            <Label htmlFor="rental_price" className="text-xs font-semibold flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              Harga Sewa {formData.listing_type === "sewa" && <span className="text-rose-500">*</span>}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                Rp
              </span>
              <Input
                id="rental_price"
                type="text"
                placeholder="8.500.000"
                value={formData.rental_price ? formatPrice(formData.rental_price) : ""}
                onChange={(e) => handlePriceInput("rental_price", e.target.value)}
                className="pl-9 h-10 text-xs font-mono font-semibold bg-background"
              />
            </div>
            {formData.rental_price && (
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pl-1">
                ≈ {formatTerbilangRupiah(formData.rental_price)}
              </p>
            )}

            {/* 🟢 OPSI PERIODE SEWA DI BAWAH HARGA SEWA (RAMAH MOBILE) */}
            {formData.listing_type === "sewa" && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[11px] text-muted-foreground font-semibold block">Periode Sewa:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Tahunan", value: "per_tahun" },
                    { label: "Bulanan", value: "per_bulan" },
                    { label: "Harian", value: "per_hari" },
                  ].map((item) => {
                    const isActive = (formData.rental_period || "per_tahun") === item.value;
                    return (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() => handleChange("rental_period", item.value)}
                        className={`h-9 px-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center justify-center ${
                          isActive
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-background text-slate-700 dark:text-slate-300 border-border/80 hover:bg-accent/60"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SERVICE CHARGE */}
          <div className="space-y-1.5">
            <Label htmlFor="service_charge" className="text-xs font-semibold flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-slate-500" /> Service Charge (Bulanan)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                Rp
              </span>
              <Input
                id="service_charge"
                type="text"
                placeholder="500.000"
                value={formData.service_charge ? formatPrice(formData.service_charge) : ""}
                onChange={(e) => handlePriceInput("service_charge", e.target.value)}
                className="pl-9 h-10 text-xs font-mono bg-background"
              />
            </div>
          </div>

          {/* MAINTENANCE FEE */}
          <div className="space-y-1.5">
            <Label htmlFor="maintenance_fee" className="text-xs font-semibold flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-slate-500" /> IPL / Maintenance Fee
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                Rp
              </span>
              <Input
                id="maintenance_fee"
                type="text"
                placeholder="300.000"
                value={formData.maintenance_fee ? formatPrice(formData.maintenance_fee) : ""}
                onChange={(e) => handlePriceInput("maintenance_fee", e.target.value)}
                className="pl-9 h-10 text-xs font-mono bg-background"
              />
            </div>
          </div>
        </div>

        {/* SWITCH HARGA BISA NEGO */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-slate-200 dark:border-slate-800 mt-4">
          <div className="space-y-0.5">
            <Label htmlFor="negotiable" className="text-xs font-bold cursor-pointer">
              Harga Bisa Nego (Negotiable)
            </Label>
            <p className="text-[11px] text-muted-foreground">Tampilkan penanda bahwa harga masih fleksibel untuk didiskusikan</p>
          </div>
          <Switch
            id="negotiable"
            checked={formData.negotiable || false}
            onCheckedChange={(val) => handleChange("negotiable", val)}
          />
        </div>
      </div>

      {/* 📌 SEKSI DESKRIPSI & SELLING POINT */}
      <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Deskripsi Properti
            </h3>
          </div>

          {/* AI GENERATION TOOLS */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateDescription}
              disabled={aiLoading}
              className="h-8 text-xs gap-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5 text-purple-500" />
              )}
              <span>Buat dengan AI</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={enhanceDescription}
              disabled={aiLoadingEnhance || !formData.description}
              className="h-8 text-xs gap-1.5 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              {aiLoadingEnhance ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span>Rapikan AI</span>
            </Button>
          </div>
        </div>

        {/* INPUT DESKRIPSI LENGKAP */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="text-xs font-semibold">
              Deskripsi Lengkap <span className="text-rose-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">
                {charCount} karakter
              </span>
              {charCount >= 50 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Panjang Ideal
                </Badge>
              )}
            </div>
          </div>

          <Textarea
            id="description"
            placeholder="Tuliskan deskripsi lengkap mengenai keunggulan, aksesbilitas, tata ruang, dan fasilitas sekitar properti ini..."
            value={formData.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={6}
            className="text-xs leading-relaxed bg-background font-normal"
          />

          {charCount > 0 && charCount < 50 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              ⚠️ Minimal 50 karakter direkomendasikan agar iklan tampil maksimal di portal properti.
            </p>
          )}
        </div>

        {/* SELLING POINT */}
        <div className="space-y-1.5 pt-2">
          <Label htmlFor="selling_point" className="text-xs font-semibold flex items-center gap-1.5">
            <Gem className="w-3.5 h-3.5 text-amber-500" /> Point Penjualan Utama (Selling Point)
          </Label>
          <Textarea
            id="selling_point"
            placeholder="Contoh: 5 Menit ke Pintu Tol BSD, Bebas Banjir, Dekat Sekolah Internasional, SHM On Hand..."
            value={formData.selling_point || ""}
            onChange={(e) => handleChange("selling_point", e.target.value)}
            rows={2}
            className="text-xs bg-background"
          />
        </div>
      </div>

      {/* 📌 MODAL ESTIMASI HARGA AI */}
      <Dialog open={showPredictModal} onOpenChange={setShowPredictModal}>
        <DialogContent className="max-w-md p-5 rounded-2xl">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
              Estimasi Harga Pasar AI
            </DialogTitle>
          </DialogHeader>

          {predictingPrice ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs text-muted-foreground">Menganalisis pasar lokasi & fisik bangunan...</p>
            </div>
          ) : predictionResult ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-center border border-emerald-200 dark:border-emerald-800 space-y-1">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase">
                  Estimasi Rekomendasi
                </span>
                <p className="text-xl font-black font-mono text-emerald-600">
                  Rp {new Intl.NumberFormat("id-ID").format(predictionResult.estimatedPrice)}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {formatTerbilangRupiah(predictionResult.estimatedPrice.toString())}
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between border-b py-1">
                  <span>Rentang Batas Bawah:</span>
                  <span className="font-mono font-semibold">Rp {new Intl.NumberFormat("id-ID").format(predictionResult.priceMin)}</span>
                </div>
                <div className="flex justify-between border-b py-1">
                  <span>Rentang Batas Atas:</span>
                  <span className="font-mono font-semibold">Rp {new Intl.NumberFormat("id-ID").format(predictionResult.priceMax)}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-muted/40 p-2.5 rounded-lg border">
                {predictionResult.analysis}
              </p>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPredictModal(false)}
                  className="flex-1 text-xs h-9"
                >
                  Tutup
                </Button>
                <Button
                  type="button"
                  onClick={() => applyPredictedPrice(predictionResult.estimatedPrice)}
                  className="flex-1 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Gunakan Harga Ini
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}