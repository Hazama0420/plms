"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  Loader2,
  Search,
  AlertTriangle,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { composeFullAddress, hasRegion } from "@/lib/property-address";

interface RegionItem {
  id: number;
  province_name: string;
  city_name: string;
  area_id: number | null;
  area_name: string;
}

interface StepLocationProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepLocation({ formData, updateFormData }: StepLocationProps) {
  const [manualEdit, setManualEdit] = useState(false);
  const [showManualFields, setShowManualFields] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<RegionItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Wilayah dari pencarian `regions` adalah alamat resminya; kolom jalan hanya
  // pelengkap. Ringkasan ini yang menandai apakah langkah ini sudah lengkap.
  const regionSelected = hasRegion(formData);

  const regionSummary = useMemo(
    () =>
      [formData.district_name, formData.city_name, formData.province_name]
        .map((part: unknown) => (typeof part === "string" ? part.trim() : ""))
        .filter(Boolean)
        .join(", "),
    [formData.district_name, formData.city_name, formData.province_name]
  );

  const previewAddress = useMemo(
    () => composeFullAddress(formData.address, formData),
    [formData.address, formData.district_name, formData.city_name, formData.province_name, formData.village_name]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔍 Pencarian ke tabel "regions" (satu-satunya sumber data wilayah)
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const columns = "id, province_name, city_name, area_id, area_name";

        const { data, error } = await supabase
          .from("regions")
          .select(columns)
          .ilike("area_name", `%${searchQuery}%`)
          .limit(15);

        if (error) {
          console.error("Gagal mencari wilayah:", error.message);
          toast.error("Pencarian wilayah gagal", { description: error.message });
          setSuggestions([]);
          return;
        }

        // Bila tidak ada area yang cocok, coba cocokkan nama kota.
        if (!data || data.length === 0) {
          const { data: cityData, error: cityError } = await supabase
            .from("regions")
            .select(columns)
            .ilike("city_name", `%${searchQuery}%`)
            .limit(15);

          if (cityError) {
            console.error("Gagal mencari kota:", cityError.message);
            setSuggestions([]);
            return;
          }

          setSuggestions(cityData || []);
          setShowDropdown(true);
        } else {
          setSuggestions(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Gagal melakukan pencarian wilayah:", err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleSelectRegion = (item: RegionItem) => {
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setManualEdit(false);

    // Hanya `region_id` (integer, mengacu ke regions.id) dan nama wilayah yang
    // disimpan. Kolom uuid province_id/city_id/district_id sengaja tidak
    // disentuh: FK-nya mengarah ke tabel yang sudah tidak dipakai, dan mengisi
    // district_id dengan `area_id` bertipe bigint adalah sebab alamat selama
    // ini ditolak Postgres lalu hilang tanpa pesan.
    updateFormData({
      region_id: item.id,
      province_name: item.province_name,
      city_name: item.city_name,
      district_name: item.area_name,
      village_name: formData.village_name || "",
    });

    toast.success(`Wilayah terpilih: ${item.area_name}, ${item.city_name}`);
  };

  const handleClearRegion = () => {
    updateFormData({
      region_id: null,
      province_name: "",
      city_name: "",
      district_name: "",
      village_name: "",
    });
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setManualEdit(false);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser Anda tidak mendukung fitur Geolocation GPS.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateFormData({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setIsLocating(false);
        toast.success("Koordinat GPS berhasil diambil!");
      },
      (error) => {
        setIsLocating(false);
        console.warn("Gagal mengambil posisi GPS:", error);
        toast.error("Gagal mengambil lokasi GPS. Pastikan izin lokasi diaktifkan.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const isFieldLocked = !manualEdit;

  // Ukuran sentuh 44px & text-base di layar kecil supaya iOS tidak memperbesar
  // halaman otomatis saat kolom difokuskan.
  const inputClass = "h-11 sm:h-9 text-base sm:text-xs focus-visible:ring-emerald-500";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            📍 Lokasi Properti
          </h2>
          <Badge
            variant="secondary"
            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-[11px]"
          >
            Langkah 3 dari 7
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pilih wilayah properti dari database, lalu tambahkan nama jalan bila ada.
        </p>
      </div>

      <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base font-semibold">Alamat Properti</CardTitle>
              <CardDescription className="text-[11px] sm:text-xs">
                Ketik nama area, kecamatan, atau kota — data diambil dari database wilayah
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          {/* ===== 1. WILAYAH (WAJIB) ===== */}
          <div className="relative space-y-2" ref={dropdownRef}>
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
              Wilayah Properti <span className="text-rose-500">*</span>
            </Label>

            {regionSelected ? (
              // Ringkasan wilayah terpilih — inilah alamat resmi yang tersimpan.
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25 p-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 break-words">
                    {regionSummary}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/70 mt-0.5">
                    Tersimpan sebagai wilayah resmi listing ini
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRegion}
                  className="h-8 px-2 text-[11px] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 gap-1 shrink-0"
                >
                  <X className="w-3.5 h-3.5" /> Ganti
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowDropdown(true);
                    }}
                    placeholder="Cari: Kebayoran Baru, BSD, Menteng, Bandung..."
                    className={cn(inputClass, "pl-9")}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/50 p-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Wilayah wajib dipilih dari hasil pencarian. Tanpa ini properti tidak bisa
                    dipublikasikan.
                  </p>
                </div>
              </>
            )}

            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-[50vh] overflow-y-auto">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectRegion(item)}
                    className="w-full text-left px-4 py-3 sm:py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 active:bg-emerald-100 dark:active:bg-emerald-900/40 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 last:border-none transition-colors"
                  >
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {item.area_name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.city_name} — {item.province_name}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ===== 2. NAMA JALAN (OPSIONAL) ===== */}
          <div className="space-y-1.5">
            <Label
              htmlFor="address"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Nama Jalan & Nomor{" "}
              <span className="font-normal text-slate-400">(opsional)</span>
            </Label>
            <Input
              id="address"
              placeholder="Jl. BSD Raya Barat No. 88, Blok A1/12"
              value={formData.address || ""}
              onChange={(e) => updateFormData({ address: e.target.value })}
              className={inputClass}
            />
            <p className="text-[11px] text-slate-400">
              Kosongkan bila tidak ingin menampilkan alamat persis properti.
            </p>
          </div>

          {/* ===== 3. PRATINJAU ALAMAT TERSIMPAN ===== */}
          {previewAddress && (
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
              <MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Tampil di listing
                </p>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 break-words mt-0.5">
                  {previewAddress}
                </p>
              </div>
            </div>
          )}

          {/* ===== 4. RINCIAN WILAYAH (BISA DILIPAT) ===== */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={() => setShowManualFields((prev) => !prev)}
              className="w-full flex items-center justify-between gap-2 text-left group"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                Rincian Struktur Administrasi
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-slate-400 transition-transform shrink-0",
                  showManualFields && "rotate-180"
                )}
              />
            </button>

            {showManualFields && (
              <div className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setManualEdit((prev) => !prev)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: "province_name", label: "Provinsi", placeholder: "Otomatis dari pencarian" },
                    { id: "city_name", label: "Kota / Kabupaten", placeholder: "Otomatis dari pencarian" },
                    { id: "district_name", label: "Kecamatan / Area", placeholder: "Otomatis dari pencarian" },
                    { id: "village_name", label: "Kelurahan / Desa", placeholder: "Opsional" },
                  ].map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label
                        htmlFor={field.id}
                        className="text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        {field.label}
                      </Label>
                      <Input
                        id={field.id}
                        value={formData[field.id] || ""}
                        disabled={!manualEdit}
                        placeholder={field.placeholder}
                        className={cn(
                          inputClass,
                          isFieldLocked &&
                            "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800"
                        )}
                        onChange={(e) => updateFormData({ [field.id]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===== 5. KODE POS & KOORDINAT ===== */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Kode Pos & Koordinat Peta</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isLocating}
                onClick={handleGetCurrentLocation}
                className="h-9 sm:h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Mengambil GPS...
                  </>
                ) : (
                  <>
                    <Navigation className="w-3 h-3" /> Ambil Posisi GPS
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label
                  htmlFor="postal_code"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Kode Pos
                </Label>
                <Input
                  id="postal_code"
                  inputMode="numeric"
                  placeholder="15310"
                  value={formData.postal_code || ""}
                  onChange={(e) => updateFormData({ postal_code: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="latitude"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <Globe2 className="w-3 h-3 text-slate-400" /> Latitude
                </Label>
                <Input
                  id="latitude"
                  inputMode="decimal"
                  placeholder="-6.300641"
                  value={formData.latitude || ""}
                  onChange={(e) => updateFormData({ latitude: e.target.value })}
                  className={cn(inputClass, "font-mono")}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="longitude"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <Globe2 className="w-3 h-3 text-slate-400" /> Longitude
                </Label>
                <Input
                  id="longitude"
                  inputMode="decimal"
                  placeholder="106.638531"
                  value={formData.longitude || ""}
                  onChange={(e) => updateFormData({ longitude: e.target.value })}
                  className={cn(inputClass, "font-mono")}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
