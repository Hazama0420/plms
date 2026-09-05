// components/dashboard/DashboardPropertySection.tsx
"use client";

import { Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type DashboardPropertyItem,
} from "./DashboardPropertyCard";
import { PropertyCard } from "@/components/properties/PropertyCard";

export type PropertyCategoryFilter = "semua" | "rumah" | "tanah" | "gudang" | "apartemen" | "ruko";

interface DashboardPropertySectionProps {
  title: string;
  subtitle?: string;
  properties: DashboardPropertyItem[];
  loading?: boolean;
  activeFilter?: PropertyCategoryFilter;
  onFilterChange?: (filter: PropertyCategoryFilter) => void;
  onSeeAll?: () => void;
  onPropertyClick: (propertyId: string) => void;
}

const CATEGORY_TABS: { key: PropertyCategoryFilter; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "rumah", label: "Rumah" },
  { key: "tanah", label: "Tanah" },
  { key: "gudang", label: "Gudang" },
  { key: "apartemen", label: "Apartemen" },
  { key: "ruko", label: "Ruko" },
];

export function DashboardPropertySection({
  title,
  subtitle,
  properties,
  loading = false,
  activeFilter = "semua",
  onFilterChange,
  onSeeAll,
  onPropertyClick,
}: DashboardPropertySectionProps) {
  return (
    <div className="space-y-4">
      {/* Header and Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{title}</span>
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Tabs */}
          {onFilterChange && (
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 overflow-x-auto">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onFilterChange(tab.key)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeFilter === tab.key
                      ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {onSeeAll && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSeeAll}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 h-8 px-2.5 rounded-lg cursor-pointer shrink-0"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-card border border-border/60 space-y-2">
          <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-medium text-muted-foreground">
            Tidak ada properti untuk kategori ini saat ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {properties.map((prop) => (
            <PropertyCard
              key={prop.id}
              variant="dashboard"
              property={prop}
              onClick={() => onPropertyClick(prop.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
