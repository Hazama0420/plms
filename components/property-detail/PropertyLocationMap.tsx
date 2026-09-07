// components/property-detail/PropertyLocationMap.tsx
"use client";

import { MapPin, ExternalLink } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

interface PropertyLocationMapProps {
  addressFormatted: string;
  district?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function PropertyLocationMap({
  addressFormatted,
  district,
  city,
  province,
  postalCode,
  latitude,
  longitude,
}: PropertyLocationMapProps) {
  const { t } = useTranslation();
  const hasCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    latitude !== 0 &&
    longitude !== 0;

  const mapsQuery = hasCoordinates
    ? `${latitude},${longitude}`
    : encodeURIComponent(addressFormatted);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>{t("propertyDetail.location.title")}</span>
        </h2>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          <span>{t("propertyDetail.location.openInMaps")}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/70 space-y-4">
        <p className="text-sm font-medium text-foreground leading-relaxed">
          {addressFormatted}
        </p>

        {/* Structured address badges */}
        <div className="flex flex-wrap gap-2 text-xs">
          {district && (
            <span className="px-2.5 py-1 rounded-lg bg-background border border-border/60 text-muted-foreground font-medium">
              {t("propertyDetail.location.district")} <b className="text-foreground">{district}</b>
            </span>
          )}
          {city && (
            <span className="px-2.5 py-1 rounded-lg bg-background border border-border/60 text-muted-foreground font-medium">
              {t("propertyDetail.location.city")} <b className="text-foreground">{city}</b>
            </span>
          )}
          {province && (
            <span className="px-2.5 py-1 rounded-lg bg-background border border-border/60 text-muted-foreground font-medium">
              {t("propertyDetail.location.province")} <b className="text-foreground">{province}</b>
            </span>
          )}
          {postalCode && (
            <span className="px-2.5 py-1 rounded-lg bg-background border border-border/60 text-muted-foreground font-medium">
              {t("propertyDetail.location.postalCode")} <b className="text-foreground">{postalCode}</b>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
