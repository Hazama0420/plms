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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Eksekusi Pencarian -> Pindah ke /properties dengan URL Query Params
  const handleSearch = (e?: React.FormEvent) => {
  if (e) e.preventDefault();

  const params = new URLSearchParams();
  params.set("view", "global"); // 👈 Selalu set ke mode katalog global

  if (keyword.trim()) params.set("q", keyword.trim());
  if (listingType && listingType !== "all") params.set("listing_type", listingType);
  if (propertyType && propertyType !== "all") params.set("property_type", propertyType);
  if (provinceName.trim()) params.set("province", provinceName.trim());
  if (cityName.trim()) params.set("city", cityName.trim());
  if (minBuildingArea) params.set("min_bld", minBuildingArea);
  if (maxBuildingArea) params.set("max_bld", maxBuildingArea);
  if (minLandArea) params.set("min_land", minLandArea);
  if (maxLandArea) params.set("max_land", maxLandArea);
  if (minPrice) params.set("min_price", minPrice);
  if (maxPrice) params.set("max_price", maxPrice);
  if (bedroom && bedroom !== "all") params.set("bedroom", bedroom);

    // Buka Halaman Properties membawa filter
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
    <div className="w-full bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl space-y-5 relative overflow-hidden">
      {/* Ornamen Latar Belakang */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Search Box */}
      <div className="space-y-1 relative z-10">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-white/10 text-emerald-200 border-white/20 text-[11px] gap-1">
            <Sparkles className="w-3 h-3 text-emerald-300" /> Smart Property Finder
          </Badge>
        </div>
        <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
          Cari & Temukan Unit Properti Impian
        </h2>
        <p className="text-xs sm:text-sm text-emerald-100/80">
          Cari berdasarkan kata kunci, lokasi kawasan, spesifikasi bangunan, atau opsi sewa & jual.
        </p>
      </div>

      {/* Form Pencarian Utama */}
      <form onSubmit={handleSearch} className="space-y-3 relative z-10">
        <div className="flex flex-col md:flex-row items-stretch gap-2.5 bg-white/95 dark:bg-slate-900/95 p-2 rounded-2xl shadow-lg border border-white/20 backdrop-blur-md">
          {/* Input Keyword Utama */}
          <div className="flex-1 flex items-center gap-2 px-3 h-12">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ketik nama properti, kode listing, atau kawasan (Contoh: BSD, Cluster Foresta...)"
              className="w-full bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-hidden font-medium"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-2 md:pt-0 md:pl-2">
            {/* Popover Filter Lanjutan */}
<Popover open={filterOpen} onOpenChange={setFilterOpen}>
  <PopoverTrigger
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 h-11 px-4 text-xs font-semibold cursor-pointer flex-1 md:flex-initial"
    )}
  >
    <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    <span>Filter Lanjutan</span>
    {activeFilterCount > 0 && (
      <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full h-5 min-w-5 justify-center">
        {activeFilterCount}
      </Badge>
    )}
  </PopoverTrigger>

              <PopoverContent className="w-[90vw] max-w-[540px] p-5 rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-3">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-600" /> Filter Pencarian Lanjutan
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Filter
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Status Transaksi (Jual/Sewa) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tipe Transaksi
                    </Label>
                    <Select value={listingType} onValueChange={(val) => setListingType(val || "")}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Pilih Tipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua (Jual & Sewa)</SelectItem>
                        <SelectItem value="jual">Hanya Dijual</SelectItem>
                        <SelectItem value="sewa">Hanya Disewakan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Jenis Properti */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Kategori Properti
                    </Label>
                    <Select value={propertyType} onValueChange={(val) => setPropertyType(val || "")}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Semua Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kategori</SelectItem>
                        <SelectItem value="rumah">Rumah</SelectItem>
                        <SelectItem value="apartment">Apartemen</SelectItem>
                        <SelectItem value="ruko">Ruko / Shophouse</SelectItem>
                        <SelectItem value="tanah">Tanah / Kavling</SelectItem>
                        <SelectItem value="gudang">Gudang / Pabrik</SelectItem>
                        <SelectItem value="kantor">Gedung / Kantor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Wilayah Kota / Provinsi */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Lokasi (Provinsi / Kota)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Provinsi (mis: Banten)"
                        value={provinceName}
                        onChange={(e) => setProvinceName(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Input
                        placeholder="Kota (mis: Tangsel)"
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Range Luas Bangunan */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> Luas Bangunan (LB m²)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min m²"
                        value={minBuildingArea}
                        onChange={(e) => setMinBuildingArea(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Max m²"
                        value={maxBuildingArea}
                        onChange={(e) => setMaxBuildingArea(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Range Luas Tanah */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-slate-400" /> Luas Tanah (LT m²)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min m²"
                        value={minLandArea}
                        onChange={(e) => setMinLandArea(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Max m²"
                        value={maxLandArea}
                        onChange={(e) => setMaxLandArea(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Range Harga */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Ekspektasi Rentang Harga (Rp)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Harga Minimal"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="h-9 text-xs font-mono"
                      />
                      <Input
                        type="number"
                        placeholder="Harga Maksimal"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Min Kamar Tidur */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Minimal Kamar Tidur
                    </Label>
                    <Select value={bedroom} onValueChange={(val) => setBedroom(val || "")}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Berapa saja" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Berapa saja</SelectItem>
                        <SelectItem value="1">1+ Kamar</SelectItem>
                        <SelectItem value="2">2+ Kamar</SelectItem>
                        <SelectItem value="3">3+ Kamar</SelectItem>
                        <SelectItem value="4">4+ Kamar</SelectItem>
                        <SelectItem value="5">5+ Kamar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFilterOpen(false)}
                    className="h-9 text-xs"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setFilterOpen(false);
                      handleSearch();
                    }}
                    className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5"
                  >
                    Terapkan & Cari
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Tombol Eksekusi Cari */}
            <Button
              type="submit"
              className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl gap-2 shadow-md shadow-emerald-600/30 shrink-0 flex-1 md:flex-initial"
            >
              <Search className="w-4 h-4" /> Cari Properti
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}