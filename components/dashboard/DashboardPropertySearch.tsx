"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  ArrowUpDown,
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
import {
  RegionMultiSelect,
  type SelectedRegion,
} from "@/components/dashboard/RegionMultiSelect";

/**
 * Membangun ulang chip lokasi dari URL saat panel dibuka atau halaman dimuat
 * ulang.
 *
 * Ada dua bentuk parameter lokasi yang beredar:
 *   - `district_name` berulang — ditulis panel ini sendiri.
 *   - `city_name` tunggal — dikirim tombol "Lihat Semua" di halaman detail
 *     properti dan pencarian di beranda.
 * Keduanya ditampilkan sebagai chip agar pengguna melihat filter yang sedang
 * aktif, bukan panel kosong yang akan menghapus filternya begitu ditekan Cari.
 *
 * Id negatif dipakai sebagai penanda "bukan baris asli tabel regions"; nilainya
 * tidak pernah ikut dikirim ke basis data.
 */
function readRegionsFromParams(params: URLSearchParams): SelectedRegion[] {
  const result: SelectedRegion[] = [];

  params.getAll("district_name").forEach((name, index) => {
    const area = name.trim();
    if (!area) return;
    result.push({
      id: -(index + 1),
      province_name: "",
      city_name: "",
      area_name: area,
    });
  });

  const city = (params.get("city_name") ?? "").trim();
  if (city) {
    result.push({
      id: -1000,
      province_name: "",
      city_name: city,
      area_name: "",
    });
  }

  return result;
}

