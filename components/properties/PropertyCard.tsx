"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WatermarkedImage } from "@/components/ui/WatermarkedImage";
import {
  Star,
  MoreVertical,
  Edit,
  Trash2,
  Bed,
  Bath,
  Building2,
  Maximize2,
  MapPin,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface CanonicalPropertyItem {
  id: string;
  title: string;
  listing_code?: string;
  listing_type?: "jual" | "sewa" | "sale" | "rent" | string;
  property_type?: string;
  category?: string;
  status?: string;
  price?: number | null;
  location?: string;
  land_area?: number | null;
  building_area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  thumbnail?: string;
  uploader_name?: string;
  uploader_avatar?: string | null;
  agent_name?: string;
  agent_avatar?: string | null;
  agent_phone?: string | null;
  is_featured?: boolean;
  slug?: string;
}

export interface PropertyCardProps {
  prop?: CanonicalPropertyItem;
  property?: CanonicalPropertyItem; // Backward compatibility alias
  variant?: "catalog" | "dashboard" | "manage" | "compact";
  isSuperAdmin?: boolean;
  isGuestOrViewer?: boolean;
  featured?: boolean;
  onToggleFeatured?: (prop: any, e: React.MouseEvent) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onClick?: (prop?: any) => void;
  onEdit?: (id: string) => void;
  className?: string;
}

export function PropertyCard({
  prop: propInput,
  property: propertyInput,
  variant = "catalog",
  isSuperAdmin = false,
  isGuestOrViewer = false,
  featured = false,
  onToggleFeatured,
  onDelete,
  onClick,
  onEdit,
  className,
}: PropertyCardProps) {
  // Normalize item from either prop or property prop
  const item = (propInput || propertyInput || {}) as CanonicalPropertyItem;

  const isRent =
    item.listing_type === "sewa" ||
    item.listing_type === "disewa" ||
    item.listing_type === "rent";

  const categoryName = item.property_type || item.category || "Properti";
  const agentName = item.uploader_name || item.agent_name || "Inland Agent";
  const agentAvatar = item.uploader_avatar || item.agent_avatar || null;
  const isCardFeatured = featured || item.is_featured || false;

  const formatCurrency = (val?: number | null) => {
    if (val == null || val === 0) return "Hubungi Agen";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const specs = [
    item.bedrooms != null && item.bedrooms > 0
      ? { key: "bed", icon: Bed, label: `${item.bedrooms} KT` }
      : null,
    item.bathrooms != null && item.bathrooms > 0
      ? { key: "bath", icon: Bath, label: `${item.bathrooms} KM` }
      : null,
    item.building_area != null && item.building_area > 0
      ? { key: "bld", icon: Building2, label: `LB ${item.building_area}m²` }
      : null,
    item.land_area != null && item.land_area > 0
      ? { key: "lnd", icon: Maximize2, label: `LT ${item.land_area}m²` }
      : null,
  ].filter(Boolean) as { key: string; icon: any; label: string }[];

  const showManagementMenu =
    (variant === "manage" || (!isGuestOrViewer && onEdit && onDelete)) &&
    onEdit &&
    onDelete;

  // --------------------------------------------------------------------------
  // VARIANT: COMPACT (Horizontal Row for CRM / Invoices / Search Dialogs)
  // --------------------------------------------------------------------------
  if (variant === "compact") {
    return (
      <Card
        onClick={() => onClick && onClick(item)}
        className={cn(
          "p-2.5 group relative flex flex-row items-center gap-3 overflow-hidden cursor-pointer",
          "bg-card hover:bg-muted/40 transition-all duration-200 border border-border/80 rounded-xl",
          className
        )}
      >
        {/* 16:9 Thumbnail */}
        <div className="relative w-24 sm:w-28 shrink-0 aspect-[16/9] rounded-lg overflow-hidden bg-muted">
          <WatermarkedImage
            src={item.thumbnail || ""}
            alt={item.title || "Property"}
            className="w-full h-full object-cover"
            watermarkSize="w-2/5"
            watermarkOpacity={0.5}
          />
          <div className="absolute top-1 left-1">
            <span
              className={cn(
                "text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider text-white rounded shadow-xs",
                isRent ? "bg-amber-600" : "bg-emerald-600"
              )}
            >
              {isRent ? "SEWA" : "JUAL"}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {item.listing_code && (
              <Badge variant="metadata" className="text-[9px] px-1 py-0">
                {item.listing_code}
              </Badge>
            )}
            <span className="text-[10px] font-semibold text-muted-foreground uppercase truncate">
              {categoryName}
            </span>
          </div>
          <h4 className="font-bold text-xs text-foreground truncate leading-tight mb-0.5">
            {item.title}
          </h4>
          <p className="text-[10px] text-muted-foreground truncate mb-1">
            {item.location}
          </p>
          <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatCurrency(item.price)}
          </p>
        </div>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // VARIANTS: CATALOG | DASHBOARD | MANAGE (Standard 16:9 Card)
  // --------------------------------------------------------------------------
  return (
    <Card
      onClick={() => onClick && onClick(item)}
      className={cn(
        "p-0 group relative flex flex-col overflow-hidden cursor-pointer",
        "bg-card hover:shadow-md transition-all duration-300 border border-border/80 rounded-2xl h-full",
        isCardFeatured ? "ring-1 ring-emerald-500/40" : "",
        className
      )}
    >
      {/* 1. PHOTO (CANONICAL 16:9 WATERMARKED) */}
      <div className="relative aspect-[16/9] bg-muted shrink-0 overflow-hidden">
        <WatermarkedImage
          src={item.thumbnail || ""}
          alt={item.title || "Property"}
          className="absolute inset-0 w-full h-full"
          imageClassName="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
          watermarkSize="w-1/3"
          watermarkOpacity={0.6}
        />

        {/* Top-Right: Star / SuperAdmin */}
        {isSuperAdmin && onToggleFeatured && (
          <button
            type="button"
            aria-label="Toggle Featured Property"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFeatured(item, e);
            }}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-slate-950/40 hover:bg-slate-950/70 backdrop-blur-md transition z-10 cursor-pointer"
          >
            <Star
              className={cn(
                "w-3.5 h-3.5",
                isCardFeatured ? "fill-amber-400 text-amber-400" : "text-white/80"
              )}
            />
          </button>
        )}

        {/* Top-Left: Listing Type & Category Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider text-white backdrop-blur-md rounded-md shadow-xs",
              isRent ? "bg-amber-600/95" : "bg-emerald-600/95"
            )}
          >
            {isRent ? "DISEWAKAN" : "DIJUAL"}
          </span>

          {categoryName && (
            <span className="text-[10px] font-semibold text-white/95 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20">
              {categoryName}
            </span>
          )}

          {/* Status Badge in Manage View */}
          {variant === "manage" && item.status && item.status !== "published" && (
            <span className="text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider text-white bg-slate-900/70 backdrop-blur-md rounded-md">
              {item.status}
            </span>
          )}
        </div>

        {/* Bottom-Right: Listing Code Chip */}
        {item.listing_code && (
          <div className="absolute bottom-2 right-2 z-10">
            <span className="text-[9px] font-mono font-medium text-foreground bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded border border-border/80 shadow-2xs">
              {item.listing_code}
            </span>
          </div>
        )}
      </div>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 px-3.5 pt-3 pb-2.5 flex flex-col justify-between">
        <div>
          {/* Top row: Category tag & optional manage dropdown */}
          <div className="flex items-center justify-between mb-1 relative">
            <p className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
              {categoryName}
            </p>

            {showManagementMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute -top-1 -right-1 z-20"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Menu Opsi Properti"
                    className="h-6 w-6 rounded-lg hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl text-xs">
                    <DropdownMenuItem
                      onClick={() => onEdit && onEdit(item.id)}
                      className="cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 mr-2" /> Edit Properti
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-rose-600 cursor-pointer"
                      onClick={(e) => onDelete && onDelete(item.id, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus Properti
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-[13px] sm:text-[14px] text-foreground leading-snug line-clamp-2 h-[2.3rem] mb-1">
            {item.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium mb-2 truncate">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{item.location || "Lokasi Belum Ditentukan"}</span>
          </div>

          {/* Price */}
          <p className="text-[15px] sm:text-[16px] font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none mb-2.5">
            {formatCurrency(item.price)}
          </p>
        </div>

        {/* KEY SPECS (CANONICAL LUCIDE ICONS) */}
        {specs.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-medium pt-1 border-t border-border/50">
            {specs.map(({ key, icon: Icon, label }) => (
              <div key={key} className="flex items-center gap-1 shrink-0">
                <Icon className="w-3 h-3 text-slate-400" strokeWidth={2} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. AGENT / TRUST LAYER */}
      {(variant === "dashboard" || variant === "catalog") && (
        <div className="px-3.5 py-2 border-t border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border bg-emerald-100 text-emerald-800 font-bold text-[9px] flex items-center justify-center shrink-0">
              {agentName ? agentName.slice(0, 2).toUpperCase() : "IP"}
              {agentAvatar && (
                <img
                  src={agentAvatar}
                  alt={agentName}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-foreground truncate leading-tight">
                {agentName}
              </p>
              <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide truncate leading-none">
                INLAND PROPERTY
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
