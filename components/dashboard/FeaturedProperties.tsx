// components/dashboard/FeaturedProperties.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Maximize,
  ArrowRight,
  Sparkles,
  Building,
  Star,
  Globe,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PropertyItem {
  id: string;
  title: string;
  listing_code: string;
  listing_type: string;
  property_type: string;
  status: string;
  city_name?: string;
  district_name?: string;
  address_text?: string;
  price?: number | null;
  bedroom?: number | string | null;
  bathroom?: number | string | null;
  building_area?: number | string | null;
  land_area?: number | string | null;
  thumbnail_url?: string | null;
  is_featured?: boolean;
}

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";

export function FeaturedProperties() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeaturedProperties() {
      try {
        setLoading(true);

        // 1. Prioritaskan Properti yang di-flag is_featured = true oleh Super Admin
        let { data, error } = await supabase
          .from("properties")
          .select(`
            *,
            address:property_address(*),
            price:property_price(*),
            specifications:property_specifications(*),
            building:property_building(*),
            land:property_land(*),
            media:property_media(*)
          `)
          .eq("status", "published")
          .eq("is_featured", true)
          .order("created_at", { ascending: false })
          .limit(6);

        // 2. SMART FALLBACK: Jika properti unggulan kurang dari 6, ambil properti published terbaru
        if (!error && (!data || data.length < 6)) {
          const needed = 6 - (data?.length || 0);
          const existingIds = data?.map((d) => d.id) || [];

          let fallbackQuery = supabase
            .from("properties")
            .select(`
              *,
              address:property_address(*),
              price:property_price(*),
              specifications:property_specifications(*),
              building:property_building(*),
              land:property_land(*),
              media:property_media(*)
            `)
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(needed);

          if (existingIds.length > 0) {
            fallbackQuery = fallbackQuery.not("id", "in", `(${existingIds.join(",")})`);
          }

          const { data: fallbackData } = await fallbackQuery;
          if (fallbackData) {
            data = [...(data || []), ...fallbackData];
          }
        }

        if (data && data.length > 0) {
          const formatted: PropertyItem[] = data.map((p: any) => {
            const addrObj = Array.isArray(p.address) ? p.address[0] : p.address;
            const priceObj = Array.isArray(p.price) ? p.price[0] : p.price;
            const specObj = Array.isArray(p.specifications)
              ? p.specifications[0]
              : p.specifications || (Array.isArray(p.specs) ? p.specs[0] : p.specs);
            const bldObj = Array.isArray(p.building) ? p.building[0] : p.building;
            const landObj = Array.isArray(p.land) ? p.land[0] : p.land;
            const mediaArr = Array.isArray(p.media) ? p.media : [];

            let thumbnail: string | null = null;
            if (mediaArr.length > 0) {
              const primary = mediaArr.find((m: any) => m.is_primary) || mediaArr[0];
              thumbnail = primary?.public_url || primary?.url || primary?.file_path || null;
            }
            if (!thumbnail && p.images) {
              if (Array.isArray(p.images) && p.images.length > 0) {
                thumbnail = typeof p.images[0] === "string" ? p.images[0] : null;
              } else if (typeof p.images === "string") {
                try {
                  const parsed = JSON.parse(p.images);
                  thumbnail = Array.isArray(parsed) ? parsed[0] : p.images;
                } catch {
                  thumbnail = p.images;
                }
              }
            }
            if (!thumbnail) {
              thumbnail = p.thumbnail || p.image_url || null;
            }

            let priceVal: number | null = null;
            if (typeof p.price === "number") priceVal = p.price;
            else if (typeof priceObj === "number") priceVal = priceObj;
            else if (priceObj && typeof priceObj === "object") {
              priceVal =
                priceObj.selling_price ||
                priceObj.rental_price ||
                priceObj.price ||
                priceObj.amount ||
                null;
            }

            let locationText = p.location || "";
            let district = addrObj?.district_name || addrObj?.district || "";
            let city = addrObj?.city_name || addrObj?.city || addrObj?.province_name || "";
            if (!district && !city && addrObj?.address) {
              locationText = addrObj.address;
            }

            return {
              id: p.id,
              title: p.title || "Properti Unggulan",
              listing_code:
                p.listing_code || p.code || `INL-${p.id?.slice(0, 4)?.toUpperCase() || "000"}`,
              listing_type: p.listing_type || "jual",
              property_type: p.property_type || "Rumah",
              status: p.status || "published",
              city_name: city,
              district_name: district,
              address_text: locationText,
              price: priceVal,
              bedroom: specObj?.bedroom ?? specObj?.bedrooms ?? p.bedrooms ?? p.bedroom ?? null,
              bathroom: specObj?.bathroom ?? specObj?.bathrooms ?? p.bathrooms ?? p.bathroom ?? null,
              building_area:
                bldObj?.building_area ?? specObj?.building_area ?? p.building_area ?? p.building_size ?? null,
              land_area:
                landObj?.land_area ?? specObj?.land_area ?? p.land_area ?? p.land_size ?? null,
              thumbnail_url: thumbnail,
              is_featured: p.is_featured || false,
            };
          });

          setProperties(formatted);
        } else {
          setProperties([]);
        }
      } catch (err: any) {
        console.error("Gagal memuat 6 properti unggulan:", err?.message || JSON.stringify(err));
        setProperties([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFeaturedProperties();
  }, []);

  const formatIDR = (val?: number | null) => {
    if (!val) return "Hubungi Agen";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            6 Properti Unggulan Pilihan Super Admin
          </h3>
          <p className="text-xs text-muted-foreground">
            Listing prioritas tinggi teratas yang direkomendasikan untuk seluruh agen.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/properties?view=global")}
          className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5 rounded-xl border-emerald-300 dark:border-emerald-800"
        >
          <Globe className="w-3.5 h-3.5" /> Lihat Semua Katalog Global
        </Button>
      </div>

      {/* Grid 6 Properti */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-2xl" />
          ))}
        </div>
      ) : properties.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((item) => (
              <Card
                key={item.id}
                onClick={() => router.push(`/properties/${item.id}`)}
                className="group border border-border/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between bg-card"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative w-full h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {item.thumbnail_url ? (
                      <Image
                        src={item.thumbnail_url}
                        alt={item.title}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                        <Building className="w-8 h-8 stroke-1" />
                        <span className="text-[10px]">Tanpa Foto</span>
                      </div>
                    )}

                    {/* Badge Featured */}
                    {item.is_featured && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] gap-1 shadow-md rounded-md">
                          <Star className="w-3 h-3 fill-slate-950" /> Pilihan Utama
                        </Badge>
                      </div>
                    )}

                    {/* Badge Status Jual / Sewa */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <Badge
                        className={
                          item.listing_type === "sewa"
                            ? "bg-amber-600 text-white text-[10px] uppercase font-bold rounded-md"
                            : "bg-emerald-600 text-white text-[10px] uppercase font-bold rounded-md"
                        }
                      >
                        {item.listing_type === "sewa" ? "Disewakan" : "Dijual"}
                      </Badge>
                      <Badge variant="secondary" className="bg-slate-900/80 text-white backdrop-blur-xs text-[10px] rounded-md">
                        {item.property_type}
                      </Badge>
                    </div>

                    {/* Pricing Badge */}
                    <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-xl text-white font-mono font-bold text-xs border border-white/10">
                      {formatIDR(item.price)}
                    </div>
                  </div>

                  {/* Content Details */}
                  <CardContent className="p-3.5 space-y-2">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {item.district_name || item.city_name
                          ? `${item.district_name ? item.district_name + ", " : ""}${item.city_name}`
                          : item.address_text || "Lokasi Properti"}
                      </p>
                    </div>

                    {/* Spec Icons */}
                    <div className="flex items-center gap-3 pt-2 border-t border-border/60 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      {item.bedroom !== null && item.bedroom !== undefined && (
                        <div className="flex items-center gap-1" title="Kamar Tidur">
                          <Bed className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.bedroom} KT</span>
                        </div>
                      )}
                      {item.bathroom !== null && item.bathroom !== undefined && (
                        <div className="flex items-center gap-1" title="Kamar Mandi">
                          <Bath className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.bathroom} KM</span>
                        </div>
                      )}
                      {item.building_area !== null && item.building_area !== undefined && (
                        <div className="flex items-center gap-1" title="Luas Bangunan">
                          <Maximize className="w-3.5 h-3.5 text-slate-400" />
                          <span>LB {item.building_area} m²</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>

          {/* 🔴 TOMBOL BESAR: PROPERTI LAINNYA / KATALOG GLOBAL */}
          <div className="pt-2 flex justify-center">
            <Button
              onClick={() => router.push("/properties?view=global")}
              className="w-full sm:w-auto px-8 h-12 bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 font-bold text-sm rounded-2xl shadow-lg gap-2 transition-transform hover:scale-[1.01]"
            >
              <Globe className="w-4 h-4 text-emerald-400 dark:text-white" />
              Jelajahi Semua Properti Lainnya (Katalog Global)
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-muted/30 border rounded-2xl text-xs text-muted-foreground">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p>Belum ada properti unggulan yang dipublikasikan.</p>
        </div>
      )}
    </div>
  );
}