export function DashboardPropertySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);

  // Nilai awal dibaca dari URL supaya panel filter mencerminkan pencarian yang
  // sedang berjalan. Tanpa ini, membuka kembali panel menampilkan formulir
  // kosong lalu menghapus seluruh filter begitu tombol "Cari" ditekan.
  const initial = (key: string, fallback = "") => searchParams.get(key) ?? fallback;

  // State Filter
  const [keyword, setKeyword] = useState(initial("q"));
  const [listingType, setListingType] = useState<string>(initial("listing_type", "all"));
  const [propertyType, setPropertyType] = useState<string>(initial("property_type", "all"));
  const [regions, setRegions] = useState<SelectedRegion[]>(() =>
    readRegionsFromParams(searchParams)
  );
  const [minBuildingArea, setMinBuildingArea] = useState(initial("buildingAreaMin"));
  const [maxBuildingArea, setMaxBuildingArea] = useState(initial("buildingAreaMax"));
  const [minLandArea, setMinLandArea] = useState(initial("landAreaMin"));
  const [maxLandArea, setMaxLandArea] = useState(initial("landAreaMax"));
  const [minPrice, setMinPrice] = useState(initial("priceMin"));
  const [maxPrice, setMaxPrice] = useState(initial("priceMax"));
  const [bedroom, setBedroom] = useState<string>(initial("bedroom", "all"));
  const [sortBy, setSortBy] = useState<string>(initial("sort", "all"));

  // 🏢 KATEGORI PROPERTI LENGKAP
  //
  // `value` harus sama persis dengan isi kolom `property_type` di basis data —
  // "perkantoran" dan "ruang usaha" tidak pernah cocok karena tersimpan sebagai
  // `kantor` dan `ruang_usaha`.
  const propertyCategories = [
    { label: "Semua", value: "all" },
    { label: "🏠 Rumah", value: "rumah" },
    { label: "🏢 Apartemen", value: "apartemen" },
    { label: "🌿 Tanah", value: "tanah" },
    { label: "🏪 Ruko", value: "ruko" },
    { label: "🛏️ Kost", value: "kost" },
    { label: "🏖️ Villa", value: "villa" },
    { label: "🏨 Hotel", value: "hotel" },
    { label: "🏭 Pabrik", value: "pabrik" },
    { label: "📦 Gudang", value: "gudang" },
    { label: "🏢 Perkantoran", value: "kantor" },
    { label: "🏪 Ruang Usaha", value: "ruang_usaha" },
  ];

  const bedroomOptions = [
    { label: "Bebas", value: "all" },
    { label: "1+", value: "1" },
    { label: "2+", value: "2" },
    { label: "3+", value: "3" },
    { label: "4+", value: "4" },
    { label: "5+", value: "5" },
  ];

  const sortOptions = [
    { label: "Default / Terbaru", value: "all" },
    { label: "📉 Harga Terendah", value: "price_asc" },
    { label: "📈 Harga Tertinggi", value: "price_desc" },
  ];

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const params = new URLSearchParams();
    params.set("view", "global");

    if (keyword.trim()) params.set("q", keyword.trim());
    if (listingType && listingType !== "all") params.set("listing_type", listingType);
    if (propertyType && propertyType !== "all") params.set("property_type", propertyType);

    // Lokasi dikirim sebagai parameter berulang, bukan satu string ber-koma:
    // escapePattern di property.service.ts membuang koma, jadi CSV akan lebur
    // menjadi satu kata kunci yang tidak pernah cocok dengan alamat mana pun.
    //
    // Chip yang hanya punya kota (datang dari "Lihat Semua") tetap dikirim
    // sebagai `city_name` supaya filternya bekerja di level yang benar.
    regions.forEach((region) => {
      if (region.area_name) {
        params.append("district_name", region.area_name);
      } else if (region.city_name) {
        params.set("city_name", region.city_name);
      }
    });

    if (minBuildingArea) params.set("buildingAreaMin", minBuildingArea);
    if (maxBuildingArea) params.set("buildingAreaMax", maxBuildingArea);
    if (minLandArea) params.set("landAreaMin", minLandArea);
    if (maxLandArea) params.set("landAreaMax", maxLandArea);
    if (minPrice) params.set("priceMin", minPrice);
    if (maxPrice) params.set("priceMax", maxPrice);
    if (bedroom && bedroom !== "all") params.set("bedroom", bedroom);
    if (sortBy && sortBy !== "all") params.set("sort", sortBy);

    router.push(`/properties?${params.toString()}`);
  };

  const handleReset = () => {
    setKeyword("");
    setListingType("all");
    setPropertyType("all");
    setRegions([]);
    setMinBuildingArea("");
    setMaxBuildingArea("");
    setMinLandArea("");
    setMaxLandArea("");
    setMinPrice("");
    setMaxPrice("");
    setBedroom("all");
    setSortBy("all");
  };

  return (
    /* Menggunakan 'max-w-lg' (atau 'max-w-md') TANPA 'mx-auto' agar tetap rata kiri */
    <div className="w-full max-w-lg bg-transparent text-white space-y-3 relative z-10">
      <form onSubmit={handleSearch} className="space-y-2">
        {/* KOLOM PENCARIAN */}
        <div className="flex items-center gap-2 h-11 pl-3 pr-1.5 bg-white/95 rounded-xl border border-white/30 shadow-md">
          <Search className="w-4 h-4 text-emerald-600 shrink-0" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari lokasi, nama properti, atau kode listing..."
            className="w-full min-w-0 bg-transparent text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none font-medium"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword("")}
              aria-label="Bersihkan pencarian"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <Button
            type="submit"
            aria-label="Cari Properti"
            className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm shrink-0 cursor-pointer transition-transform active:scale-95"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* TOMBOL FILTER */}
        <div className="flex items-center gap-2">
          {/* POPOVER FILTER */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/95 text-slate-700 text-xs font-semibold px-3.5 h-9 shadow-xs hover:bg-white transition cursor-pointer"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filter</span>
              {/* Jumlah lokasi terpilih ditampilkan di pemicu supaya filter
                  lokasi yang sedang aktif terlihat tanpa membuka panel. */}
              {regions.length > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                  {regions.length}
                </span>
              )}
            </PopoverTrigger>

              {/* `max-h-[80vh]` sebelumnya membuat panel mentok ke tepi atas di
                  halaman /properties: pemicunya duduk jauh lebih rendah di
                  viewport (di bawah header, toggle scope, dan hero), sehingga
                  80% tinggi layar lebih besar daripada ruang yang benar-benar
                  tersisa dan Base UI terpaksa membalik lalu memangkas panel.
                  `--available-height` diisi Base UI pada Positioner dengan
                  ruang nyata di sisi terpilih, jadi panel selalu muat.
                  `align="start"` menjaga panel tidak menggantung keluar layar
                  sempit. */}
              <PopoverContent
                align="start"
                side="bottom"
                sideOffset={8}
                className="w-[92vw] max-w-[580px] p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl border-slate-200 max-h-[var(--available-height)] flex flex-col gap-4 bg-white text-slate-900 z-50"
              >
                <div className="flex items-center justify-between border-b pb-3 shrink-0">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-600" /> Filter Pencarian Properti
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

                {/* Hanya badan panel yang bergulir; judul dan tombol aksi tetap
                    terlihat. `min-h-0` wajib — tanpa itu item flex menolak
                    menyusut di bawah tinggi kontennya dan panel kembali
                    meluber keluar viewport. */}
                <div className="space-y-4 text-xs flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-0.5">
                  {/* 1. Tipe Transaksi */}
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

                  {/* 2. Kategori Properti (Lengkap 11 Kategori) */}
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

                  {/* 3. Lokasi & Kawasan */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> Lokasi & Kawasan
                    </Label>
                    {/* Dua kolom teks bebas "Provinsi" dan "Kota" sebelumnya
                        dikirim apa adanya ke ilike, jadi salah ketik sedikit
                        saja membuat hasilnya nihil. Sekarang nilainya dipilih
                        dari tabel `regions` — sumber yang sama dengan alamat
                        properti saat dibuat — sehingga selalu cocok. */}
                    <RegionMultiSelect value={regions} onChange={setRegions} />
                  </div>

                  {/* 4. Rentang Harga */}
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

                  {/* 5. Luas Bangunan & Luas Tanah */}
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

                  {/* 6. URUTAN HARGA (DITARUH DI BAWAH LUAS BANGUNAN DAN TANAH) */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600" /> Urutkan Berdasarkan
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSortBy(opt.value)}
                          className={cn(
                            "py-2 px-3 rounded-xl font-bold text-xs transition border cursor-pointer text-center flex items-center justify-center gap-1.5",
                            sortBy === opt.value
                              ? "bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-500/30"
                              : "bg-slate-100 border-slate-200 text-slate-600 hover:border-emerald-500/50 hover:text-slate-900"
                          )}
                        >
                          {sortBy === opt.value && <Check className="w-3 h-3" />}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 7. Minimal Kamar Tidur */}
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

                <div className="pt-3 border-t flex items-center justify-end gap-2.5 shrink-0">
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
        </div>
      </form>
    </div>
  );
}