// components/dashboard/DashboardPropertyCard.tsx
"use client";

import React from "react";
import { PropertyCard, type CanonicalPropertyItem } from "@/components/properties/PropertyCard";

/**
 * @deprecated Use `PropertyCard` with `variant="dashboard"` directly from `@/components/properties/PropertyCard`.
 */
export interface DashboardPropertyItem {
  id: string;
  title: string;
  listing_code: string;
  listing_type: string;
  category: string;
  price: number | null;
  location: string;
  bedrooms: number | null;
  bathrooms: number | null;
  building_area: number | null;
  land_area: number | null;
  thumbnail: string;
  agent_name: string;
  agent_avatar: string | null;
  agent_phone: string | null;
  slug?: string;
}

export interface DashboardPropertyCardProps {
  property: DashboardPropertyItem;
  featured?: boolean;
  compact?: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * @deprecated Use `<PropertyCard variant="dashboard" property={prop} onClick={...} />` instead.
 * This adapter guarantees backward compatibility during Phase 6 migration.
 */
export function DashboardPropertyCard({
  property,
  featured = false,
  compact = false,
  onClick,
  className,
}: DashboardPropertyCardProps) {
  return (
    <PropertyCard
      variant={compact ? "compact" : "dashboard"}
      property={property as CanonicalPropertyItem}
      featured={featured}
      onClick={onClick}
      className={className}
    />
  );
}
