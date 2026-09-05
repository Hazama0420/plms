// components/create-property/steps/StepLocation.tsx
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
  ChevronDown,
  Info,
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
  nextStep?: () => void;
  prevStep?: () => void;
}

export function StepLocation({ formData, updateFormData }: StepLocationProps) {
  const [manualEdit, setManualEdit] = useState(false);
  const [showManualFields, setShowManualFields] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<RegionItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Wilayah dari pencarian `regions` adalah alamat resminya; kolom jalan hanya pelengkap.
  const regionSelected = hasRegion(formData);

  const previewAddress = useMemo(
    () => composeFullAddress(formData.address, formData),
    [formData]
  );

  // Deteksi properti legacy: memiliki address text tetapi belum memiliki structured region
  const isLegacyUnstructured = Boolean(formData.address && formData.address.trim() && !regionSelected);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔍 Pencarian ke tabel "regions" (satu-satunya sumber kebenaran wilayah)
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        setSearchPerformed(false);
        return;
      }

      setIsSearching(true);
      setSearchPerformed(true);
      try {
        const columns = "id, province_name, city_name, area_id, area_name";

        const { data, error } = await supabase
          .from("regions")
          .select(columns)
          .ilike("area_name", `%${searchQuery.trim()}%`)
          .limit(15);

        if (error) {
          console.error("Gagal mencari wilayah:", error.message);
          toast.error("Pencarian wilayah gagal", { description: error.message });
          setSuggestions([]);
          return;
        }

        // Bila tidak ada area yang cocok, coba cocokkan nama kota
        if (!data || data.length === 0) {
          const { data: cityData, error: cityError } = await supabase
            .from("regions")
            .select(columns)
            .ilike("city_name", `%${searchQuery.trim()}%`)
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
    }, 280);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleSelectRegion = (item: RegionItem) => {
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setManualEdit(false);
    setSearchPerformed(false);

    // Simpan `region_id` (integer) dan nama wilayah resmi ke formData
    updateFormData({
      region_id: item.id,
      province_name: item.province_name,
      city_name: item.city_name,
      district_name: item.area_name,
      village_name: formData.village_name || "",
    });

    toast.success(`Wilayah terdaftar: ${item.area_name}, ${item.city_name}`);
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
    setSearchPerformed(false);
  };

  const handleUseAiCandidate = () => {
    if (formData.location_candidate) {
      setSearchQuery(formData.location_candidate);
      toast.info(`Mencari wilayah: "${formData.location_candidate}"...`);
    }
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
  const inputClass = "h-11 sm:h-9 text-base sm:text-xs focus-visible:ring-emerald-500 rounded-xl";

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* HEADER LANGKAH */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>Lokasi Properti</span>
          </h2>
          <Badge
            variant="secondary"
            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-[11px]"
          >
            Langkah 3 dari 7
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tentukan wilayah administratif resmi dari database, lalu lengkapi dengan nama jalan bila diperlukan.
        </p>
      </div>

      {/* ⚠️ NOTIFIKASI KHUSUS DATA LEGACY */}
      {isLegacyUnstructured && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-foreground">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Perhatian: Data Wilayah Perlu Dilengkapi
            </p>
            <p className="text-muted-foreground">
              Properti ini memiliki teks alamat lama (<em>&quot;{formData.address}&quot;</em>), namun belum memiliki data wilayah terstruktur resmi. Silakan cari dan pilih wilayah terdaftar di bawah.
            </p>
          </div>
        </div>
      )}

      {/* ✨ CHIP REKOMENDASI LOKASI DARI AI AUTO-FILL */}
      {!regionSelected && formData.location_candidate && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-foreground animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Lokasi Terdeteksi dari Deskripsi AI
              </p>
              <p className="text-xs sm:text-sm font-black text-foreground truncate">
                &quot;{formData.location_candidate}&quot;
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleUseAiCandidate}
            className="h-8 px-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 cursor-pointer shadow-xs"
          >
            <Search className="w-3.5 h-3.5 mr-1.5" />
            Cari Wilayah Ini
          </Button>
        </div>
      )}

      <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base font-bold">Wilayah & Alamat Properti</CardTitle>
              <CardDescription className="text-[11px] sm:text-xs">
                Wilayah wajib dipilih dari database terdaftar agar listing dapat dicari oleh pembeli
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          {/* ===== 1. WILAYAH TERSTRUKTUR (WAJIB) ===== */}
          <div className="relative space-y-2" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                Wilayah Administratif <span className="text-rose-500">*</span>
              </Label>
              {regionSelected && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Terverifikasi Resmi
                </span>
              )}
            </div>

            {regionSelected ? (
              // KARTU KONFIRMASI WILAYAH TERPILIH
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Wilayah Terdaftar Resmi
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-foreground leading-tight break-words">
                        {formData.district_name || formData.city_name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Kota/Kab: <span className="font-semibold text-foreground">{formData.city_name || "-"}</span> • Provinsi: <span className="font-semibold text-foreground">{formData.province_name || "-"}</span>
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearRegion}
                    className="h-8 px-3 text-xs font-semibold rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Ganti Wilayah
                  </Button>
                </div>
              </div>
            ) : (
              // KOTAK PENCARIAN WILAYAH DENGAN AUTO-SUGGESTION
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowDropdown(true);
                    }}
                    placeholder="Cari wilayah: Cipondoh, Gunung Sindur, BSD, Menteng, Kebayoran..."
                    className={cn(inputClass, "pl-9")}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* FEEDBACK STATE PENCARIAN */}
                {searchQuery.trim().length >= 2 && !showDropdown && !isSearching && suggestions.length === 0 && searchPerformed && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5">
                    <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-900 dark:text-amber-200">
                      Wilayah &quot;<strong>{searchQuery}</strong>&quot; tidak ditemukan. Coba ketik nama kecamatan atau kota terdekat (contoh: &quot;Tangerang&quot;, &quot;Bogor&quot;, &quot;Jakarta Selatan&quot;).
                    </p>
                  </div>
                )}

                {/* DROPDOWN HASIL PENCARIAN */}
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-2xl shadow-lg max-h-[50vh] overflow-y-auto divide-y divide-border/60">
                    <div className="px-3 py-1.5 bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Klik salah satu wilayah di bawah untuk konfirmasi:
                    </div>
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectRegion(item)}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 active:bg-emerald-500/20 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {item.area_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.city_name} — {item.province_name}
                          </p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-start gap-2 rounded-xl bg-muted/50 border border-border/60 p-2.5 text-muted-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px]">
                    Wilayah wajib dipilih dari hasil pencarian di atas agar terdaftar resmi. Nama jalan di bawah bersifat opsional.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ===== 2. NAMA JALAN / PATOKAN (OPSIONAL) ===== */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <Label htmlFor="address" className="text-xs font-semibold text-foreground">
                Nama Jalan, Nomor, Blok, atau Patokan
              </Label>
              <span className="text-[10px] text-muted-foreground font-medium">Opsional</span>
            </div>
            <Input
              id="address"
              placeholder="Contoh: Jl. Utama Sektor 1.2 No. 88, Blok A3"
              value={formData.address || ""}
              onChange={(e) => updateFormData({ address: e.target.value })}
              className={inputClass}
            />
            <p className="text-[11px] text-muted-foreground">
              Alamat jalan spesifik dapat dikosongkan jika pemilik tidak ingin menampilkan lokasi persis ke publik.
            </p>
          </div>

          {/* ===== 3. PRATINJAU ALAMAT TERSIMPAN ===== */}
          {previewAddress && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-muted/40 border border-border/80 p-3.5">
              <MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Pratinjau Alamat Lengkap
                </p>
                <p className="text-xs sm:text-sm font-semibold text-foreground break-words mt-0.5">
                  {previewAddress}
                </p>
              </div>
            </div>
          )}

          {/* ===== 4. RINCIAN WILAYAH (BISA DILIPAT) ===== */}
          <div className="border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={() => setShowManualFields((prev) => !prev)}
              className="w-full flex items-center justify-between gap-2 text-left group cursor-pointer"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                Rincian Struktur Administrasi
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                  showManualFields && "rotate-180"
                )}
              />
            </button>

            {showManualFields && (
              <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setManualEdit((prev) => !prev)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-blue-500/10 cursor-pointer"
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
                      <Label htmlFor={field.id} className="text-xs font-medium text-muted-foreground">
                        {field.label}
                      </Label>
                      <Input
                        id={field.id}
                        value={formData[field.id] || ""}
                        disabled={!manualEdit}
                        placeholder={field.placeholder}
                        className={cn(
                          inputClass,
                          isFieldLocked && "bg-muted/50 text-muted-foreground cursor-not-allowed border-border/60"
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
          <div className="pt-4 border-t border-border/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Kode Pos & Koordinat Peta</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isLocating}
                onClick={handleGetCurrentLocation}
                className="h-8 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 cursor-pointer rounded-xl"
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
                <Label htmlFor="postal_code" className="text-xs font-medium text-muted-foreground">
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
                <Label htmlFor="latitude" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Globe2 className="w-3 h-3 text-muted-foreground" /> Latitude
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
                <Label htmlFor="longitude" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Globe2 className="w-3 h-3 text-muted-foreground" /> Longitude
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
