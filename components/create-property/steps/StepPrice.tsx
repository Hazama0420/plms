// components/create-property/steps/StepPrice.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StepPriceProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepPrice({ formData, updateFormData, nextStep, prevStep }: StepPriceProps) {
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Harga</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tentukan harga dan biaya terkait
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <Label htmlFor="negotiable" className="text-sm font-medium">
          Harga Bisa Nego
        </Label>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          ← Kembali
        </Button>
        <Button
          onClick={nextStep}
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Lanjut ke Lokasi →
        </Button>
      </div>
    </div>
  );
}