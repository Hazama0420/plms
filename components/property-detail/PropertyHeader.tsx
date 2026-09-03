// components/property-detail/PropertyHeader.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { MapPin, ShieldCheck, Tag } from "lucide-react";

interface PropertyHeaderProps {
  title: string;
  listingCode: string;
  listingType: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  priceFormatted: string;
  pricePerMeter?: string | null;
  location: string;
}

export function PropertyHeader({
  title,
  listingCode,
  listingType,
  statusLabel,
  statusColor,
  statusBg,
  priceFormatted,
  pricePerMeter,
  location,
}: PropertyHeaderProps) {
  const isRent =
    listingType === "sewa" ||
    listingType === "disewa" ||
    listingType === "rent";

  return (
    <div className="space-y-4">
      {/* Top badges & Code */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={`border font-semibold text-xs px-2.5 py-0.5 rounded-lg ${statusColor} ${statusBg}`}
        >
          {statusLabel}
        </Badge>

        <Badge
          variant="secondary"
          className={`font-semibold text-xs px-2.5 py-0.5 rounded-lg ${
            isRent
              ? "bg-amber-600/95 text-white border-amber-600/20"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
          }`}
        >
          <Tag className="w-3 h-3 mr-1 inline" />
          {isRent ? "DISEWAKAN" : "DIJUAL"}
        </Badge>

        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
          {listingCode}
        </span>

        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5" />
          Listing Terverifikasi
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-snug">
        {title}
      </h1>

      {/* Location */}
      <p className="flex items-center gap-1.5 text-sm sm:text-base text-muted-foreground">
        <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>{location}</span>
      </p>

      {/* Price section */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1 border-t border-border/60">
        <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
          {priceFormatted}
        </span>
        {pricePerMeter && (
          <span className="text-xs sm:text-sm text-muted-foreground font-medium">
            ({pricePerMeter})
          </span>
        )}
      </div>
    </div>
  );
}
