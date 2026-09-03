// components/property-detail/PropertySpecsGrid.tsx
"use client";

import {
  Bed,
  Bath,
  Building2,
  Maximize2,
  Zap,
  FileCheck,
  Car,
  Compass,
  Layers,
  Armchair,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

interface PropertySpecsGridProps {
  bedrooms?: number | null;
  bathrooms?: number | null;
  buildingArea?: number | null;
  landArea?: number | null;
  electricity?: number | null;
  certificate?: string | null;
  carport?: number | null;
  floors?: number | null;
  facing?: string | null;
  furnishing?: string | null;
}

export function PropertySpecsGrid({
  bedrooms,
  bathrooms,
  buildingArea,
  landArea,
  electricity,
  certificate,
  carport,
  floors,
  facing,
  furnishing,
}: PropertySpecsGridProps) {
  const { t } = useTranslation();

  const items = [
    bedrooms !== null && bedrooms !== undefined && bedrooms > 0
      ? { label: t("propertyDetail.specs.bedrooms"), value: `${bedrooms} ${t("propertyDetail.specs.rooms")}`, icon: Bed }
      : null,
    bathrooms !== null && bathrooms !== undefined && bathrooms > 0
      ? { label: t("propertyDetail.specs.bathrooms"), value: `${bathrooms} ${t("propertyDetail.specs.spaces")}`, icon: Bath }
      : null,
    buildingArea !== null && buildingArea !== undefined && buildingArea > 0
      ? { label: t("propertyDetail.specs.buildingArea"), value: `${buildingArea} m²`, icon: Building2 }
      : null,
    landArea !== null && landArea !== undefined && landArea > 0
      ? { label: t("propertyDetail.specs.landArea"), value: `${landArea} m²`, icon: Maximize2 }
      : null,
    certificate
      ? { label: t("propertyDetail.specs.legality"), value: certificate, icon: FileCheck }
      : null,
    electricity !== null && electricity !== undefined && electricity > 0
      ? { label: t("propertyDetail.specs.electricity"), value: `${electricity} VA`, icon: Zap }
      : null,
    carport !== null && carport !== undefined && carport > 0
      ? { label: t("propertyDetail.specs.carport"), value: `${carport} ${t("propertyDetail.specs.cars")}`, icon: Car }
      : null,
    floors !== null && floors !== undefined && floors > 0
      ? { label: t("propertyDetail.specs.floors"), value: `${floors} ${t("propertyDetail.specs.floorUnit")}`, icon: Layers }
      : null,
    facing
      ? { label: t("propertyDetail.specs.facing"), value: facing, icon: Compass }
      : null,
    furnishing
      ? { label: t("propertyDetail.specs.furnishing"), value: furnishing, icon: Armchair }
      : null,
  ].filter(Boolean) as { label: string; value: string; icon: React.ElementType }[];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border/40">
      <h2 className="text-lg font-bold text-foreground tracking-tight">
        {t("propertyDetail.mainSpecs")}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex flex-col space-y-1 pb-3 border-b border-border/40">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[10px] uppercase tracking-wider font-semibold">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
