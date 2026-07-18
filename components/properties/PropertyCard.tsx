// components/properties/PropertyCard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Heart,
  Eye,
  Pencil,
  Copy,
  Archive,
  Trash2,
  MoreHorizontal,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Building2,
  Car,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import propertyService from "@/services/property.service";
import { toast } from "sonner";

interface PropertyCardProps {
  property: any;
  onRefetch: () => void;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Draft", color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800" },
  review: { label: "Review", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  published: { label: "Published", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  sold: { label: "Sold", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  rented: { label: "Rented", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
  archived: { label: "Archived", color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30" },
};

const typeLabels: Record<string, string> = {
  jual: "Jual",
  sewa: "Sewa",
};

// ✅ PASTIKAN MENGGUNAKAN DEFAULT EXPORT
export default function PropertyCard({ property, onRefetch }: PropertyCardProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const images = property.media?.filter((m: any) => m.public_url) || [];
  const primaryImage = images.find((m: any) => m.is_primary)?.public_url || images[0]?.public_url;
  const hasMultipleImages = images.length > 1;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleAction = async (action: string) => {
    try {
      if (action === "delete") {
        if (!confirm("Yakin hapus properti ini?")) return;
        await propertyService.delete(property.id);
        toast.success("Properti dihapus");
        onRefetch();
        return;
      }
      if (action === "duplicate") {
        await propertyService.duplicate(property.id);
        toast.success("Properti diduplikasi");
        onRefetch();
        return;
      }
      if (action === "archive") {
        await propertyService.updateStatus(property.id, "archived");
        toast.success("Properti diarsipkan");
        onRefetch();
        return;
      }
      if (action === "publish") {
        await propertyService.updateStatus(property.id, "published");
        toast.success("Properti dipublikasikan");
        onRefetch();
        return;
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal melakukan aksi");
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const status = statusConfig[property.status] || statusConfig.draft;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
      onClick={() => router.push(`/properties/${property.id}`)}
    >
      {/* IMAGE */}
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {primaryImage && !imageError ? (
          <img
            src={primaryImage}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300 dark:text-slate-600">
            🏠
          </div>
        )}

        {/* BADGES */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <Badge className={cn("border-0 font-medium", status.bg, status.color)}>
            {status.label}
          </Badge>
          {property.listing_type && (
            <Badge variant="outline" className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-0 text-xs">
              {typeLabels[property.listing_type] || property.listing_type}
            </Badge>
          )}
        </div>

        {/* FAVORITE */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isFavorite ? "fill-rose-500 text-rose-500" : "text-slate-400"
            )}
          />
        </button>

        {/* IMAGE CAROUSEL NAV */}
        {hasMultipleImages && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
            >
              ‹
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_: any, i: number) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-4 space-y-3">
        {/* PRICE */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-slate-800 dark:text-white">
              {property.listing_type === "jual"
                ? formatPrice(property.price?.selling_price)
                : formatPrice(property.price?.rental_price)}
              {property.listing_type === "sewa" && (
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400"> / bulan</span>
              )}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {property.listing_code}
            </p>
          </div>
          <Badge variant="outline" className="text-xs dark:border-slate-700">
            {property.property_type || "Properti"}
          </Badge>
        </div>

        {/* TITLE & LOCATION */}
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
            {property.title}
          </h3>
          <div className="flex items-start gap-1 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-1">
              {property.address?.address || "Lokasi belum diisi"}
            </span>
          </div>
        </div>

        {/* SPECS */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
          {property.specifications?.bedroom && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" /> {property.specifications.bedroom}
            </span>
          )}
          {property.specifications?.bathroom && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" /> {property.specifications.bathroom}
            </span>
          )}
          {property.land?.land_area && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" /> {property.land.land_area} m²
            </span>
          )}
          {property.building?.building_area && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> {property.building.building_area} m²
            </span>
          )}
          {property.specifications?.garage && (
            <span className="flex items-center gap-1">
              <Car className="h-3.5 w-3.5" /> {property.specifications.garage}
            </span>
          )}
        </div>

        {/* AGENT & DATE */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              {property.assigned_to?.full_name?.[0] || "A"}
            </div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {property.assigned_to?.full_name || "Agent"}
            </span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {property.created_at ? new Date(property.created_at).toLocaleDateString("id-ID") : ""}
          </span>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => router.push(`/properties/${property.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
            onClick={() => router.push(`/properties/${property.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            onClick={() => handleAction("duplicate")}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
            onClick={() => handleAction("archive")}
          >
            <Archive className="h-4 w-4" />
          </Button>
         <DropdownMenu>
  <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors">
    <MoreHorizontal className="h-4 w-4" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-44 dark:bg-slate-800 dark:border-slate-700">
    {property.status !== "published" && (
      <DropdownMenuItem onClick={() => handleAction("publish")} className="text-emerald-600 dark:text-emerald-400">
        📌 Publish
      </DropdownMenuItem>
    )}
    <DropdownMenuItem onClick={() => handleAction("delete")} className="text-rose-600 dark:text-rose-400">
      <Trash2 className="h-4 w-4 mr-2" /> Hapus
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}