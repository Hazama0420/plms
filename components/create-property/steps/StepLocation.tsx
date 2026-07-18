// components/create-property/steps/StepLocation.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/create-property/AddressAutocomplete";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Lock, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationResult {
  id: string;
  name: string;
  type: "province" | "city" | "district" | "village";
  fullAddress: string;
  parentName: string;
  province_id: string | null;
  city_id: string | null;
  district_id: string | null;
  village_id: string | null;
}

interface StepLocationProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepLocation({ formData, updateFormData, nextStep, prevStep }: StepLocationProps) {
  const [manualEdit, setManualEdit] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);

  const handleLocationSelect = (location: LocationResult) => {
    setSelectedLocation(location);
    setManualEdit(false);

    // Auto-fill semua field lokasi
    updateFormData({
      province_id: location.province_id || "",
      city_id: location.city_id || "",
      district_id: location.district_id || "",
      village_id: location.village_id || "",
      // Isi nama lokasi di alamat
      address: location.fullAddress || location.name,
    });

    // Jika location adalah province, kosongkan city, district, village
    if (location.type === "province") {
      updateFormData({
        city_id: "",
        district_id: "",
        village_id: "",
      });
    }
    // Jika location adalah city, kosongkan district, village
    if (location.type === "city") {
      updateFormData({
        district_id: "",
        village_id: "",
      });
    }
    // Jika location adalah district, kosongkan village
    if (location.type === "district") {
      updateFormData({
        village_id: "",
      });
    }
  };

  // Handle manual edit toggle
  const toggleManualEdit = () => {
    setManualEdit(!manualEdit);
    if (!manualEdit) {
      // Jika masuk mode manual, kosongkan auto-filled
      setSelectedLocation(null);
    }
  };

  const isFieldLocked = !manualEdit && selectedLocation;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">📍 Lokasi</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Cari dan pilih lokasi properti Anda
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Smart Search */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Cari Lokasi
            </Label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Ketik nama provinsi, kota, kecamatan, atau kelurahan
            </p>
            <AddressAutocomplete
              onSelect={handleLocationSelect}
              placeholder="Contoh: Pagedangan, Jakarta, BSD..."
            />
            {selectedLocation && (
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <MapPin className="h-3.5 w-3.5" />
                <span>Lokasi terpilih: <strong>{selectedLocation.name}</strong> ({selectedLocation.type})</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-500 dark:text-slate-400">
                atau isi manual
              </span>
            </div>
          </div>

          {/* Auto-filled or Manual Inputs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Detail Lokasi
              </span>
              <button
                onClick={toggleManualEdit}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {manualEdit ? (
                  <><Lock className="h-3 w-3" /> Kembali ke Auto</>
                ) : (
                  <><Edit className="h-3 w-3" /> Edit Manual</>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province_id">Provinsi</Label>
                <Input
                  id="province_id"
                  value={formData.province_id || ""}
                  disabled={!manualEdit}
                  placeholder={isFieldLocked ? "Otomatis dari lokasi" : "Pilih provinsi"}
                  className={cn(
                    isFieldLocked && "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400"
                  )}
                  onChange={(e) => updateFormData({ province_id: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city_id">Kota / Kabupaten</Label>
                <Input
                  id="city_id"
                  value={formData.city_id || ""}
                  disabled={!manualEdit}
                  placeholder={isFieldLocked ? "Otomatis dari lokasi" : "Pilih kota"}
                  className={cn(
                    isFieldLocked && "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400"
                  )}
                  onChange={(e) => updateFormData({ city_id: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district_id">Kecamatan</Label>
                <Input
                  id="district_id"
                  value={formData.district_id || ""}
                  disabled={!manualEdit}
                  placeholder={isFieldLocked ? "Otomatis dari lokasi" : "Pilih kecamatan"}
                  className={cn(
                    isFieldLocked && "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400"
                  )}
                  onChange={(e) => updateFormData({ district_id: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="village_id">Kelurahan / Desa</Label>
                <Input
                  id="village_id"
                  value={formData.village_id || ""}
                  disabled={!manualEdit}
                  placeholder={isFieldLocked ? "Otomatis dari lokasi" : "Pilih kelurahan"}
                  className={cn(
                    isFieldLocked && "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400"
                  )}
                  onChange={(e) => updateFormData({ village_id: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat Lengkap <span className="text-rose-500">*</span></Label>
              <Textarea
                id="address"
                placeholder="Jl. BSD Raya No. 12, Serpong"
                value={formData.address || ""}
                onChange={(e) => updateFormData({ address: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Kode Pos</Label>
                <Input
                  id="postal_code"
                  placeholder="15310"
                  value={formData.postal_code || ""}
                  onChange={(e) => updateFormData({ postal_code: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  placeholder="-6.3223"
                  value={formData.latitude || ""}
                  onChange={(e) => updateFormData({ latitude: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  placeholder="106.6186"
                  value={formData.longitude || ""}
                  onChange={(e) => updateFormData({ longitude: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          ← Kembali
        </Button>
        <Button
          onClick={nextStep}
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Lanjut ke Fasilitas →
        </Button>
      </div>
    </div>
  );
}