// components/property-detail/PropertyDescription.tsx
"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertyDescriptionProps {
  description?: string | null;
  sellingPoints?: string | null;
  buildingDetails?: {
    foundation?: string | null;
    structure?: string | null;
    walls?: string | null;
    roof?: string | null;
    flooring?: string | null;
    sanitary?: string | null;
    waterSource?: string | null;
  } | null;
}

// Sensor Nomor HP di Deskripsi agar aman
const maskPhoneNumbers = (text?: string | null): string => {
  if (!text) return "Belum ada deskripsi rinci untuk properti ini.";
  const phoneRegex = /(?:\+?62|0)8[1-9][0-9\-\s]{6,12}/g;
  return text.replace(phoneRegex, "xxxxxx");
};

export function PropertyDescription({
  description,
  sellingPoints,
  buildingDetails,
}: PropertyDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const cleanDescription = maskPhoneNumbers(description);
  const isLongText = cleanDescription.length > 350;

  // Pisahkan selling points bila dipisahkan baris baru / koma / bullet
  const pointsList = sellingPoints
    ? sellingPoints
        .split(/\r?\n|•|\*/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];

  const hasBuildingSpecs =
    buildingDetails &&
    Object.values(buildingDetails).some((val) => Boolean(val && val.trim() !== ""));

  return (
    <div className="space-y-6">
      {/* Selling Points Highlight if present */}
      {pointsList.length > 0 && (
        <div className="pt-4 border-t border-border/40 space-y-3">
          <div className="flex items-center gap-2 text-foreground tracking-tight font-bold text-lg">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Keunggulan Utama</span>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-foreground/90 font-medium">
            {pointsList.map((pt, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Description */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <h2 className="text-lg font-bold text-foreground tracking-tight">
          Deskripsi Properti
        </h2>

        <div className="relative">
          <p
            className={`text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line font-normal ${
              !isExpanded && isLongText ? "line-clamp-4" : ""
            }`}
          >
            {cleanDescription}
          </p>

          {!isExpanded && isLongText && (
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          )}
        </div>

        {isLongText && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 h-8 px-2 font-semibold"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 mr-1" />
                Tampilkan Lebih Sedikit
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 mr-1" />
                Baca Selengkapnya
              </>
            )}
          </Button>
        )}
      </div>

      {/* Building Structure & Material Specs if present */}
      {hasBuildingSpecs && buildingDetails && (
        <div className="space-y-4 pt-4 border-t border-border/40">
          <h3 className="text-lg font-bold text-foreground tracking-tight">
            Material & Konstruksi Bangunan
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            {buildingDetails.foundation && (
              <div className="flex flex-col space-y-1 pb-3 border-b border-border/40">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">Pondasi</span>
                <span className="font-semibold text-foreground">{buildingDetails.foundation}</span>
              </div>
            )}
            {buildingDetails.walls && (
              <div className="flex flex-col space-y-1 pb-3 border-b border-border/40">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">Dinding</span>
                <span className="font-semibold text-foreground">{buildingDetails.walls}</span>
              </div>
            )}
            {buildingDetails.roof && (
              <div className="flex flex-col space-y-1 pb-3 border-b border-border/40">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">Rangka Atap / Genteng</span>
                <span className="font-semibold text-foreground">{buildingDetails.roof}</span>
              </div>
            )}
            {buildingDetails.flooring && (
              <div className="flex flex-col space-y-1 pb-3 border-b border-border/40">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">Lantai</span>
                <span className="font-semibold text-foreground">{buildingDetails.flooring}</span>
              </div>
            )}
            {buildingDetails.sanitary && (
              <div className="flex flex-col space-y-1 pb-3 border-b border-border/40">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">Sanitair</span>
                <span className="font-semibold text-foreground">{buildingDetails.sanitary}</span>
              </div>
            )}
            {buildingDetails.waterSource && (
              <div className="flex flex-col space-y-1 pb-3 border-b border-border/40">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">Sumber Air</span>
                <span className="font-semibold text-foreground">{buildingDetails.waterSource}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
