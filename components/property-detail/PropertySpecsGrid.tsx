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
  const items = [
    bedrooms !== null && bedrooms !== undefined && bedrooms > 0
      ? { label: "Kamar Tidur", value: `${bedrooms} Kamar`, icon: Bed }
      : null,
    bathrooms !== null && bathrooms !== undefined && bathrooms > 0
      ? { label: "Kamar Mandi", value: `${bathrooms} Ruang`, icon: Bath }
      : null,
    buildingArea !== null && buildingArea !== undefined && buildingArea > 0
      ? { label: "Luas Bangunan", value: `${buildingArea} m²`, icon: Building2 }
      : null,
    landArea !== null && landArea !== undefined && landArea > 0
      ? { label: "Luas Tanah", value: `${landArea} m²`, icon: Maximize2 }
      : null,
    certificate
      ? { label: "Legalitas / Sertifikat", value: certificate, icon: FileCheck }
      : null,
    electricity !== null && electricity !== undefined && electricity > 0
      ? { label: "Daya Listrik", value: `${electricity} VA`, icon: Zap }
      : null,
    carport !== null && carport !== undefined && carport > 0
      ? { label: "Kapasitas Carport", value: `${carport} Mobil`, icon: Car }
      : null,
    floors !== null && floors !== undefined && floors > 0
      ? { label: "Jumlah Lantai", value: `${floors} Lantai`, icon: Layers }
      : null,
    facing
      ? { label: "Arah Hadap", value: facing, icon: Compass }
      : null,
    furnishing
      ? { label: "Kondisi Perabot", value: furnishing, icon: Armchair }
      : null,
  ].filter(Boolean) as { label: string; value: string; icon: any }[];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border/40">
      <h2 className="text-lg font-bold text-foreground tracking-tight">
        Spesifikasi Utama
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
