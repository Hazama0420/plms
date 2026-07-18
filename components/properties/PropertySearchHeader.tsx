// components/properties/PropertySearchHeader.tsx
"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
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
    <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-400 dark:from-emerald-800 dark:to-emerald-600">
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
      <div className="container mx-auto px-4 py-8 max-w-7xl relative">
        <h1 className="text-2xl font-bold text-white mb-2">🏠 Daftar Properti</h1>
        <p className="text-white/80 text-sm mb-4">
          Kelola semua listing properti Anda di satu tempat
        </p>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Cari judul, kode, atau lokasi..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-12 pr-4 py-6 bg-white/95 dark:bg-slate-900/95 border-0 rounded-2xl shadow-lg text-base placeholder:text-slate-400"
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
              <SelectTrigger className="w-[130px] bg-white/95 dark:bg-slate-900/95 border-0 rounded-2xl shadow-lg">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="jual">Jual</SelectItem>
                <SelectItem value="sewa">Sewa</SelectItem>
              </SelectContent>
            </Select>

            {/* ✅ FIX: SheetTrigger langsung, tanpa Button wrapper */}
            <Sheet>
              <SheetTrigger className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-lg hover:bg-white/90 dark:bg-slate-900/95 dark:hover:bg-slate-800/90 transition-colors border-0">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] dark:bg-slate-900">
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
              className="bg-white text-emerald-700 hover:bg-white/90 dark:bg-slate-900 dark:text-emerald-400 rounded-2xl shadow-lg px-6"
            >
              Cari
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}