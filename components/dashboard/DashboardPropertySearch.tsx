// components/dashboard/DashboardPropertySearch.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Building2,
  RotateCcw,
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

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const params = new URLSearchParams();
    params.set("view", "global");

    if (keyword.trim()) params.set("q", keyword.trim());
    if (listingType && listingType !== "all") params.set("listing_type", listingType);
    if (propertyType && propertyType !== "all") params.set("property_type", propertyType);
    if (provinceName.trim()) params.set("province_name", provinceName.trim());
    if (cityName.trim()) params.set("city_name", cityName.trim());
    if (minBuildingArea) params.set("buildingAreaMin", minBuildingArea);
    if (maxBuildingArea) params.set("buildingAreaMax", maxBuildingArea);
    if (minLandArea) params.set("landAreaMin", minLandArea);
    if (maxLandArea) params.set("landAreaMax", maxLandArea);
    if (minPrice) params.set("priceMin", minPrice);
    if (maxPrice) params.set("priceMax", maxPrice);
    if (bedroom && bedroom !== "all") params.set("bedroom", bedroom);

    router.push(`/properties?${params.toString()}`);
  };

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
    <div className="w-full bg-transparent text-white space-y-3 relative z-10">
      <form onSubmit={handleSearch} className="space-y-3">
        {/* 🟢 BAR INPUT DIBUAT LEBIH KOMPAK (MAX-WIDTH DIATUR DI PARENT) & TANPA BACKGROUND PUTIH PEKAT */}
        <div className="flex flex-col md:flex-row items-stretch gap-2 bg-slate-950/40 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-white/20">
          
          {/* Input Keyword Utama */}
          <div className="flex-1 flex items-center gap-2 px-3 h-10 bg-white/95 rounded-xl border border-white/30">
            <Search className="w-4 h-4 text-emerald-600 shrink-0" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama properti, kode listing, atau klaster..."
              className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none font-medium"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Popover Filter Lanjutan */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/95 text-slate-700 text-xs font-semibold px-3 h-10 shadow-xs hover:bg-white transition cursor-pointer"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                <span>Filter</span>
              </PopoverTrigger>

              <PopoverContent className="w-[92vw] max-w-[580px] p-6 rounded-3xl shadow-2xl border-slate-200 space-y-6 max-h-[85vh] overflow-y-auto bg-white text-slate-900">
                <div className="flex items-center justify-between border-b pb-4">
                  <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-600" /> Filter Pencarian Premium
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5 rounded-xl font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Filter
                  </Button>
                </div>

                <div className="space-y-5 text-xs">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
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
                            "py-2.5 px-3 rounded-xl font-bold text-xs transition border cursor-pointer text-center",
                            listingType === item.value
                              ? "bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-500/30"
                              : "bg-slate-100 border-slate-200 text-slate-600 hover:border-emerald-500/50 hover:text-slate-900"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Kategori Properti
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {propertyCategories.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setPropertyType(cat.value)}
                          className={cn(
                            "py-2 px-3.5 rounded-xl font-semibold text-xs transition border cursor-pointer flex items-center gap-1.5",
                            propertyType === cat.value
                              ? "bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-500/30"
                              : "bg-slate-100 border-slate-200 text-slate-600 hover:border-emerald-500/50 hover:text-slate-900"
                          )}
                        >
                          {propertyType === cat.value && <Check className="w-3 h-3" />}
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> Lokasi & Kawasan
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        placeholder="Provinsi (mis: Banten, Jakarta)"
                        value={provinceName}
                        onChange={(e) => setProvinceName(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 text-slate-900"
                      />
                      <Input
                        placeholder="Kota / Kabupaten"
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800">💰 Rentang Harga (Rp)</Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Input
                        type="number"
                        placeholder="Harga Minimal"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="h-10 text-xs font-mono rounded-xl bg-slate-50 border-slate-200 text-slate-900"
                      />
                      <Input
                        type="number"
                        placeholder="Harga Maksimal"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="h-10 text-xs font-mono rounded-xl bg-slate-50 border-slate-200 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-800">📐 Luas Bangunan (LB m²)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min m²"
                          value={minBuildingArea}
                          onChange={(e) => setMinBuildingArea(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 text-slate-900"
                        />
                        <Input
                          type="number"
                          placeholder="Max m²"
                          value={maxBuildingArea}
                          onChange={(e) => setMaxBuildingArea(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-800">🏡 Luas Tanah (LT m²)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min m²"
                          value={minLandArea}
                          onChange={(e) => setMinLandArea(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 text-slate-900"
                        />
                        <Input
                          type="number"
                          placeholder="Max m²"
                          value={maxLandArea}
                          onChange={(e) => setMaxLandArea(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BedDouble className="w-3.5 h-3.5 text-emerald-600" /> Minimal Kamar Tidur
                    </Label>
                    <div className="grid grid-cols-6 gap-2">
                      {bedroomOptions.map((bed) => (
                        <button
                          key={bed.value}
                          type="button"
                          onClick={() => setBedroom(bed.value)}
                          className={cn(
                            "py-2 px-1 rounded-xl font-bold text-xs transition border cursor-pointer text-center",
                            bedroom === bed.value
                              ? "bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-500/30"
                              : "bg-slate-100 border-slate-200 text-slate-600 hover:border-emerald-500/50 hover:text-slate-900"
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
                    className="h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 rounded-xl shadow-md cursor-pointer"
                  >
                    Terapkan & Cari Properti
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Tombol Eksekusi Cari Utama */}
            <Button
              type="submit"
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl gap-1.5 shadow-md shrink-0 cursor-pointer transition-transform active:scale-98"
            >
              <Search className="w-3.5 h-3.5" /> Cari Properti
            </Button>
          </div>

        </div>
      </form>
    </div>
  );
}