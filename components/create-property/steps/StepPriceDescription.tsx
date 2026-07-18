// components/create-property/steps/StepPriceDescription.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StepPriceDescriptionProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepPriceDescription({ formData, updateFormData, nextStep, prevStep }: StepPriceDescriptionProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingEnhance, setAiLoadingEnhance] = useState(false);

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

  // ===== AI GENERATE DESCRIPTION =====
  const generateDescription = async () => {
    if (!formData.property_type || !formData.address) {
      toast.warning("Isi tipe properti dan alamat dulu.");
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
        toast.success("Deskripsi berhasil diperbaiki dengan AI!");
      } else {
        toast.error(result.error || "Gagal memperbaiki deskripsi");
      }
    } catch (error) {
      console.error(error);
      toast.error("Gagal terhubung ke AI service");
    } finally {
      setAiLoadingEnhance(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Harga & Deskripsi</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tentukan harga dan tulis deskripsi properti Anda
        </p>
      </div>

      {/* ===== BAGIAN HARGA ===== */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">💰 Harga</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="selling_price">
              Harga Jual {formData.listing_type === "jual" && <span className="text-rose-500">*</span>}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">Rp</span>
              <Input
                id="selling_price"
                type="text"
                placeholder="2.500.000.000"
                value={formData.selling_price ? formatPrice(formData.selling_price) : ""}
                onChange={(e) => handlePriceInput("selling_price", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rental_price">
              Harga Sewa / Bulan {formData.listing_type === "sewa" && <span className="text-rose-500">*</span>}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">Rp</span>
              <Input
                id="rental_price"
                type="text"
                placeholder="8.500.000"
                value={formData.rental_price ? formatPrice(formData.rental_price) : ""}
                onChange={(e) => handlePriceInput("rental_price", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_charge">Service Charge</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">Rp</span>
              <Input
                id="service_charge"
                type="text"
                placeholder="500.000"
                value={formData.service_charge ? formatPrice(formData.service_charge) : ""}
                onChange={(e) => handlePriceInput("service_charge", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance_fee">IPL / Maintenance Fee</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">Rp</span>
              <Input
                id="maintenance_fee"
                type="text"
                placeholder="300.000"
                value={formData.maintenance_fee ? formatPrice(formData.maintenance_fee) : ""}
                onChange={(e) => handlePriceInput("maintenance_fee", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {formData.listing_type === "sewa" && (
          <div className="space-y-2">
            <Label htmlFor="rental_period">Periode Sewa</Label>
            <Select
              value={formData.rental_period || ""}
              onValueChange={(val) => handleChange("rental_period", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih periode sewa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_hari">Per Hari</SelectItem>
                <SelectItem value="per_minggu">Per Minggu</SelectItem>
                <SelectItem value="per_bulan">Per Bulan</SelectItem>
                <SelectItem value="per_tahun">Per Tahun</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center space-x-3 pt-2">
          <Switch
            id="negotiable"
            checked={formData.negotiable || false}
            onCheckedChange={(val) => handleChange("negotiable", val)}
          />
          <Label htmlFor="negotiable" className="text-sm font-medium">Harga Bisa Nego</Label>
        </div>
      </div>

      {/* ===== BAGIAN DESKRIPSI ===== */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">📝 Deskripsi</h3>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={generateDescription} disabled={aiLoading} className="gap-1">
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={enhanceDescription} disabled={aiLoadingEnhance || !formData.description} className="gap-1">
              {aiLoadingEnhance ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Enhance
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Deskripsi Lengkap <span className="text-rose-500">*</span></Label>
          <Textarea
            id="description"
            placeholder="Tulis deskripsi detail tentang properti ini..."
            value={formData.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={6}
            className="text-base"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formData.description?.length || 0} karakter
            {formData.description?.length > 0 && formData.description.length < 50 && (
              <span className="text-amber-500 ml-2">⚠️ Minimal 50 karakter untuk skor maksimal</span>
            )}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="selling_point">💎 Selling Point</Label>
          <Textarea
            id="selling_point"
            placeholder="Contoh: Dekat mall, akses tol, view gunung"
            value={formData.selling_point || ""}
            onChange={(e) => handleChange("selling_point", e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>← Kembali</Button>
        <Button onClick={nextStep} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          Lanjut ke Kontak →
        </Button>
      </div>
    </div>
  );
}