"use client";

import { useMemo, useState } from "react";
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
  ChevronDown,
  Home,
  Trees,
  Warehouse,
  Landmark,
  Sparkles,
  Loader2,
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

function readRegionsFromParams(
  params: URLSearchParams
): SelectedRegion[] {
  const result: SelectedRegion[] = [];

  params.getAll("district_name").forEach(
    (name, index) => {
      const area = name.trim();

      if (!area) return;

      result.push({
        id: -(index + 1),
        province_name: "",
        city_name: "",
        area_name: area,
      });
    }
  );

  const city = (
    params.get("city_name") ?? ""
  ).trim();

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

const PROPERTY_CATEGORIES = [
  { label: "Semua", value: "all" },
  { label: "Rumah", value: "rumah" },
  { label: "Apartemen", value: "apartemen" },
  { label: "Tanah", value: "tanah" },
  { label: "Ruko", value: "ruko" },
  { label: "Kost", value: "kost" },
  { label: "Villa", value: "villa" },
  { label: "Hotel", value: "hotel" },
  { label: "Pabrik", value: "pabrik" },
  { label: "Gudang", value: "gudang" },
  { label: "Perkantoran", value: "kantor" },
  {
    label: "Ruang Usaha",
    value: "ruang_usaha",
  },
] as const;

const QUICK_CATEGORIES = [
  {
    label: "Rumah",
    value: "rumah",
    icon: Home,
  },
  {
    label: "Tanah",
    value: "tanah",
    icon: Trees,
  },
  {
    label: "Ruko",
    value: "ruko",
    icon: Landmark,
  },
  {
    label: "Gudang",
    value: "gudang",
    icon: Warehouse,
  },
] as const;

const BEDROOM_OPTIONS = [
  { label: "Bebas", value: "all" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
  { label: "5+", value: "5" },
] as const;

const SORT_OPTIONS = [
  { label: "Terbaru", value: "all" },
  {
    label: "Harga Terendah",
    value: "price_asc",
  },
  {
    label: "Harga Tertinggi",
    value: "price_desc",
  },
] as const;

export function DashboardPropertySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filterOpen, setFilterOpen] =
    useState(false);
  const [searching, setSearching] =
    useState(false);

  const initial = (
    key: string,
    fallback = ""
  ) => searchParams.get(key) ?? fallback;

  const [keyword, setKeyword] = useState(
    initial("q")
  );

  const [listingType, setListingType] =
    useState(
      initial("listing_type", "all")
    );

  const [propertyType, setPropertyType] =
    useState(
      initial("property_type", "all")
    );

  const [regions, setRegions] =
    useState<SelectedRegion[]>(() =>
      readRegionsFromParams(searchParams)
    );

  const [minBuildingArea, setMinBuildingArea] =
    useState(initial("buildingAreaMin"));

  const [maxBuildingArea, setMaxBuildingArea] =
    useState(initial("buildingAreaMax"));

  const [minLandArea, setMinLandArea] =
    useState(initial("landAreaMin"));

  const [maxLandArea, setMaxLandArea] =
    useState(initial("landAreaMax"));

  const [minPrice, setMinPrice] =
    useState(initial("priceMin"));

  const [maxPrice, setMaxPrice] =
    useState(initial("priceMax"));

  const [bedroom, setBedroom] =
    useState(
      initial("bedroom", "all")
    );

  const [sortBy, setSortBy] =
    useState(
      initial("sort", "all")
    );

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (listingType !== "all") {
      count += 1;
    }

    if (propertyType !== "all") {
      count += 1;
    }

    if (regions.length > 0) {
      count += regions.length;
    }

    if (minBuildingArea) count += 1;
    if (maxBuildingArea) count += 1;
    if (minLandArea) count += 1;
    if (maxLandArea) count += 1;
    if (minPrice) count += 1;
    if (maxPrice) count += 1;

    if (bedroom !== "all") {
      count += 1;
    }

    if (sortBy !== "all") {
      count += 1;
    }

    return count;
  }, [
    listingType,
    propertyType,
    regions,
    minBuildingArea,
    maxBuildingArea,
    minLandArea,
    maxLandArea,
    minPrice,
    maxPrice,
    bedroom,
    sortBy,
  ]);

  const selectedCategoryLabel =
    PROPERTY_CATEGORIES.find(
      (item) =>
        item.value === propertyType
    )?.label;

  const selectedRegionLabel =
    regions.length === 1
      ? regions[0].area_name ||
        regions[0].city_name
      : regions.length > 1
        ? `${regions.length} lokasi`
        : null;

  const buildSearchUrl = () => {
    const params = new URLSearchParams();

    params.set("view", "global");

    if (keyword.trim()) {
      params.set("q", keyword.trim());
    }

    if (listingType !== "all") {
      params.set(
        "listing_type",
        listingType
      );
    }

    if (propertyType !== "all") {
      params.set(
        "property_type",
        propertyType
      );
    }

    regions.forEach((region) => {
      if (region.area_name) {
        params.append(
          "district_name",
          region.area_name
        );
      } else if (region.city_name) {
        params.set(
          "city_name",
          region.city_name
        );
      }
    });

    if (minBuildingArea) {
      params.set(
        "buildingAreaMin",
        minBuildingArea
      );
    }

    if (maxBuildingArea) {
      params.set(
        "buildingAreaMax",
        maxBuildingArea
      );
    }

    if (minLandArea) {
      params.set(
        "landAreaMin",
        minLandArea
      );
    }

    if (maxLandArea) {
      params.set(
        "landAreaMax",
        maxLandArea
      );
    }

    if (minPrice) {
      params.set(
        "priceMin",
        minPrice
      );
    }

    if (maxPrice) {
      params.set(
        "priceMax",
        maxPrice
      );
    }

    if (bedroom !== "all") {
      params.set(
        "bedroom",
        bedroom
      );
    }

    if (sortBy !== "all") {
      params.set(
        "sort",
        sortBy
      );
    }

    return `/properties?${params.toString()}`;
  };

  const handleSearch = (
    event?: React.FormEvent
  ) => {
    event?.preventDefault();

    setSearching(true);

    router.push(buildSearchUrl());

    window.setTimeout(() => {
      setSearching(false);
    }, 350);
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

  const handleQuickCategory = (
    value: string
  ) => {
    setPropertyType((current) =>
      current === value ? "all" : value
    );
  };

  return (
    <div className="relative w-full z-20">
      <form
        onSubmit={handleSearch}
        className="w-full flex flex-col items-center gap-4 sm:gap-6"
      >
        {/* ======================================================
            MAIN SEARCH BAR (Translucent Pill)
        ======================================================= */}
        <div
          className={cn(
            "relative w-full flex items-center bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden transition-all border border-white/20 text-white",
            filterOpen ? "ring-2 ring-emerald-500/50" : "",
            "focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:bg-white/20"
          )}
        >
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center text-emerald-100">
            <Search className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
          </div>

          <div className="min-w-0 flex-1 px-1">
            <p className="hidden sm:block mb-0.5 mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-100/70">
              Cari Properti
            </p>

            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Lokasi, nama, atau kode..."
              className="w-full h-full bg-transparent text-[13px] sm:text-[15px] font-semibold text-white outline-none placeholder:text-emerald-100/50"
            />
          </div>

          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword("")}
              aria-label="Hapus pencarian"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-emerald-100/70 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <Button
            type="submit"
            disabled={searching}
            className="h-9 sm:h-10 mx-1.5 sm:mx-2 px-4 sm:px-6 rounded-[10px] sm:rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] sm:text-xs transition-all shadow-sm"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Cari"
            )}
          </Button>
        </div>

        {/* ======================================================
            CONTROLS ROW (Translucent Pills)
        ======================================================= */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
          {/* FILTER POPOVER */}
          <Popover
            open={filterOpen}
            onOpenChange={setFilterOpen}
          >
            <PopoverTrigger
              type="button"
              className={cn(
                "flex h-9 sm:h-10 items-center justify-center gap-2 px-4 sm:px-5 rounded-full border backdrop-blur-md transition-all text-xs sm:text-sm font-bold shadow-sm",
                filterOpen || activeFilterCount > 0
                  ? "bg-emerald-500 border-emerald-400 text-emerald-950"
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Filter Lanjut</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-4 sm:h-5 sm:min-w-5 items-center justify-center rounded-full bg-emerald-950 px-1 text-[9px] sm:text-[10px] font-black text-emerald-100">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  filterOpen && "rotate-180"
                )}
              />
            </PopoverTrigger>


            <PopoverContent
              align="center"
              side="bottom"
              sideOffset={12}
              className="z-50 w-[min(620px,calc(100vw-24px))] rounded-[24px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0 text-slate-900 dark:text-slate-100 shadow-2xl"
            >
              <FilterPanel
                onClose={() => setFilterOpen(false)}
                handleReset={handleReset}
                handleSearch={handleSearch}
                listingType={listingType}
                setListingType={setListingType}
                propertyType={propertyType}
                setPropertyType={setPropertyType}
                regions={regions}
                setRegions={setRegions}
                minBuildingArea={minBuildingArea}
                setMinBuildingArea={setMinBuildingArea}
                maxBuildingArea={maxBuildingArea}
                setMaxBuildingArea={setMaxBuildingArea}
                minLandArea={minLandArea}
                setMinLandArea={setMinLandArea}
                maxLandArea={maxLandArea}
                setMaxLandArea={setMaxLandArea}
                minPrice={minPrice}
                setMinPrice={setMinPrice}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
                bedroom={bedroom}
                setBedroom={setBedroom}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </PopoverContent>
          </Popover>

          {/* QUICK CATEGORIES (Now shown as pills) */}
          {QUICK_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleQuickCategory(cat.value)}
              className={cn(
                "flex h-9 sm:h-10 items-center justify-center gap-1.5 px-4 rounded-full border backdrop-blur-md transition-all text-xs sm:text-sm font-bold shadow-sm",
                propertyType === cat.value
                  ? "bg-emerald-500 border-emerald-400 text-emerald-950"
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"
              )}
            >
              <cat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* ======================================================
            ACTIVE FILTERS
        ======================================================= */}
        {(selectedCategoryLabel || selectedRegionLabel || listingType !== "all") && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 w-full">
            <span className="text-[10px] font-medium text-emerald-100/70">
              Aktif:
            </span>

            {propertyType !== "all" && selectedCategoryLabel && (
                <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                  {selectedCategoryLabel}
                </span>
              )}

            {selectedRegionLabel && (
              <span className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                <MapPin className="h-3 w-3 text-emerald-300" />
                {selectedRegionLabel}
              </span>
            )}

            {listingType !== "all" && (
              <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                {listingType === "jual" ? "Dijual" : "Disewakan"}
              </span>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="ml-1 text-[10px] font-bold text-rose-400 hover:text-rose-300"
            >
              Reset
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

/* =========================================================
   FILTER PANEL
========================================================= */

interface FilterPanelProps {
  onClose: () => void;
  handleReset: () => void;
  handleSearch: (
    event?: React.FormEvent
  ) => void;

  listingType: string;
  setListingType: (
    value: string
  ) => void;

  propertyType: string;
  setPropertyType: (
    value: string
  ) => void;

  regions: SelectedRegion[];
  setRegions: (
    value: SelectedRegion[]
  ) => void;

  minBuildingArea: string;
  setMinBuildingArea: (
    value: string
  ) => void;

  maxBuildingArea: string;
  setMaxBuildingArea: (
    value: string
  ) => void;

  minLandArea: string;
  setMinLandArea: (
    value: string
  ) => void;

  maxLandArea: string;
  setMaxLandArea: (
    value: string
  ) => void;

  minPrice: string;
  setMinPrice: (
    value: string
  ) => void;

  maxPrice: string;
  setMaxPrice: (
    value: string
  ) => void;

  bedroom: string;
  setBedroom: (
    value: string
  ) => void;

  sortBy: string;
  setSortBy: (
    value: string
  ) => void;
}

function FilterPanel({
  onClose,
  handleReset,
  handleSearch,
  listingType,
  setListingType,
  propertyType,
  setPropertyType,
  regions,
  setRegions,
  minBuildingArea,
  setMinBuildingArea,
  maxBuildingArea,
  setMaxBuildingArea,
  minLandArea,
  setMinLandArea,
  maxLandArea,
  setMaxLandArea,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  bedroom,
  setBedroom,
  sortBy,
  setSortBy,
}: FilterPanelProps) {
  return (
    <div className="flex max-h-[min(760px,calc(100vh-32px))] flex-col">
      {/* HEADER */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 px-5 py-4 sm:px-6">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600">
            Filter Properti
          </p>

          <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
            Temukan yang sesuai kebutuhan
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 rounded-lg px-2.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup filter"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 scrollbar-thin">
        <div className="space-y-5">
          {/* TRANSACTION */}
          <FilterGroup
            icon={
              <Tag className="h-3.5 w-3.5" />
            }
            title="Tipe Transaksi"
          >
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: "Semua",
                  value: "all",
                },
                {
                  label: "Dijual",
                  value: "jual",
                },
                {
                  label: "Disewakan",
                  value: "sewa",
                },
              ].map((item) => {
                const active =
                  listingType ===
                  item.value;

                return (
                  <ChoiceButton
                    key={item.value}
                    active={active}
                    onClick={() =>
                      setListingType(
                        item.value
                      )
                    }
                  >
                    {item.label}
                  </ChoiceButton>
                );
              })}
            </div>
          </FilterGroup>

          {/* PROPERTY TYPE */}
          <FilterGroup
            icon={
              <Building2 className="h-3.5 w-3.5" />
            }
            title="Kategori Properti"
          >
            <div className="flex flex-wrap gap-2">
              {PROPERTY_CATEGORIES.map(
                (category) => {
                  const active =
                    propertyType ===
                    category.value;

                  return (
                    <ChoiceButton
                      key={
                        category.value
                      }
                      active={active}
                      onClick={() =>
                        setPropertyType(
                          category.value
                        )
                      }
                    >
                      {category.label}
                    </ChoiceButton>
                  );
                }
              )}
            </div>
          </FilterGroup>

          {/* LOCATION */}
          <FilterGroup
            icon={
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
            }
            title="Lokasi & Kawasan"
          >
            <RegionMultiSelect
              value={regions}
              onChange={setRegions}
            />
          </FilterGroup>

          {/* PRICE */}
          <FilterGroup
            title="Rentang Harga"
          >
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                type="number"
                placeholder="Harga minimal"
                value={minPrice}
                onChange={(event) =>
                  setMinPrice(
                    event.target.value
                  )
                }
                className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />

              <Input
                type="number"
                placeholder="Harga maksimal"
                value={maxPrice}
                onChange={(event) =>
                  setMaxPrice(
                    event.target.value
                  )
                }
                className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>
          </FilterGroup>

          {/* AREA */}
          <div className="grid gap-5 sm:grid-cols-2">
            <FilterGroup title="Luas Bangunan">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min m²"
                  value={
                    minBuildingArea
                  }
                  onChange={(event) =>
                    setMinBuildingArea(
                      event.target.value
                    )
                  }
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />

                <Input
                  type="number"
                  placeholder="Max m²"
                  value={
                    maxBuildingArea
                  }
                  onChange={(event) =>
                    setMaxBuildingArea(
                      event.target.value
                    )
                  }
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </FilterGroup>

            <FilterGroup title="Luas Tanah">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min m²"
                  value={
                    minLandArea
                  }
                  onChange={(event) =>
                    setMinLandArea(
                      event.target.value
                    )
                  }
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />

                <Input
                  type="number"
                  placeholder="Max m²"
                  value={
                    maxLandArea
                  }
                  onChange={(event) =>
                    setMaxLandArea(
                      event.target.value
                    )
                  }
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </FilterGroup>
          </div>

          {/* SORT */}
          <FilterGroup
            icon={
              <ArrowUpDown className="h-3.5 w-3.5" />
            }
            title="Urutkan Berdasarkan"
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {SORT_OPTIONS.map(
                (option) => {
                  const active =
                    sortBy ===
                    option.value;

                  return (
                    <ChoiceButton
                      key={
                        option.value
                      }
                      active={active}
                      onClick={() =>
                        setSortBy(
                          option.value
                        )
                      }
                    >
                      {option.label}
                    </ChoiceButton>
                  );
                }
              )}
            </div>
          </FilterGroup>

          {/* BEDROOM */}
          <FilterGroup
            icon={
              <BedDouble className="h-3.5 w-3.5" />
            }
            title="Minimal Kamar Tidur"
          >
            <div className="grid grid-cols-6 gap-2">
              {BEDROOM_OPTIONS.map(
                (option) => {
                  const active =
                    bedroom ===
                    option.value;

                  return (
                    <ChoiceButton
                      key={
                        option.value
                      }
                      active={active}
                      onClick={() =>
                        setBedroom(
                          option.value
                        )
                      }
                      className="px-1"
                    >
                      {
                        option.label
                      }
                    </ChoiceButton>
                  );
                }
              )}
            </div>
          </FilterGroup>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 px-5 py-3.5 sm:px-6">
        <p className="hidden text-[10px] text-slate-500 dark:text-slate-400 sm:block">
          Sesuaikan filter lalu cari properti.
        </p>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-xs font-semibold"
          >
            Batal
          </Button>

          <Button
            type="button"
            onClick={() => {
              onClose();
              handleSearch();
            }}
            className="h-10 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            Terapkan & Cari
            <Search className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL UI HELPERS
========================================================= */

function FilterGroup({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <Label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
        {icon}
        {title}
      </Label>

      {children}
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all",
        active
          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400",
        className
      )}
    >
      {active && (
        <Check className="mr-1 inline h-3 w-3" />
      )}

      {children}
    </button>
  );
}