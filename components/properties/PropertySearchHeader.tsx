// components/properties/PropertySearchHeader.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface PropertySearchHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onFilterChange: (filters: any) => void;
  filters: any;
}

export function PropertySearchHeader({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onFilterChange,
  filters,
}: PropertySearchHeaderProps) {
  const router = useRouter();
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [bedroom, setBedroom] = useState("");
  const [bathroom, setBathroom] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSearchSubmit();
  };

  const applyFilters = () => {
    onFilterChange({
      price_min: priceMin ? parseInt(priceMin) : undefined,
      price_max: priceMax ? parseInt(priceMax) : undefined,
      bedroom: bedroom ? parseInt(bedroom) : undefined,
      bathroom: bathroom ? parseInt(bathroom) : undefined,
    });
  };

  const resetFilters = () => {
    setPriceMin("");
    setPriceMax("");
    setBedroom("");
    setBathroom("");
    onFilterChange({
      price_min: undefined,
      price_max: undefined,
      bedroom: undefined,
      bathroom: undefined,
    });
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 dark:from-emerald-900 dark:via-emerald-800 dark:to-emerald-700">
      {/* Decorative glow — depth without clutter */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />

      <div className="container relative mx-auto max-w-7xl px-4 py-8">
        {/* Title row + primary action */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl ring-1 ring-inset ring-white/20 backdrop-blur-sm">
              🏠
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Daftar Properti
              </h1>
              <p className="text-sm text-white/75">
                Kelola semua listing properti Anda di satu tempat
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push("/properties/create")}
            className="h-11 w-full gap-2 rounded-2xl bg-white px-5 font-semibold text-emerald-700 shadow-lg shadow-black/10 transition-all hover:bg-white/90 hover:shadow-xl active:scale-[0.98] md:w-auto"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Tambah Properti
          </Button>
        </div>

        {/* Search row */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari judul, kode, atau lokasi..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded-2xl border-0 bg-white/95 py-6 pl-12 pr-4 text-base shadow-lg placeholder:text-slate-400 dark:bg-slate-900/95"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Select
              value={filters.listing_type || "all"}
              onValueChange={(val) =>
                onFilterChange({ listing_type: val === "all" ? undefined : val })
              }
            >
              <SelectTrigger className="w-[130px] rounded-2xl border-0 bg-white/95 shadow-lg dark:bg-slate-900/95">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="jual">Jual</SelectItem>
                <SelectItem value="sewa">Sewa</SelectItem>
              </SelectContent>
            </Select>

            {/* ✅ SheetTrigger langsung, tanpa Button wrapper */}
            <Sheet>
              <SheetTrigger className="inline-flex items-center justify-center gap-2 rounded-2xl border-0 bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg transition-colors hover:bg-white/90 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800/90">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
              </SheetTrigger>
              <SheetContent className="w-[400px] dark:bg-slate-900 sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Filter Lanjutan</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Harga Min
                      </label>
                      <Input
                        type="number"
                        placeholder="100.000.000"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Harga Max
                      </label>
                      <Input
                        type="number"
                        placeholder="1.000.000.000"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Kamar Tidur
                      </label>
                      <Input
                        type="number"
                        placeholder="3"
                        value={bedroom}
                        onChange={(e) => setBedroom(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Kamar Mandi
                      </label>
                      <Input
                        type="number"
                        placeholder="2"
                        value={bathroom}
                        onChange={(e) => setBathroom(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button onClick={applyFilters} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                      Terapkan Filter
                    </Button>
                    <Button variant="outline" onClick={resetFilters}>
                      Reset
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              onClick={onSearchSubmit}
              className="rounded-2xl bg-white px-6 text-emerald-700 shadow-lg hover:bg-white/90 dark:bg-slate-900 dark:text-emerald-400"
            >
              Cari
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
