// components/create-property/steps/StepLocation.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/create-property/AddressAutocomplete";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Lock,
  Edit3,
  Compass,
  CheckCircle2,
  Sparkles,
  Building2,
  Navigation,
  Globe2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationResult {
  id: string;
  name: string;
  type: "province" | "city" | "district" | "village";
  fullAddress: string;
  parentName?: string;
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_id?: string | null;
  province_name?: string;
  city_name?: string;
  district_name?: string;
  village_name?: string;
  latitude?: number | string;
  longitude?: number | string;
  postal_code?: string;
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

  // Helper untuk mendapatkan nama lokasi manusia (bukan raw ID/UUID)
  const getDisplayName = (field: "province" | "city" | "district" | "village") => {
    return (
      formData[`${field}_name`] ||
      formData[field] ||
      (typeof formData[`${field}_id`] === "string" && !formData[`${field}_id`].includes("-")
        ? formData[`${field}_id`]
        : "")
    );
  };

  const handleLocationSelect = (location: LocationResult) => {
    setSelectedLocation(location);
    setManualEdit(false);

    // Ambil komponen nama jika tersedia dari autocomplete
    const parts = location.fullAddress ? location.fullAddress.split(",").map((s) => s.trim()) : [];

    const provName = location.province_name || parts[parts.length - 1] || location.name;
    const cityName = location.city_name || parts[parts.length - 2] || "";
    const distName = location.district_name || parts[parts.length - 3] || "";
    const villName = location.village_name || parts[0] || "";

    // Update form data dengan ID dan Nama yang ramah dibaca
    updateFormData({
      province_id: location.province_id || location.id || "",
      province_name: provName,
      city_id: location.city_id || "",
      city_name: cityName,
      district_id: location.district_id || "",
      district_name: distName,
      village_id: location.village_id || "",
      village_name: villName,
      address: location.fullAddress || location.name,
      latitude: location.latitude ? String(location.latitude) : formData.latitude || "",
      longitude: location.longitude ? String(location.longitude) : formData.longitude || "",
      postal_code: location.postal_code || formData.postal_code || "",
    });

    // Reset bidang anak jika memilih tingkat atas
    if (location.type === "province") {
      updateFormData({
        city_id: "",
        city_name: "",
        district_id: "",
        district_name: "",
        village_id: "",
        village_name: "",
      });
    } else if (location.type === "city") {
      updateFormData({
        district_id: "",
        district_name: "",
        village_id: "",
        village_name: "",
      });
    } else if (location.type === "district") {
      updateFormData({
        village_id: "",
        village_name: "",
      });
    }
  };

  // Toggle mode edit manual
  const toggleManualEdit = () => {
    setManualEdit(!manualEdit);
  };

  // Simulasi ambil lokasi GPS
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateFormData({
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          });
        },
        (error) => {
          console.warn("Gagal mengambil posisi GPS:", error);
        }
      );
    }
  };

  const isFieldLocked = !manualEdit && (selectedLocation || formData.province_name);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              📍 Lokasi Properti
            </h2>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-xs">
              Langkah 2 dari 5
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cari wilayah administrasi properti Anda secara otomatis atau masukkan detail secara manual.
          </p>
        </div>
      </div>

      <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Pencarian Cerdas (Smart Search)</CardTitle>
                <CardDescription className="text-xs">
                  Cari nama kawasan, kota, atau kecamatan untuk mengisi semua field otomatis
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Autocomplete Bar */}
          <div className="space-y-2">
            <AddressAutocomplete
              onSelect={handleLocationSelect}
              placeholder="Ketik lokasi (Contoh: BSD City, Serpong, Jakarta Selatan...)"
            />

            {/* Badge Indikator Terpilih */}
            {selectedLocation && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">
                    Wilayah Terdeteksi: <span className="underline">{selectedLocation.name}</span> ({selectedLocation.type})
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 mt-0.5 text-[11px]">
                    {selectedLocation.fullAddress}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-950 px-3 text-slate-400 font-medium">
                Detail Rincian Wilayah
              </span>
            </div>
          </div>

          {/* Section Header with Manual Toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Struktur Administrasi</span>
            </div>
            <button
              type="button"
              onClick={toggleManualEdit}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30"
            >
              {manualEdit ? (
                <>
                  <Lock className="h-3.5 w-3.5 text-blue-500" /> Kunci (Auto-fill)
                </>
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5 text-blue-500" /> Ubah / Isi Manual
                </>
              )}
            </button>
          </div>

          {/* Grid 4 Kolom Administrasi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provinsi */}
            <div className="space-y-1.5">
              <Label htmlFor="province_name" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Provinsi
              </Label>
              <Input
                id="province_name"
                value={getDisplayName("province")}
                disabled={!manualEdit}
                placeholder={isFieldLocked ? "Otomatis dari lokasi" : "Masukkan nama provinsi"}
                className={cn(
                  "h-9 text-xs transition-colors",
                  isFieldLocked && "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800"
                )}
                onChange={(e) =>
                  updateFormData({
                    province_name: e.target.value,
                    province_id: e.target.value,
                  })
                }
              />
            </div>

            {/* Kota / Kab */}
            <div className="space-y-1.5">
              <Label htmlFor="city_name" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Kota / Kabupaten
              </Label>
              <Input
                id="city_name"
                value={getDisplayName("city")}
                disabled={!manualEdit}
                placeholder={isFieldLocked ? "Otomatis dari lokasi" : "Masukkan nama kota/kabupaten"}
                className={cn(
                  "h-9 text-xs transition-colors",
                  isFieldLocked && "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800"
                )}
                onChange={(e) =>
                  updateFormData({
                    city_name: e.target.value,
                    city_id: e.target.value,
                  })
                }
              />
            </div>

            {/* Kecamatan */}
            <div className="space-y-1.5">
              <Label htmlFor="district_name" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Kecamatan
              </Label>
              <Input
                id="district_name"
                value={getDisplayName("district")}
                disabled={!manualEdit}
                placeholder={isFieldLocked ? "Otomatis dari lokasi" : "Masukkan nama kecamatan"}
                className={cn(
                  "h-9 text-xs transition-colors",
                  isFieldLocked && "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800"
                )}
                onChange={(e) =>
                  updateFormData({
                    district_name: e.target.value,
                    district_id: e.target.value,
                  })
                }
              />
            </div>

            {/* Kelurahan */}
            <div className="space-y-1.5">
              <Label htmlFor="village_name" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Kelurahan / Desa
              </Label>
              <Input
                id="village_name"
                value={getDisplayName("village")}
                disabled={!manualEdit}
                placeholder={isFieldLocked ? "Otomatis dari lokasi" : "Masukkan nama kelurahan/desa"}
                className={cn(
                  "h-9 text-xs transition-colors",
                  isFieldLocked && "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800"
                )}
                onChange={(e) =>
                  updateFormData({
                    village_name: e.target.value,
                    village_id: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Alamat Lengkap */}
          <div className="space-y-1.5 pt-2">
            <Label htmlFor="address" className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
              Alamat Lengkap & Jalan <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="address"
              placeholder="Contoh: Jl. BSD Raya Barat No. 88, Cluster Foresta, Blok A1/12"
              value={formData.address || ""}
              onChange={(e) => updateFormData({ address: e.target.value })}
              rows={3}
              className="text-xs resize-none focus-visible:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400">
              Sebutkan nama jalan, nomor rumah, atau nomor unit untuk mempermudah calon pembeli.
            </p>
          </div>

          {/* Kode Pos & Koordinat GPS */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Kode Pos & Koordinat Peta</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGetCurrentLocation}
                className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5"
              >
                <Navigation className="w-3 h-3" /> Ambil Posisi GPS Saat Ini
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="postal_code" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Kode Pos
                </Label>
                <Input
                  id="postal_code"
                  placeholder="15310"
                  value={formData.postal_code || ""}
                  onChange={(e) => updateFormData({ postal_code: e.target.value })}
                  className="h-9 text-xs focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="latitude" className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Globe2 className="w-3 h-3 text-slate-400" /> Latitude
                </Label>
                <Input
                  id="latitude"
                  placeholder="-6.300641"
                  value={formData.latitude || ""}
                  onChange={(e) => updateFormData({ latitude: e.target.value })}
                  className="h-9 text-xs focus-visible:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="longitude" className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Globe2 className="w-3 h-3 text-slate-400" /> Longitude
                </Label>
                <Input
                  id="longitude"
                  placeholder="106.638531"
                  value={formData.longitude || ""}
                  onChange={(e) => updateFormData({ longitude: e.target.value })}
                  className="h-9 text-xs focus-visible:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tombol Navigasi Bawah */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={prevStep}
          className="text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ← Kembali ke Informasi Utama
        </Button>
        <Button
          onClick={nextStep}
          className="text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2"
        >
          Lanjut ke Fasilitas & Fitur →
        </Button>
      </div>
    </div>
  );
}