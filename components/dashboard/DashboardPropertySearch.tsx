"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Home,
  Building2,
  RotateCcw,
  Sparkles,
  X,
  Check,
  Tag,
  BedDouble,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export function DashboardPropertySearch() {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(false);

  // State Filter
  const [keyword, setKeyword] = useState("");
  const [listingType, setListingType] = useState<string>("all");
  const [propertyType, setPropertyType] = useState<string>("all");
  const [provinceName, setProvinceName] = useState("");
  const [cityName, setCityName] = useState("");
  const [minBuildingArea, setMinBuildingArea] = useState("");
  const [maxBuildingArea, setMaxBuildingArea] = useState("");
  const [minLandArea, setMinLandArea] = useState("");
  const [maxLandArea, setMaxLandArea] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedroom, setBedroom] = useState<string>("all");

  // Opsi Kategori Properti Mewah dengan Icon / Label
  const propertyCategories = [
    { label: "Semua", value: "all" },
    { label: "🏡 Rumah", value: "rumah" },
    { label: "🏢 Apartemen", value: "apartment" },
    { label: "🏪 Ruko", value: "ruko" },
    { label: "🟩 Tanah", value: "tanah" },
    { label: "🏭 Gudang", value: "gudang" },
  ];

  const bedroomOptions = [
    { label: "Bebas", value: "all" },
    { label: "1+", value: "1" },
    { label: "2+", value: "2" },
    { label: "3+", value: "3" },
    { label: "4+", value: "4" },
    { label: "5+", value: "5" },
  ];

  // Hitung berapa filter aktif yang digunakan
  const activeFilterCount = [
    listingType !== "all" ? listingType : null,
    propertyType !== "all" ? propertyType : null,
    provinceName,
    cityName,
    minBuildingArea,
    maxBuildingArea,
    minLandArea,
    maxLandArea,
    minPrice,
    maxPrice,
    bedroom !== "all" ? bedroom : null,
  ].filter(Boolean).length;

  // Eksekusi Pencarian -> Pindah ke /properties dengan URL Query Params yang Sinkron
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const params = new URLSearchParams();
    params.set("view", "global"); // Mode katalog global

    if (keyword.trim()) params.set("q", keyword.trim());
    if (listingType && listingType !== "all") params.set("listing_type", listingType);
    if (propertyType && propertyType !== "all") params.set("property_type", propertyType);
    
    // Sinkronisasi parameter lokasi
    if (provinceName.trim()) params.set("province_name", provinceName.trim());
    if (cityName.trim()) params.set("city_name", cityName.trim());

    // Sinkronisasi parameter rentang data dengan service backend
    if (minBuildingArea) params.set("buildingAreaMin", minBuildingArea);
    if (maxBuildingArea) params.set("buildingAreaMax", maxBuildingArea);
    if (minLandArea) params.set("landAreaMin", minLandArea);
    if (maxLandArea) params.set("landAreaMax", maxLandArea);
    if (minPrice) params.set("priceMin", minPrice);
    if (maxPrice) params.set("priceMax", maxPrice);
    
    if (bedroom && bedroom !== "all") params.set("bedroom", bedroom);

    router.push(`/properties?${params.toString()}`);
  };

  // Reset Semua Filter
  const handleReset = () => {
    setKeyword("");
    setListingType("all");
    setPropertyType("all");
    setProvinceName("");
    setCityName("");
    setMinBuildingArea("");
    setMaxBuildingArea("");
    setMinLandArea("");
    setMaxLandArea("");
    setMinPrice("");
    setMaxPrice("");
    setBedroom("all");
  };

  return (
    <div className="w-full bg-gradient-to-br from-emerald-600 via-teal-800 to-slate-950 rounded-3xl p-5 sm:p-8 text-white shadow-2xl space-y-5 relative overflow-hidden border border-emerald-500/20">
      {/* Ornamen Latar Belakang Estetik */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Search Box */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-white/10 text-emerald-200 border-white/20 text-[11px] gap-1 px-3 py-1 backdrop-blur-md rounded-full">
            <Sparkles className="w-3 h-3 text-emerald-300 animate-pulse" /> Smart Property Finder & Exclusives
          </Badge>
        </div>
        <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white">
          Temukan Hunian & Investasi Properti Berkelas
        </h2>
        <p className="text-xs sm:text-sm text-emerald-100/80">
          Cari berdasarkan kawasan strategis, spesifikasi bangunan, atau pilihan eksklusif jual & sewa.
        </p>
      </div>

      {/* Form Pencarian Utama */}
      <form onSubmit={handleSearch} className="space-y-3 relative z-10">
        <div className="flex flex-col md:flex-row items-stretch gap-2.5 bg-white/95 dark:bg-slate-900/95 p-2.5 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl">
          
          {/* Input Keyword Utama */}
          <div className="flex-1 flex items-center gap-2.5 px-3 h-12 bg-slate-100/60 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama properti, kode listing, atau klaster (Contoh: BSD, Foresta...)"
              className="w-full bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-hidden font-medium"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-1 md:pt-0">
            {/* Popover Filter Lanjutan */}
           <Popover open={filterOpen} onOpenChange={setFilterOpen}>
  <PopoverTrigger
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-2 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
    )}
  >
    <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
    <span>Filter</span>
  </PopoverTrigger>

              <PopoverContent className="w-[92vw] max-w-[580px] p-6 rounded-3xl shadow-2xl border-slate-200 dark:border-slate-800 space-y-6 max-h-[85vh] overflow-y-auto bg-card text-card-foreground">
                <div className="flex items-center justify-between border-b pb-4">
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-600" /> Filter Pencarian Premium
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 rounded-xl font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Filter
                  </Button>
                </div>

                <div className="space-y-5 text-xs">
                  
                  {/* 1. TIPE TRANSAKSI (JUAL / SEWA) - PILL BUTTONS */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" /> Tipe Transaksi
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Semua", value: "all" },
                        { label: "🔥 Dijual", value: "jual" },
                        { label: "📋 Disewakan", value: "sewa" },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setListingType(item.value)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl font-bold text-xs transition border cursor-pointer text-center shadow-2xs",
                            listingType === item.value
                              ? "bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-500/30 shadow-md"
                              : "bg-muted/40 border-border text-muted-foreground hover:border-emerald-500/50 hover:text-foreground"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. KATEGORI PROPERTI - CHIPS BUTTONS */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Kategori Properti
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {propertyCategories.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setPropertyType(cat.value)}
                          className={cn(
                            "py-2 px-3.5 rounded-xl font-semibold text-xs transition border cursor-pointer flex items-center gap-1.5 shadow-2xs",
                            propertyType === cat.value
                              ? "bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-500/30 shadow-md"
                              : "bg-muted/40 border-border text-muted-foreground hover:border-emerald-500/50 hover:text-foreground"
                          )}
                        >
                          {propertyType === cat.value && <Check className="w-3 h-3" />}
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. WILAYAH (PROVINSI & KOTA) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> Lokasi & Kawasan
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        placeholder="Provinsi (mis: Banten, Jakarta)"
                        value={provinceName}
                        onChange={(e) => setProvinceName(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-background border-border"
                      />
                      <Input
                        placeholder="Kota / Kabupaten (mis: Tangerang Selatan)"
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-background border-border"
                      />
                    </div>
                  </div>

                  {/* 4. RENTANG HARGA (IDR) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      💰 Rentang Harga (Rp)
                    </Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Input
                        type="number"
                        placeholder="Harga Minimal (Cth: 500000000)"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="h-10 text-xs font-mono rounded-xl bg-background border-border"
                      />
                      <Input
                        type="number"
                        placeholder="Harga Maksimal (Cth: 5000000000)"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="h-10 text-xs font-mono rounded-xl bg-background border-border"
                      />
                    </div>
                  </div>

                  {/* 5. LUAS BANGUNAN & LUAS TANAH */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        📐 Luas Bangunan (LB m²)
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min m²"
                          value={minBuildingArea}
                          onChange={(e) => setMinBuildingArea(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-background border-border"
                        />
                        <Input
                          type="number"
                          placeholder="Max m²"
                          value={maxBuildingArea}
                          onChange={(e) => setMaxBuildingArea(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-background border-border"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        🏡 Luas Tanah (LT m²)
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min m²"
                          value={minLandArea}
                          onChange={(e) => setMinLandArea(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-background border-border"
                        />
                        <Input
                          type="number"
                          placeholder="Max m²"
                          value={maxLandArea}
                          onChange={(e) => setMaxLandArea(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 6. KAMAR TIDUR - PILL BUTTONS */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <BedDouble className="w-3.5 h-3.5 text-emerald-600" /> Minimal Kamar Tidur
                    </Label>
                    <div className="grid grid-cols-6 gap-2">
                      {bedroomOptions.map((bed) => (
                        <button
                          key={bed.value}
                          type="button"
                          onClick={() => setBedroom(bed.value)}
                          className={cn(
                            "py-2 px-1 rounded-xl font-bold text-xs transition border cursor-pointer text-center shadow-2xs",
                            bedroom === bed.value
                              ? "bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-500/30 shadow-md"
                              : "bg-muted/40 border-border text-muted-foreground hover:border-emerald-500/50 hover:text-foreground"
                          )}
                        >
                          {bed.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="pt-3 border-t flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFilterOpen(false)}
                    className="h-10 text-xs rounded-xl px-5 font-semibold cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setFilterOpen(false);
                      handleSearch();
                    }}
                    className="h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 rounded-xl shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    Terapkan & Cari Properti
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Tombol Eksekusi Cari Utama */}
            <Button
              type="submit"
              className="h-12 px-6 sm:px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl gap-2 shadow-lg shadow-emerald-600/40 shrink-0 cursor-pointer transition-transform active:scale-98 flex-1 md:flex-initial"
            >
              <Search className="w-4 h-4" /> Cari Properti
            </Button>
          </div>

        </div>
      </form>
    </div>
  );
}