// app/(dashboard)/properties/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Home,
  MapPin,
  Building2,
  User,
  Image as ImageIcon,
  Sparkles,
  Pencil,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Users,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

import { supabase } from "@/lib/supabase/client";
import propertyService from "@/services/property.service";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ============================================================
// TIPE LOKAL (menggantikan import dari types)
// ============================================================
type PropertyStatus = "draft" | "review" | "published" | "sold" | "rented" | "archived";

interface PropertyDetail {
  id: string;
  listing_code: string;
  title: string;
  slug: string;
  property_type: string;
  listing_type: "jual" | "sewa";
  property_category?: string | null;
  status: PropertyStatus;
  description?: string | null;
  selling_point?: string | null;
  rental_period?: string | null;
  owner_id?: string | null;
  created_by: string;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  assigned_to?: string | null;
  owner?: any;
  address?: any;
  price?: any;
  specifications?: any;
  land?: any;
  building?: any;
  media?: any[];
  assigned_user?: any;
}

// ============================================================
// STATUS CONFIG
// ============================================================
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-gray-600", bg: "bg-gray-100" },
  review: { label: "Review", color: "text-yellow-600", bg: "bg-yellow-100" },
  published: { label: "Published", color: "text-green-600", bg: "bg-green-100" },
  sold: { label: "Sold", color: "text-red-600", bg: "bg-red-100" },
  rented: { label: "Rented", color: "text-blue-600", bg: "bg-blue-100" },
  archived: { label: "Archived", color: "text-gray-500", bg: "bg-gray-100" },
};

// ============================================================
// LOCATION DATA TYPE
// ============================================================
interface LocationData {
  countries: { id: string; name: string }[];
  provinces: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  districts: { id: string; name: string }[];
  villages: { id: string; name: string }[];
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<PropertyStatus>("draft");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Assign Agent states
  const [agents, setAgents] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Location data (for display names)
  const [locationData, setLocationData] = useState<LocationData>({
    countries: [],
    provinces: [],
    cities: [],
    districts: [],
    villages: [],
  });

