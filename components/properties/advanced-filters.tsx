// components/properties/advanced-filters.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Filter, SlidersHorizontal, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ✅ Tipe lokal (karena import dari @/types/property.types mungkin tidak ada)
interface AdvancedFilter {
  priceMin?: number | null;
  priceMax?: number | null;
  landAreaMin?: number | null;
  landAreaMax?: number | null;
  buildingAreaMin?: number | null;
  buildingAreaMax?: number | null;
  bedroom?: number | null;
  bathroom?: number | null;
  city_id?: string | null;
  property_type?: string | null;
  year_built?: number | null;
  certificate?: string | null;
  furnishing?: string | null;
}

// Property types options
const PROPERTY_TYPES = [
  { value: "rumah", label: "🏠 Rumah" },
  { value: "apartemen", label: "🏢 Apartemen" },
  { value: "tanah", label: "🌿 Tanah" },
  { value: "villa", label: "🏖️ Villa" },
  { value: "ruko", label: "🏪 Ruko" },
  { value: "kantor", label: "🏢 Kantor" },
  { value: "pabrik", label: "🏭 Pabrik" },
  { value: "gudang", label: "📦 Gudang" },
  { value: "hotel", label: "🏨 Hotel" },
  { value: "ruang_usaha", label: "🏪 Ruang Usaha" },
];

const BEDROOM_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

const BATHROOM_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];

const YEAR_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "2020", label: "2020+" },
  { value: "2015", label: "2015+" },
  { value: "2010", label: "2010+" },
  { value: "2005", label: "2005+" },
  { value: "2000", label: "2000+" },
];

const CERTIFICATE_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "SHM", label: "SHM" },
  { value: "HGB", label: "HGB" },
  { value: "SHGB", label: "SHGB" },
  { value: "Strata", label: "Strata Title" },
];

const FURNISHING_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi_furnished", label: "Semi Furnished" },
  { value: "fully_furnished", label: "Fully Furnished" },
];

interface AdvancedFiltersProps {
  filters: AdvancedFilter;
  onApply: (filters: AdvancedFilter) => void;
  onReset: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function AdvancedFilters({
  filters,
  onApply,
  onReset,
  children,
  className,
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<AdvancedFilter>(filters);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Load cities for dropdown
  useEffect(() => {
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const { data } = await supabase
          .from("cities")
          .select("id, name")
          .order("name");
        setCities(data || []);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, []);

  // Sync local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleChange = (key: keyof AdvancedFilter, value: any) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value || null }));
  };

  const handleRangeChange = (key: keyof AdvancedFilter, value: string) => {
    const num = value ? parseFloat(value) : null;
    handleChange(key, num);
  };

  const handleApply = () => {
    onApply(localFilters);
    setOpen(false);
  };

  const handleReset = () => {
    const empty: AdvancedFilter = {
      priceMin: null,
      priceMax: null,
      bedroom: null,
      bathroom: null,
      landAreaMin: null,
      landAreaMax: null,
      buildingAreaMin: null,
      buildingAreaMax: null,
      city_id: null,
      property_type: null,
      year_built: null,
      certificate: null,
      furnishing: null,
    };
    setLocalFilters(empty);
    onReset();
    setOpen(false);
  };

  // Count active filters
  const activeFilterCount = Object.values(localFilters).filter(
    (v) => v !== null && v !== undefined && v !== ""
  ).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* ✅ FIX: tanpa asChild, styling langsung di DialogTrigger */}
      <DialogTrigger
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 relative gap-2 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700",
          className
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filter Lanjutan
        {activeFilterCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] min-w-[20px]"
          >
            {activeFilterCount}
          </Badge>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-5 w-5 text-blue-500" />
            Filter Lanjutan
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            {/* Harga */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground">
                💰 Harga
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={localFilters.priceMin ?? ""}
                    onChange={(e) => handleRangeChange("priceMin", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Max (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="10M"
                    value={localFilters.priceMax ?? ""}
                    onChange={(e) => handleRangeChange("priceMax", e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Luas Tanah */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground">
                📐 Luas Tanah (m²)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={localFilters.landAreaMin ?? ""}
                    onChange={(e) => handleRangeChange("landAreaMin", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={localFilters.landAreaMax ?? ""}
                    onChange={(e) => handleRangeChange("landAreaMax", e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Luas Bangunan */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground">
                🏗️ Luas Bangunan (m²)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={localFilters.buildingAreaMin ?? ""}
                    onChange={(e) => handleRangeChange("buildingAreaMin", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={localFilters.buildingAreaMax ?? ""}
                    onChange={(e) => handleRangeChange("buildingAreaMax", e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Spesifikasi */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground">
                🛏️ Spesifikasi
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Kamar Tidur</Label>
                  <Select
                    value={localFilters.bedroom?.toString() ?? ""}
                    onValueChange={(val) => handleChange("bedroom", val ? parseInt(val) : null)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      {BEDROOM_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Kamar Mandi</Label>
                  <Select
                    value={localFilters.bathroom?.toString() ?? ""}
                    onValueChange={(val) => handleChange("bathroom", val ? parseInt(val) : null)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      {BATHROOM_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tipe & Lokasi */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground">
                📍 Tipe & Lokasi
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tipe Properti</Label>
                  <Select
                    value={localFilters.property_type ?? ""}
                    onValueChange={(val) => handleChange("property_type", val || null)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Semua</SelectItem>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Kota</Label>
                  <Select
                    value={localFilters.city_id ?? ""}
                    onValueChange={(val) => handleChange("city_id", val || null)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Semua kota" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Semua Kota</SelectItem>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Lainnya */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground">
                🔧 Lainnya
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tahun Bangun</Label>
                  <Select
                    value={localFilters.year_built?.toString() ?? ""}
                    onValueChange={(val) => handleChange("year_built", val ? parseInt(val) : null)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Sertifikat</Label>
                  <Select
                    value={localFilters.certificate ?? ""}
                    onValueChange={(val) => handleChange("certificate", val || null)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      {CERTIFICATE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Furnishing</Label>
                  <Select
                    value={localFilters.furnishing ?? ""}
                    onValueChange={(val) => handleChange("furnishing", val || null)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      {FURNISHING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex-shrink-0 pt-4 border-t flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700">
              Terapkan Filter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}