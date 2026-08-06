// components/dashboard/RegionMultiSelect.tsx
//
// Pemilih wilayah multi-pilih untuk panel filter katalog.
//
// Sebelumnya panel filter hanya punya dua kolom teks bebas ("Provinsi" dan
// "Kota / Kabupaten"). Mengetik "Tangsel", "Tangerang Sel", atau salah satu
// huruf kapital yang berbeda membuat filternya nihil, karena nilainya langsung
// dikirim ke ilike tanpa pernah dicocokkan dengan data wilayah yang benar.
//
// Sumber datanya tabel `regions` — sama persis dengan yang dipakai
// components/create-property/steps/StepLocation.tsx saat properti dibuat.
// Memakai sumber yang sama menjamin nilai filter selalu identik dengan nilai
// yang tersimpan di property_address, jadi pencocokannya tidak pernah meleset.
//
// Bedanya dengan StepLocation: di sana satu wilayah menimpa wilayah sebelumnya
// (satu properti hanya punya satu alamat), sedangkan di sini pilihan
// diakumulasi supaya pengguna bisa mencari di beberapa area sekaligus.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Satu wilayah terpilih.
 *
 * `area_name` adalah kecamatan/area dan menjadi nilai yang dikirim sebagai
 * filter `district_name`. `city_name` hanya keterangan agar dua kecamatan
 * bernama sama di kota berbeda tetap bisa dibedakan pengguna.
 *
 * `id` bisa negatif untuk chip yang direkonstruksi dari URL: nilai itu tidak
 * pernah dikirim ke basis data, hanya dipakai sebagai key React dan penanda
 * duplikat.
 */
export interface SelectedRegion {
  id: number;
  province_name: string;
  city_name: string;
  area_name: string;
}

interface RegionRow {
  id: number;
  province_name: string | null;
  city_name: string | null;
  area_id: number | null;
  area_name: string | null;
}

interface RegionMultiSelectProps {
  value: SelectedRegion[];
  onChange: (next: SelectedRegion[]) => void;
  className?: string;
}

const REGION_COLUMNS = "id, province_name, city_name, area_id, area_name";

function toRegion(row: RegionRow): SelectedRegion {
  return {
    id: row.id,
    province_name: row.province_name?.trim() || "",
    city_name: row.city_name?.trim() || "",
    area_name: row.area_name?.trim() || "",
  };
}

/** Dua chip dianggap sama bila kecamatan + kotanya sama, bukan bila id-nya sama:
 *  chip hasil rekonstruksi dari URL tidak punya id asli dari tabel regions. */
function sameRegion(a: SelectedRegion, b: SelectedRegion): boolean {
  return (
    a.area_name.toLowerCase() === b.area_name.toLowerCase() &&
    a.city_name.toLowerCase() === b.city_name.toLowerCase()
  );
}

export function RegionMultiSelect({
  value,
  onChange,
  className,
}: RegionMultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SelectedRegion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Klik di luar menutup dropdown. Pola yang sama dipakai StepLocation; di sini
  // penting karena panel filter juga menangkap klik untuk menutup popover.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pencarian ke tabel `regions`, di-debounce 300 ms. Minimal dua karakter
  // supaya satu ketikan tidak menarik ribuan baris.
  useEffect(() => {
    const handler = setTimeout(async () => {
      const keyword = searchQuery.trim();
      if (keyword.length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("regions")
          .select(REGION_COLUMNS)
          .ilike("area_name", `%${keyword}%`)
          .limit(15);

        if (error) {
          console.error("Gagal mencari wilayah:", error.message);
          setSuggestions([]);
          return;
        }

        // Bila tidak ada kecamatan yang cocok, coba nama kota — pengguna sering
        // mengetik "Bogor" atau "Bandung", bukan nama kecamatannya.
        if (!data || data.length === 0) {
          const { data: cityData, error: cityError } = await supabase
            .from("regions")
            .select(REGION_COLUMNS)
            .ilike("city_name", `%${keyword}%`)
            .limit(15);

          if (cityError) {
            console.error("Gagal mencari kota:", cityError.message);
            setSuggestions([]);
            return;
          }

          setSuggestions((cityData ?? []).map(toRegion));
        } else {
          setSuggestions(data.map(toRegion));
        }

        setShowDropdown(true);
      } catch (err) {
        console.error("Gagal melakukan pencarian wilayah:", err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Wilayah yang sudah menjadi chip disembunyikan dari saran, supaya tidak
  // tampak bisa dipilih dua kali.
  const visibleSuggestions = useMemo(
    () =>
      suggestions.filter(
        (item) => !value.some((selected) => sameRegion(selected, item))
      ),
    [suggestions, value]
  );

  const handleSelect = (item: SelectedRegion) => {
    if (!value.some((selected) => sameRegion(selected, item))) {
      onChange([...value, item]);
    }
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleRemove = (item: SelectedRegion) => {
    onChange(value.filter((selected) => !sameRegion(selected, item)));
  };

  return (
    <div ref={containerRef} className={cn("relative space-y-2", className)}>
      {/* Chip wilayah terpilih */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span
              key={`${item.id}-${item.area_name}-${item.city_name}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-1.5 pr-1.5 pl-2.5 text-xs font-semibold text-emerald-800"
            >
              <MapPin className="h-3 w-3 shrink-0 text-emerald-600" />
              <span className="max-w-[9rem] truncate">
                {item.area_name || item.city_name}
              </span>
              {item.city_name && item.area_name && (
                <span className="hidden max-w-[7rem] truncate font-normal text-emerald-600/80 sm:inline">
                  {item.city_name}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                aria-label={`Hapus lokasi ${item.area_name || item.city_name}`}
                className="rounded-full p-0.5 text-emerald-600 transition-colors hover:bg-emerald-200 hover:text-emerald-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Kolom pencarian wilayah */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (visibleSuggestions.length > 0) setShowDropdown(true);
          }}
          placeholder="Cari kecamatan atau kota: BSD, Ciputat, Bogor..."
          className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 text-xs text-slate-900"
        />
        {isSearching && (
          <Loader2 className="absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        Bisa memilih beberapa lokasi sekaligus — hasil pencarian akan mencakup
        semuanya.
      </p>

      {showDropdown && visibleSuggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {visibleSuggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full cursor-pointer border-b border-slate-100 px-3.5 py-2.5 text-left transition-colors last:border-none hover:bg-emerald-50 active:bg-emerald-100"
            >
              <p className="text-xs font-semibold text-slate-800">
                {item.area_name || item.city_name}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {[item.city_name, item.province_name].filter(Boolean).join(" — ")}
              </p>
            </button>
          ))}
        </div>
      )}

      {showDropdown &&
        visibleSuggestions.length === 0 &&
        !isSearching &&
        searchQuery.trim().length >= 2 && (
          <p className="text-[11px] font-medium text-amber-600">
            Wilayah tidak ditemukan. Coba nama kecamatan atau kota lain.
          </p>
        )}
    </div>
  );
}