  // ===== FETCH AGENTS =====
  useEffect(() => {
    const fetchAgents = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url")
        .order("full_name");
      if (!error) setAgents(data || []);
    };
    fetchAgents();
  }, []);

  // ===== FETCH PROPERTY =====
  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      try {
        const data = await propertyService.getById(propertyId);
        setProperty(data);
      } catch (error) {
        console.error("Error fetching property:", error);
        toast.error("Gagal memuat data property");
        router.push("/properties");
      } finally {
        setLoading(false);
      }
    };

    // Load location data for display
    const fetchLocationData = async () => {
      try {
        const [countries, provinces, cities, districts, villages] = await Promise.all([
          supabase.from("countries").select("id, name").order("name"),
          supabase.from("provinces").select("id, name").order("name"),
          supabase.from("cities").select("id, name").order("name"),
          supabase.from("districts").select("id, name").order("name"),
          supabase.from("villages").select("id, name").order("name"),
        ]);

        setLocationData({
          countries: countries.data || [],
          provinces: provinces.data || [],
          cities: cities.data || [],
          districts: districts.data || [],
          villages: villages.data || [],
        });
      } catch (error) {
        console.error("Error fetching location data:", error);
      }
    };

    fetchProperty();
    fetchLocationData();
  }, [propertyId, router]);

  // ===== HANDLE ASSIGN AGENT =====
  const handleAssignAgent = async (agentId: string | null) => {
    if (!property) return;
    setAssignLoading(true);
    try {
      const updated = await propertyService.updateAssignedTo(
        property.id,
        agentId || null
      );
      setProperty(updated);
      toast.success(agentId ? "Agen berhasil ditugaskan!" : "Agen berhasil dilepas!");
    } catch (error: any) {
      console.error("Error assigning agent:", error);
      toast.error("Gagal tugaskan agen", { description: error.message });
    } finally {
      setAssignLoading(false);
    }
  };

  // ===== HANDLE STATUS UPDATE =====
  const handleUpdateStatus = async () => {
    if (!property) return;
    setUpdating(true);
    try {
      await propertyService.updateStatus(property.id, newStatus);
      toast.success(`Status berhasil diubah menjadi ${statusConfig[newStatus]?.label || newStatus}`);
      const updated = await propertyService.getById(property.id);
      setProperty(updated);
      setShowStatusDialog(false);
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Gagal mengubah status", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setUpdating(false);
    }
  };

  // ===== HANDLE DELETE =====
  const handleDelete = async () => {
    if (!property) return;
    setDeleting(true);
    try {
      await propertyService.delete(property.id);
      toast.success("Property berhasil dihapus");
      router.push("/properties");
    } catch (error: any) {
      console.error("Error deleting property:", error);
      toast.error("Gagal menghapus property", {
        description: error.message || "Silakan coba lagi.",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // ===== HANDLE DUPLICATE =====
  const handleDuplicate = async () => {
    if (!property) return;
    try {
      const duplicated = await propertyService.duplicate(property.id);
      toast.success("Property berhasil diduplikasi!");
      router.push(`/properties/${duplicated.id}`);
    } catch (error: any) {
      console.error("Error duplicating property:", error);
      toast.error("Gagal menduplikasi property", {
        description: error.message || "Silakan coba lagi.",
      });
    }
  };

  // ===== HELPERS =====
  const formatDate = (date: string) => {
    return format(new Date(date), "dd MMM yyyy, HH:mm", { locale: id });
  };

  const formatRelativeTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: id });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getLocationName = (id: string, list: { id: string; name: string }[]) => {
    return list.find((item) => item.id === id)?.name || "-";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl mt-4" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-6xl mb-4">🏠</div>
        <h2 className="text-2xl font-bold text-slate-700">Property Tidak Ditemukan</h2>
        <p className="text-slate-500 mt-2">Property yang Anda cari mungkin telah dihapus.</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {property.title}
              <Badge
                className={cn(
                  "text-xs font-medium border-0",
                  statusConfig[property.status]?.color,
                  statusConfig[property.status]?.bg
                )}
              >
                {statusConfig[property.status]?.label || property.status}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              {property.listing_code} • {property.property_type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => router.push(`/properties/${property.id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplikasi
          </Button>
          <Button variant="default" size="sm" onClick={() => setShowStatusDialog(true)}>
            <Clock className="h-4 w-4 mr-2" />
            Ubah Status
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus
          </Button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">📋 Detail</TabsTrigger>
              <TabsTrigger value="location">📍 Lokasi</TabsTrigger>
              <TabsTrigger value="media">🖼️ Media</TabsTrigger>
            </TabsList>

            {/* DETAILS TAB */}
            <TabsContent value="details" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informasi Property</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Kode Listing</Label>
                      <p className="font-medium">{property.listing_code}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Tipe</Label>
                      <p className="font-medium">{property.property_type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Tipe Listing</Label>
                      <p className="font-medium">{property.listing_type === "jual" ? "Jual" : "Sewa"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Kategori</Label>
                      <p className="font-medium">{property.property_category || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Status</Label>
                      <Badge
                        className={cn(
                          "text-xs font-medium border-0",
                          statusConfig[property.status]?.color,
                          statusConfig[property.status]?.bg
                        )}
                      >
                        {statusConfig[property.status]?.label || property.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Dibuat</Label>
                      <p className="font-medium text-sm">{formatRelativeTime(property.created_at)}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Description */}
                  <div>
                    <Label className="text-muted-foreground text-sm">Deskripsi</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{property.description || "Tidak ada deskripsi"}</p>
                  </div>

                  {/* Selling Point */}
                  {property.selling_point && (
                    <div>
                      <Label className="text-muted-foreground text-sm">💎 Selling Point</Label>
                      <p className="text-sm mt-1">{property.selling_point}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Price */}
                  <div className="grid grid-cols-2 gap-4">
                    {property.listing_type === "jual" && property.price?.selling_price && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Harga Jual</Label>
                        <p className="font-medium text-lg text-emerald-600">
                          {formatCurrency(property.price.selling_price)}
                        </p>
                      </div>
                    )}
                    {property.listing_type === "sewa" && property.price?.rental_price && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Harga Sewa / Bulan</Label>
                        <p className="font-medium text-lg text-emerald-600">
                          {formatCurrency(property.price.rental_price)}
                        </p>
                      </div>
                    )}
                    {property.price?.service_charge && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Service Charge</Label>
                        <p className="font-medium">{formatCurrency(property.price.service_charge)}</p>
                      </div>
                    )}
                    {property.price?.maintenance_fee && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Maintenance Fee</Label>
                        <p className="font-medium">{formatCurrency(property.price.maintenance_fee)}</p>
                      </div>
                    )}
                    {property.price?.negotiable && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Nego</Label>
                        <p className="font-medium text-green-600">✅ Bisa Nego</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Specifications */}
                  <div>
                    <Label className="text-muted-foreground text-sm">Spesifikasi</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {property.specifications?.bedroom && (
                        <div className="p-2 bg-slate-50 rounded-lg text-center">
                          <p className="text-sm font-medium">{property.specifications.bedroom}</p>
                          <p className="text-xs text-muted-foreground">🛏️ Kamar</p>
                        </div>
                      )}
                      {property.specifications?.bathroom && (
                        <div className="p-2 bg-slate-50 rounded-lg text-center">
                          <p className="text-sm font-medium">{property.specifications.bathroom}</p>
                          <p className="text-xs text-muted-foreground">🛁 KM</p>
                        </div>
                      )}
                      {property.specifications?.garage && (
                        <div className="p-2 bg-slate-50 rounded-lg text-center">
                          <p className="text-sm font-medium">{property.specifications.garage}</p>
                          <p className="text-xs text-muted-foreground">🚗 Garasi</p>
                        </div>
                      )}
                      {property.specifications?.carport && (
                        <div className="p-2 bg-slate-50 rounded-lg text-center">
                          <p className="text-sm font-medium">{property.specifications.carport}</p>
                          <p className="text-xs text-muted-foreground">🏎️ Carport</p>
                        </div>
                      )}
                      {property.specifications?.floor && (
                        <div className="p-2 bg-slate-50 rounded-lg text-center">
                          <p className="text-sm font-medium">{property.specifications.floor}</p>
                          <p className="text-xs text-muted-foreground">🏗️ Lantai</p>
                        </div>
                      )}
                      {property.specifications?.electricity && (
                        <div className="p-2 bg-slate-50 rounded-lg text-center">
                          <p className="text-sm font-medium">{property.specifications.electricity} VA</p>
                          <p className="text-xs text-muted-foreground">⚡ Listrik</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {property.specifications?.certificate && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Sertifikat</Label>
                          <p className="text-sm font-medium">{property.specifications.certificate}</p>
                        </div>
                      )}
                      {property.specifications?.facing && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Hadap</Label>
                          <p className="text-sm font-medium">{property.specifications.facing}</p>
                        </div>
                      )}
                      {property.specifications?.condition && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Kondisi</Label>
                          <p className="text-sm font-medium">{property.specifications.condition}</p>
                        </div>
                      )}
                      {property.specifications?.furnishing && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Furnishing</Label>
                          <p className="text-sm font-medium">{property.specifications.furnishing}</p>
                        </div>
                      )}
                      {property.specifications?.year_built && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Tahun Bangun</Label>
                          <p className="text-sm font-medium">{property.specifications.year_built}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Land & Building */}
                  <div className="grid grid-cols-2 gap-4">
                    {property.land?.land_area && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Luas Tanah</Label>
                        <p className="font-medium">{property.land.land_area} {property.land.land_unit || "m²"}</p>
                      </div>
                    )}
                    {property.building?.building_area && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Luas Bangunan</Label>
                        <p className="font-medium">{property.building.building_area} m²</p>
                      </div>
                    )}
                    {property.land?.land_width && property.land?.land_length && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Dimensi Tanah</Label>
                        <p className="font-medium">{property.land.land_width} x {property.land.land_length} m</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* LOCATION TAB */}
            <TabsContent value="location" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📍 Alamat & Lokasi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Negara</Label>
                      <p className="font-medium">
                        {getLocationName(property.address?.country_id || "", locationData.countries)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Provinsi</Label>
                      <p className="font-medium">
                        {getLocationName(property.address?.province_id || "", locationData.provinces)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Kota / Kabupaten</Label>
                      <p className="font-medium">
                        {getLocationName(property.address?.city_id || "", locationData.cities)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Kecamatan</Label>
                      <p className="font-medium">
                        {getLocationName(property.address?.district_id || "", locationData.districts)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Kelurahan / Desa</Label>
                      <p className="font-medium">
                        {getLocationName(property.address?.village_id || "", locationData.villages)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Kode Pos</Label>
                      <p className="font-medium">{property.address?.postal_code || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Alamat Lengkap</Label>
                    <p className="font-medium mt-1">{property.address?.address || "Tidak ada alamat"}</p>
                  </div>
                  {property.address?.latitude && property.address?.longitude && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-sm">Latitude</Label>
                        <p className="font-medium">{property.address.latitude}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-sm">Longitude</Label>
                        <p className="font-medium">{property.address.longitude}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* MEDIA TAB */}
            <TabsContent value="media" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">🖼️ Foto & Media</CardTitle>
                </CardHeader>
                <CardContent>
                  {property.media && property.media.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {property.media.map((media) => {
                        const imageUrl = media.public_url || media.url;
                        return (
                          <div key={media.id} className="relative group aspect-square rounded-lg border overflow-hidden">
                            <img
                              src={imageUrl}
                              alt={media.file_name || media.original_name || "Foto"}
                              className="w-full h-full object-cover"
                            />
                            {media.is_primary && (
                              <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
                                Primary
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Belum ada foto</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN - Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tugaskan Agen Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Tugaskan Agen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Select
                  value={property?.assigned_to || ""}
                  onValueChange={(val) => {
                    handleAssignAgent(val || null);
                  }}
                  disabled={assignLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih agen penanggung jawab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tidak diassign</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={agent.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(agent.full_name || agent.email)}
                            </AvatarFallback>
                          </Avatar>
                          {agent.full_name || agent.email}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {property?.assigned_user && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={property.assigned_user.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(property.assigned_user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>Agen: {property.assigned_user.full_name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Owner Card */}
          {property.owner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">👤 Pemilik</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {property.owner.full_name?.charAt(0).toUpperCase() || "O"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{property.owner.full_name}</p>
                    <p className="text-muted-foreground text-xs">{property.owner.owner_code}</p>
                  </div>
                </div>
                <Separator />
                {property.owner.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">📞</span>
                    <span>{property.owner.phone}</span>
                  </div>
                )}
                {property.owner.whatsapp && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">💬</span>
                    <span>{property.owner.whatsapp}</span>
                  </div>
                )}
                {property.owner.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">✉️</span>
                    <span>{property.owner.email}</span>
                  </div>
                )}
                {property.owner.address && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">📍</span>
                    <span className="text-xs">{property.owner.address}</span>
                  </div>
                )}
                {property.owner.notes && (
                  <div className="flex items-start gap-2 mt-2">
                    <span className="text-muted-foreground">📝</span>
                    <span className="text-xs text-muted-foreground">{property.owner.notes}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">⚡ Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/properties/${property.id}/edit`)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Property
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/properties/${property.id}/media`)}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Kelola Media
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-emerald-600"
                onClick={() => window.open(`/properties/${property.id}/export`, "_blank")}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Export Portal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== DIALOGS ===== */}

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Status</DialogTitle>
            <DialogDescription>Pilih status baru untuk property ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select
              value={newStatus}
              onValueChange={(val) => setNewStatus(val as PropertyStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">📝 Draft</SelectItem>
                <SelectItem value="review">👀 Review</SelectItem>
                <SelectItem value="published">🚀 Published</SelectItem>
                <SelectItem value="sold">✅ Sold</SelectItem>
                <SelectItem value="rented">📋 Rented</SelectItem>
                <SelectItem value="archived">📦 Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Batal</Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Hapus Property</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus property "{property.title}"?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}