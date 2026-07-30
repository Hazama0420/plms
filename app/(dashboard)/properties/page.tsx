// app/(dashboard)/properties/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase/client";
import { useProperties } from "@/hooks/use-properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  Plus,
  Search,
  Building2,
  MapPin,
  Eye,
  Share2,
  User,
  RefreshCw,
  LayoutGrid,
  List,
  Filter,
  X,
  Globe,
  Star,
  Bed,
  Bath,
  Maximize2,
} from "lucide-react";

export interface PropertyItem {
  id: string;
  title: string;
  listing_code: string;
  listing_type: "jual" | "sewa" | "sale" | "rent" | string;
  property_type: string;
  status: "published" | "draft" | "sold" | "rented" | "available" | "review" | string;
  price: number;
  location: string;
  land_area: number;
  building_area: number;
  bedrooms: number;
  bathrooms: number;
  thumbnail: string;
  certificate_status: string;
  owner_name: string;
  owner_phone: string;
  description: string;
  created_by?: string;
  assigned_to?: string;
  is_featured?: boolean;
  uploader_name: string;
  uploader_avatar: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  published: { label: "Dipublikasikan", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-700 dark:text-emerald-400" },
  available: { label: "Tersedia", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-700 dark:text-emerald-400" },
  draft: { label: "Draf", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-700 dark:text-amber-400" },
  review: { label: "Peninjauan", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-700 dark:text-amber-400" },
  sold: { label: "Terjual", bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-700 dark:text-slate-400" },
  rented: { label: "Tersewa", bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-700 dark:text-blue-400" },
};

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";

const mapPropertyItem = (
  p: any,
  profilesMap: Record<string, { full_name: string; avatar_url: string }>
): PropertyItem => {
  if (!p) return {} as PropertyItem;

  let thumbnail = DEFAULT_FALLBACK_IMAGE;
  const mediaArr = Array.isArray(p.media) ? p.media : [];

  if (mediaArr.length > 0) {
    const primary = mediaArr.find((m: any) => m.is_primary) || mediaArr[0];
    const url = primary?.public_url || primary?.url || primary?.file_path;
    if (url && typeof url === "string" && url.trim() !== "") {
      thumbnail = url;
    }
  }

  if (thumbnail === DEFAULT_FALLBACK_IMAGE && p.images) {
    if (Array.isArray(p.images) && p.images.length > 0) {
      const img = p.images[0];
      if (typeof img === "string" && img.trim() !== "") thumbnail = img;
    } else if (typeof p.images === "string" && p.images.trim() !== "") {
      try {
        const parsed = JSON.parse(p.images);
        if (Array.isArray(parsed) && parsed.length > 0) {
          thumbnail = parsed[0];
        } else {
          thumbnail = p.images;
        }
      } catch {
        thumbnail = p.images;
      }
    }
  }

  if (thumbnail === DEFAULT_FALLBACK_IMAGE) {
    if (p.image_url && typeof p.image_url === "string" && p.image_url.trim() !== "") {
      thumbnail = p.image_url;
    } else if (p.thumbnail && typeof p.thumbnail === "string" && p.thumbnail.trim() !== "") {
      thumbnail = p.thumbnail;
    }
  }

  const priceObj = Array.isArray(p.price) ? p.price[0] : p.price;
  let priceVal = 0;
  if (typeof p.price === "number") {
    priceVal = p.price;
  } else if (typeof priceObj === "number") {
    priceVal = priceObj;
  } else if (priceObj && typeof priceObj === "object") {
    priceVal = Number(priceObj.selling_price || priceObj.rental_price || priceObj.price || priceObj.amount || 0);
  }

  const specObj = Array.isArray(p.specifications)
    ? p.specifications[0]
    : p.specifications || (Array.isArray(p.specs) ? p.specs[0] : p.specs);

  const bedrooms = Number(specObj?.bedroom ?? specObj?.bedrooms ?? p.bedrooms ?? p.bedroom ?? 0);
  const bathrooms = Number(specObj?.bathroom ?? specObj?.bathrooms ?? p.bathrooms ?? p.bathroom ?? 0);

  const landObj = Array.isArray(p.land) ? p.land[0] : p.land;
  const buildingObj = Array.isArray(p.building) ? p.building[0] : p.building;

  const landArea = Number(landObj?.land_area ?? specObj?.land_area ?? p.land_area ?? p.land_size ?? 0);
  const buildingArea = Number(buildingObj?.building_area ?? specObj?.building_area ?? p.building_area ?? p.building_size ?? 0);

  const addressObj = Array.isArray(p.address) ? p.address[0] : p.address;
  let locationStr = "Lokasi Belum Dikonfigurasi";
  if (addressObj) {
    if (typeof addressObj === "string") {
      locationStr = addressObj;
    } else {
      const parts = [
        addressObj.address,
        addressObj.district_name || addressObj.district,
        addressObj.city_name || addressObj.city,
        addressObj.province_name || addressObj.province,
      ].filter(Boolean);
      locationStr = parts.length > 0 ? parts.join(", ") : "Lokasi Terverifikasi";
    }
  } else if (p.location) {
    locationStr = p.location;
  }

  const legalObj = Array.isArray(p.legalities) ? p.legalities[0] : p.legalities;
  const ownerObj = Array.isArray(p.owner) ? p.owner[0] : p.owner;

  // 🔹 PEMANCETAN PROFIL PENGUNGGAH DARI TABEL user_profiles SUPABASE
  const uploaderId = p.created_by || p.user_id || "";
  const profileFromJoin = Array.isArray(p.user_profiles) ? p.user_profiles[0] : p.user_profiles;
  const profileFromMap = uploaderId ? profilesMap[uploaderId] : null;

  const uploaderName =
    profileFromJoin?.full_name ||
    profileFromMap?.full_name ||
    p.users?.full_name ||
    p.uploader_name ||
    "Agen Resmi";

  const uploaderAvatar =
    profileFromJoin?.avatar_url ||
    profileFromMap?.avatar_url ||
    p.users?.avatar_url ||
    p.uploader_avatar ||
    "";

  return {
    id: p.id,
    title: p.title || "Properti Tanpa Judul",
    listing_code: p.listing_code || p.code || `INL-${p.id?.slice(0, 4)?.toUpperCase() || "000"}`,
    listing_type: p.listing_type || "jual",
    property_type: p.property_type || "Rumah",
    status: p.status || "published",
    price: priceVal,
    location: locationStr,
    land_area: landArea,
    building_area: buildingArea,
    bedrooms: bedrooms,
    bathrooms: bathrooms,
    thumbnail: thumbnail,
    certificate_status: specObj?.certificate || legalObj?.certificate_type || p.certificate_status || "SHM",
    owner_name: ownerObj?.full_name || ownerObj?.owner_name || p.owner_name || "Perusahaan Internal",
    owner_phone: ownerObj?.phone || ownerObj?.owner_phone || p.owner_phone || "",
    description: p.description || "",
    created_by: uploaderId,
    assigned_to: p.assigned_to || "",
    is_featured: p.is_featured || false,
    uploader_name: uploaderName,
    uploader_avatar: uploaderAvatar,
  };
};

function PropertiesCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState("");
  const [activeTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, { full_name: string; avatar_url: string }>>({});

  const viewParam = searchParams.get("view");
  const [scopeMode, setScopeMode] = useState<"my_properties" | "global">(
    viewParam === "global" ? "global" : "my_properties"
  );

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("users")
            .select("id, role")
            .eq("id", user.id)
            .maybeSingle();

          const role = (profile?.role || user.user_metadata?.role || "agent").toLowerCase();
          setCurrentUser({ id: user.id, role });

          if (role === "viewer") {
            setScopeMode("global");
          }
        }
      } catch (err) {
        console.error("Gagal memuat data pengguna:", err);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (viewParam === "global") setScopeMode("global");
  }, [viewParam]);

  const isSuperAdmin = currentUser?.role === "super_admin" || currentUser?.role === "superadmin";
  const isViewer = currentUser?.role === "viewer";

  const qParam = searchParams.get("q") || "";
  const listingTypeParam = searchParams.get("listing_type") || "";
  const propertyTypeParam = searchParams.get("property_type") || "";
  const cityParam = searchParams.get("city") || "";
  const provinceParam = searchParams.get("province") || "";

  const hasDashboardFilter = !!(qParam || listingTypeParam || propertyTypeParam || cityParam || provinceParam);

  const {
    data: rawProperties = [],
    loading,
    refetch,
  } = useProperties();

  // 🔹 FETCH DATA PROFIL PENGUNGGAH DARI TABEL "users" (sumber kebenaran profil user)
  useEffect(() => {
    async function fetchProfiles() {
      if (!rawProperties || rawProperties.length === 0) return;

      const userIds = Array.from(
        new Set(
          rawProperties
            .map((p: any) => p.created_by || p.user_id)
            .filter(Boolean)
        )
      );

      if (userIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        if (error) {
          console.error("Gagal mengambil data users:", error);
          return;
        }

        if (data) {
          const map: Record<string, { full_name: string; avatar_url: string }> = {};
          data.forEach((prof: any) => {
            map[prof.id] = {
              full_name: prof.full_name || "Agen Resmi",
              avatar_url: prof.avatar_url || "",
            };
          });
          setProfilesMap(map);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    }

    fetchProfiles();
  }, [rawProperties]);

  const properties: PropertyItem[] = useMemo(() => {
    return (rawProperties || []).map((p) => mapPropertyItem(p, profilesMap));
  }, [rawProperties, profilesMap]);

  useEffect(() => {
    if (qParam) setSearchInput(qParam);
  }, [qParam]);

  const handleToggleFeatured = async (property: PropertyItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isSuperAdmin) return;

    try {
      const nextVal = !property.is_featured;
      const { error: updateErr } = await supabase
        .from("properties")
        .update({ is_featured: nextVal })
        .eq("id", property.id);

      if (updateErr) throw updateErr;

      toast.success(
        nextVal
          ? `Properti '${property.title}' berhasil ditetapkan sebagai Properti Unggulan.`
          : `Status Unggulan pada properti '${property.title}' telah dicabut.`
      );

      refetch?.();
    } catch (err: any) {
      toast.error("Gagal memperbarui status unggulan: " + (err.message || err));
    }
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const goToDetail = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    router.push(`/properties/${id}`);
  };

  const handleSendWABrochure = (property: PropertyItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = encodeURIComponent(
      `🏠 *BROSUR RESMI PROPERTI: ${property.title.toUpperCase()}*\n\n` +
      `📍 *Lokasi*: ${property.location}\n` +
      `💰 *Harga*: ${formatCurrency(property.price)}\n` +
      `📐 *Spesifikasi*: LT ${property.land_area || 0} m² | LB ${property.building_area || 0} m² | ${property.bedrooms || 0} KT | ${property.bathrooms || 0} KM\n` +
      `📋 *Legalitas*: ${property.certificate_status || "Sertifikat Terverifikasi"}\n` +
      `🔖 *Kode Listing*: ${property.listing_code}\n\n` +
      `Untuk informasi lebih lanjut serta penjadwalan survei lokasi, silakan hubungi Tim Penjualan Inland Property.`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // FILTERING DATA
  const filteredProperties = useMemo(() => {
    return properties.filter((item) => {
      if (isViewer) {
        if (item.status !== "published" && item.status !== "available") {
          return false;
        }
      }

      if (scopeMode === "my_properties" && currentUser && !isViewer) {
        if (!isSuperAdmin) {
          const isOwner = item.created_by === currentUser.id || item.assigned_to === currentUser.id;
          if (!isOwner) return false;
        }
      }

      const query = searchInput.trim().toLowerCase();
      const matchSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.listing_code.toLowerCase().includes(query);

      let matchTab = true;
      if (activeTab === "published") matchTab = item.status === "published" || item.status === "available";
      else if (activeTab === "draft") matchTab = item.status === "draft" || item.status === "review";
      else if (activeTab === "sold_rented") matchTab = item.status === "sold" || item.status === "rented";

      let matchListingType = true;
      if (listingTypeParam && listingTypeParam !== "all") {
        matchListingType = item.listing_type.toLowerCase() === listingTypeParam.toLowerCase();
      }

      return matchSearch && matchTab && matchListingType;
    });
  }, [properties, searchInput, activeTab, scopeMode, currentUser, isViewer, isSuperAdmin, listingTypeParam]);

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {isViewer
                ? "Katalog Properti Resmi"
                : scopeMode === "my_properties"
                ? "Portofolio Properti Saya"
                : "Katalog Properti Perusahaan"}
            </h1>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border shadow-2xs",
                isViewer || scopeMode === "global"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
              )}
            >
              {isViewer ? "Portal Akses Klien" : scopeMode === "my_properties" ? "Akses Pribadi" : "Akses Perusahaan"}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-normal max-w-2xl">
            {isViewer
              ? "Jelajahi pilihan properti terverifikasi dengan standar kualitas eksklusif dari Inland Property."
              : scopeMode === "my_properties"
              ? "Kelola seluruh daftar inventaris properti yang Anda daftarkan secara terstruktur."
              : "Seluruh portofolio properti perusahaan dari agen dan konsultan properti resmi."}
          </p>
        </div>

        {!isViewer && currentUser?.role !== "commissioner" && (
          <Button
            onClick={() => router.push("/properties/create")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow text-xs font-semibold gap-2 shrink-0 h-10 px-5 rounded-xl cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4" /> Tambah Properti
          </Button>
        )}
      </div>

      {/* 2. TOGGLE SWITCHER SCOPE */}
      {!isViewer && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-muted/30 p-2 rounded-2xl border border-border/60 gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant={scopeMode === "my_properties" ? "default" : "ghost"}
              size="sm"
              onClick={() => setScopeMode("my_properties")}
              className={cn(
                "text-xs font-medium h-9 rounded-xl gap-2 flex-1 sm:flex-initial cursor-pointer transition-all",
                scopeMode === "my_properties" && "bg-slate-900 text-white dark:bg-emerald-600 shadow-xs"
              )}
            >
              <User className="w-3.5 h-3.5" /> Portofolio Saya
            </Button>
            <Button
              variant={scopeMode === "global" ? "default" : "ghost"}
              size="sm"
              onClick={() => setScopeMode("global")}
              className={cn(
                "text-xs font-medium h-9 rounded-xl gap-2 flex-1 sm:flex-initial cursor-pointer transition-all",
                scopeMode === "global" && "bg-slate-900 text-white dark:bg-emerald-600 shadow-xs"
              )}
            >
              <Globe className="w-3.5 h-3.5" /> Katalog Perusahaan
            </Button>
          </div>

          {isSuperAdmin && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium px-3 hidden md:flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Mode Super Admin: Klik ikon bintang untuk mengatur Properti Unggulan
            </span>
          )}
        </div>
      )}

      {/* BANNER FILTER DASHBOARD */}
      {hasDashboardFilter && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between text-xs backdrop-blur-sm">
          <span className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600" /> Menampilkan Hasil Filter Pencarian Dashboard
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push("/properties")}
            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 gap-1.5 cursor-pointer rounded-lg"
          >
            <X className="w-3.5 h-3.5" /> Reset Filter
          </Button>
        </div>
      )}

      {/* 3. SEARCH & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama properti, lokasi, atau kode listing..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 h-10 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus-visible:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="icon" onClick={() => refetch?.()} className="h-10 w-10 rounded-xl cursor-pointer">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </Button>

          <div className="flex items-center border border-border/80 rounded-xl p-1 bg-muted/40">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn("h-8 px-3 text-xs gap-1.5 rounded-lg cursor-pointer", viewMode === "grid" && "bg-background shadow-2xs font-medium")}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn("h-8 px-3 text-xs gap-1.5 rounded-lg cursor-pointer", viewMode === "table" && "bg-background shadow-2xs font-medium")}
            >
              <List className="w-3.5 h-3.5" /> Tabel
            </Button>
          </div>
        </div>
      </div>

      {/* 4. MAIN LIST PROPERTI */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <Card className="border border-border/60 p-12 text-center space-y-4 rounded-2xl shadow-2xs bg-card">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h3 className="text-base font-semibold text-foreground">Properti Tidak Ditemukan</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
            {scopeMode === "my_properties"
              ? "Anda belum mendaftarkan properti. Silakan tambah properti pertama Anda melalui tombol di bawah."
              : "Tidak ada data properti yang sesuai dengan kriteria pencarian Anda."}
          </p>
          {scopeMode === "my_properties" && !isViewer && (
            <Button onClick={() => router.push("/properties/create")} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-2 rounded-xl mt-2 cursor-pointer">
              <Plus className="w-4 h-4" /> Tambah Properti Baru
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProperties.map((prop) => {
            const st = statusConfig[prop.status] || statusConfig.published;

            return (
              <Card
                key={prop.id}
                onClick={() => goToDetail(prop.id)}
                className="group border border-border/70 shadow-2xs hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between bg-card"
              >
                <div>
                  {/* Foto Properti & Overlay */}
                  <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                    <img
                      src={prop.thumbnail}
                      alt={prop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-90" />

                    {/* Tombol Unggulan (Super Admin) */}
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFeatured(prop, e)}
                        title={prop.is_featured ? "Hapus dari Properti Unggulan" : "Tetapkan sebagai Properti Unggulan"}
                        className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 backdrop-blur-md hover:scale-110 transition shadow-md z-10 cursor-pointer"
                      >
                        <Star
                          className={cn(
                            "w-4 h-4 transition-colors",
                            prop.is_featured
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300 hover:text-amber-400"
                          )}
                        />
                      </button>
                    )}

                    {/* Status Listing & Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 shadow-2xs uppercase tracking-wider text-white border-0", prop.listing_type === "sewa" ? "bg-amber-600" : "bg-emerald-600")}>
                        {prop.listing_type === "sewa" ? "DISEWA" : "DIJUAL"}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px] font-semibold px-2.5 py-0.5 backdrop-blur-md border", st.bg, st.text)}>
                        {st.label}
                      </Badge>
                    </div>

                    {/* Price Tag & Kode Listing */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div className="text-white font-mono font-bold text-sm bg-slate-950/70 px-3 py-1 rounded-xl backdrop-blur-md border border-white/10 shadow-xs">
                        {formatCurrency(prop.price)}
                      </div>
                      <span className="text-[10px] font-mono font-medium text-white/90 bg-slate-950/60 px-2 py-0.5 rounded-lg backdrop-blur-md border border-white/10">
                        {prop.listing_code}
                      </span>
                    </div>
                  </div>

                  {/* Informasi Properti */}
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-bold text-sm line-clamp-1 group-hover:text-emerald-600 transition-colors tracking-tight text-foreground">
                      {prop.title}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" /> {prop.location}
                    </p>

                    {/* Spesifikasi Properti */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50 text-xs text-muted-foreground font-medium">
                      <div className="flex items-center gap-1.5">
                        <Bed className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{prop.bedrooms || 0} KT</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bath className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{prop.bathrooms || 0} KM</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{prop.building_area || prop.land_area || 0} m²</span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Footer Kartu: Detail & Profil Pengunggah user_profiles Supabase */}
                <CardFooter className="p-3 border-t border-border/50 bg-muted/20 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  {/* Sisi Kiri: Tombol Lihat Detail & Share */}
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={(e) => goToDetail(prop.id, e)} className="h-8 text-xs font-semibold gap-1.5 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-border/80">
                      <Eye className="w-3.5 h-3.5 text-emerald-600" /> Lihat Detail
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => handleSendWABrochure(prop, e)} className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 rounded-xl cursor-pointer" title="Kirim Brosur via WhatsApp">
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Sisi Kanan: Foto Profil & Nama Resmi dari user_profiles Supabase */}
                  <div className="flex items-center gap-2" title={`Dipublikasikan oleh: ${prop.uploader_name}`}>
                    <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[100px] hidden sm:inline">
                      {prop.uploader_name}
                    </span>
                    <div className="relative w-7 h-7 rounded-full overflow-hidden border border-border/80 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                      {prop.uploader_name ? prop.uploader_name.slice(0, 2).toUpperCase() : "IP"}
                      {prop.uploader_avatar && (
                        <img
                          src={prop.uploader_avatar}
                          alt={prop.uploader_name}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <PropertiesCatalogContent />
    </Suspense>
  );
}