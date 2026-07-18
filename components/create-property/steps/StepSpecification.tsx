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

interface StepSpecificationProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepSpecification({ formData, updateFormData, nextStep, prevStep }: StepSpecificationProps) {
  const handleChange = (field: string, value: any) => {
    updateFormData({ [field]: value });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Spesifikasi</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Masukkan detail spesifikasi properti Anda
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bedroom">🛏️ Kamar Tidur</Label>
          <Input
            id="bedroom"
            type="number"
            placeholder="3"
            value={formData.bedroom || ""}
            onChange={(e) => handleChange("bedroom", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bathroom">🛁 Kamar Mandi</Label>
          <Input
            id="bathroom"
            type="number"
            placeholder="2"
            value={formData.bathroom || ""}
            onChange={(e) => handleChange("bathroom", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="garage">🚗 Garasi</Label>
          <Input
            id="garage"
            type="number"
            placeholder="1"
            value={formData.garage || ""}
            onChange={(e) => handleChange("garage", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="carport">🏎️ Carport</Label>
          <Input
            id="carport"
            type="number"
            placeholder="1"
            value={formData.carport || ""}
            onChange={(e) => handleChange("carport", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="floor">🏗️ Jumlah Lantai</Label>
          <Input
            id="floor"
            type="number"
            placeholder="2"
            value={formData.floor || ""}
            onChange={(e) => handleChange("floor", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="electricity">⚡ Daya Listrik (VA)</Label>
          <Input
            id="electricity"
            type="number"
            placeholder="2200"
            value={formData.electricity || ""}
            onChange={(e) => handleChange("electricity", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="land_area">📐 Luas Tanah (m²)</Label>
          <Input
            id="land_area"
            type="number"
            placeholder="150"
            value={formData.land_area || ""}
            onChange={(e) => handleChange("land_area", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="building_area">🏠 Luas Bangunan (m²)</Label>
          <Input
            id="building_area"
            type="number"
            placeholder="120"
            value={formData.building_area || ""}
            onChange={(e) => handleChange("building_area", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="year_built">📅 Tahun Bangun</Label>
          <Input
            id="year_built"
            type="number"
            placeholder="2020"
            value={formData.year_built || ""}
            onChange={(e) => handleChange("year_built", e.target.value)}
          />
        </div>

        {/* Sertifikat – opsi baru */}
        <div className="space-y-2">
          <Label htmlFor="certificate">📜 Sertifikat</Label>
          <Select
            value={formData.certificate || ""}
            onValueChange={(val) => handleChange("certificate", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih sertifikat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SHM">SHM</SelectItem>
              <SelectItem value="HGB">HGB</SelectItem>
              <SelectItem value="Hak Pakai">Hak Pakai</SelectItem>
              <SelectItem value="Hak Sewa">Hak Sewa</SelectItem>
              <SelectItem value="HGU">HGU</SelectItem>
              <SelectItem value="Adat">Adat</SelectItem>
              <SelectItem value="Girik">Girik</SelectItem>
              <SelectItem value="PPJB">PPJB</SelectItem>
              <SelectItem value="Lainnya">Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Kondisi Properti – opsi baru */}
        <div className="space-y-2">
          <Label htmlFor="condition">🔧 Kondisi Properti</Label>
          <Select
            value={formData.condition || ""}
            onValueChange={(val) => handleChange("condition", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kondisi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bagus">Bagus</SelectItem>
              <SelectItem value="Butuh Minim Renovasi">Butuh Minim Renovasi</SelectItem>
              <SelectItem value="Butuh Renovasi Total">Butuh Renovasi Total</SelectItem>
              <SelectItem value="Terenovasi">Terenovasi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Kondisi Perabotan – opsi baru */}
        <div className="space-y-2">
          <Label htmlFor="furnishing">🛋️ Kondisi Perabotan</Label>
          <Select
            value={formData.furnishing || ""}
            onValueChange={(val) => handleChange("furnishing", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kondisi perabotan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Furnished">Furnished</SelectItem>
              <SelectItem value="Semi Furnished">Semi Furnished</SelectItem>
              <SelectItem value="Unfurnished">Unfurnished</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          ← Kembali
        </Button>
        <Button
          onClick={nextStep}
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Lanjut ke Harga →
        </Button>
      </div>
    </div>
  );
}