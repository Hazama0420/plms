// app/(dashboard)/properties/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Copy,
  Home,
  MapPin,
  Building2,
  User,
  Image as ImageIcon,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { propertyService } from "@/services/property.service";
import { MediaGallery } from "@/components/properties/media-gallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ============================================================
// TIPE DATA
// ============================================================

interface PropertyDetail {
  id: string;
  listing_code: string;
  title: string;
  slug: string;
  property_type: string;
  listing_type: "jual" | "sewa";
  status: "draft" | "review" | "published" | "sold" | "rented" | "archived";
  description: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;

  owner: {
    id: string;
    full_name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
  } | null;

  address: {
    id: string;
    address: string;
    postal_code: string | null;
    latitude: number | null;
    longitude: number | null;
    country: { name: string } | null;
    province: { name: string } | null;
    city: { name: string } | null;
    district: { name: string } | null;
    village: { name: string } | null;
  } | null;

  price: {
    id: string;
    selling_price: number | null;
    rental_price: number | null;
    service_charge: number | null;
    maintenance_fee: number | null;
    negotiable: boolean;
  } | null;

  specifications: {
    id: string;
    bedroom: number | null;
    bathroom: number | null;
    garage: number | null;
    carport: number | null;
    floor: number | null;
    electricity: number | null;
    water_source: string | null;
    certificate: string | null;
    facing: string | null;
    condition: string | null;
    furnishing: string | null;
    year_built: number | null;
  } | null;

  land: {
    id: string;
    land_area: number | null;
    land_unit: string;
    land_width: number | null;
    land_length: number | null;
  } | null;

  building: {
    id: string;
    building_area: number | null;
    building_width: number | null;
    building_length: number | null;
  } | null;

  media: {
    id: string;
    public_url: string;
    is_primary: boolean;
    sort_order: number;
    original_name: string;
    file_size: number;
  }[];
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaKey, setMediaKey] = useState(0);

  // ===== FETCH PROPERTY =====
  const fetchProperty = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await propertyService.getById(id);
      setProperty(data as PropertyDetail);
    } catch (err: any) {
      console.error("Error fetching property:", err);
      setError(err.message || "Gagal memuat data property.");
      toast.error("Gagal memuat property", {
        description: err.message || "Silakan coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchProperty();
  }, [id, mediaKey]);

  // ===== HANDLER: DELETE =====
  const handleDelete = async () => {
    if (!property) return;
    try {
      await propertyService.delete(property.id);
      toast.success("Property berhasil dihapus.");
      router.push("/properties");
    } catch (err: any) {
      toast.error("Gagal menghapus property", {
        description: err.message,
      });
    }
  };

  // ===== HANDLER: DUPLICATE =====
  const handleDuplicate = async () => {
    if (!property) return;
    try {
      const newProperty = await propertyService.duplicate(property.id);
      toast.success("Property berhasil di-duplicate!");
      router.push(`/properties/${newProperty.id}`);
    } catch (err: any) {
      toast.error("Gagal duplicate property", {
        description: err.message,
      });
    }
  };

  // ===== FORMAT HARGA =====
  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // ===== REFRESH MEDIA =====
  const refreshMedia = () => {
    setMediaKey((prev) => prev + 1);
  };

  // ===== STATUS BADGE =====
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: "Draft", color: "bg-slate-100 text-slate-700", icon: <Clock size={16} /> },
    review: { label: "Review", color: "bg-amber-100 text-amber-700", icon: <Clock size={16} /> },
    published: { label: "Published", color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle size={16} /> },
    sold: { label: "Sold", color: "bg-blue-100 text-blue-700", icon: <CheckCircle size={16} /> },
    rented: { label: "Rented", color: "bg-purple-100 text-purple-700", icon: <CheckCircle size={16} /> },
    archived: { label: "Archived", color: "bg-rose-100 text-rose-700", icon: <XCircle size={16} /> },
  };

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ===== ERROR =====
  if (error || !property) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-6xl mb-4">🏠</div>
        <h2 className="text-2xl font-bold text-slate-700">Property Tidak Ditemukan</h2>
        <p className="text-slate-500 mt-2">{error || "Data property tidak tersedia."}</p>
        <Button onClick={() => router.push("/properties")} className="mt-4">
          <ArrowLeft size={18} className="mr-2" />
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-10 w-10 text-white hover:bg-white/20"
              >
                <ArrowLeft size={22} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{property.title}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <Badge className="bg-white/20 text-white border-0">
                    {property.listing_code}
                  </Badge>
                  <Badge className={cn("border-0", statusConfig[property.status]?.color, statusConfig[property.status]?.bg)}>
                    {statusConfig[property.status]?.icon}
                    <span className="ml-1">{statusConfig[property.status]?.label}</span>
                  </Badge>
                  <Badge variant="outline" className="border-white/30 text-white">
                    {property.listing_type === "jual" ? "💰 Jual" : "📋 Sewa"}
                  </Badge>
                  <Badge variant="outline" className="border-white/30 text-white">
                    🏠 {property.property_type}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/properties/${property.id}/edit`)}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDuplicate}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              <Copy size={16} className="mr-2" />
              Duplicate
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" size="sm" className="bg-rose-500/20 text-white hover:bg-rose-500/30">
                  <Trash2 size={16} className="mr-2" />
                  Hapus
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Yakin hapus property ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini tidak bisa dibatalkan. Property "{property.title}" akan dihapus permanen dari database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600">
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* ===== MEDIA GALLERY ===== */}
<Card className="border-0 shadow-md overflow-hidden">
  <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-t-xl">
    <CardTitle className="text-base flex items-center gap-2 text-slate-700">
      <ImageIcon size={18} className="text-cyan-500" />
      Gallery
    </CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    <MediaGallery
      propertyId={property.id}
      media={property.media || []}
      onUpdate={fetchProperty}
    />
  </CardContent>
</Card>

          {/* DESCRIPTION */}
          {property.description && (
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <span>📝</span> Deskripsi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-600 whitespace-pre-wrap">{property.description}</p>
              </CardContent>
            </Card>
          )}

          {/* SPECIFICATIONS */}
          {property.specifications && (
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <Building2 size={18} className="text-purple-500" />
                  Spesifikasi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.specifications.bedroom !== null && (
                    <div><span className="text-slate-500">Kamar Tidur</span><br /><span className="font-semibold">{property.specifications.bedroom}</span></div>
                  )}
                  {property.specifications.bathroom !== null && (
                    <div><span className="text-slate-500">Kamar Mandi</span><br /><span className="font-semibold">{property.specifications.bathroom}</span></div>
                  )}
                  {property.specifications.garage !== null && (
                    <div><span className="text-slate-500">Garasi</span><br /><span className="font-semibold">{property.specifications.garage}</span></div>
                  )}
                  {property.specifications.carport !== null && (
                    <div><span className="text-slate-500">Carport</span><br /><span className="font-semibold">{property.specifications.carport}</span></div>
                  )}
                  {property.specifications.floor !== null && (
                    <div><span className="text-slate-500">Lantai</span><br /><span className="font-semibold">{property.specifications.floor}</span></div>
                  )}
                  {property.specifications.electricity !== null && (
                    <div><span className="text-slate-500">Daya Listrik</span><br /><span className="font-semibold">{property.specifications.electricity} VA</span></div>
                  )}
                  {property.specifications.water_source && (
                    <div><span className="text-slate-500">Sumber Air</span><br /><span className="font-semibold">{property.specifications.water_source}</span></div>
                  )}
                  {property.specifications.certificate && (
                    <div><span className="text-slate-500">Sertifikat</span><br /><span className="font-semibold">{property.specifications.certificate}</span></div>
                  )}
                  {property.specifications.facing && (
                    <div><span className="text-slate-500">Hadap</span><br /><span className="font-semibold">{property.specifications.facing}</span></div>
                  )}
                  {property.specifications.condition && (
                    <div><span className="text-slate-500">Kondisi</span><br /><span className="font-semibold">{property.specifications.condition}</span></div>
                  )}
                  {property.specifications.furnishing && (
                    <div><span className="text-slate-500">Furnishing</span><br /><span className="font-semibold">{property.specifications.furnishing}</span></div>
                  )}
                  {property.specifications.year_built && (
                    <div><span className="text-slate-500">Tahun Bangun</span><br /><span className="font-semibold">{property.specifications.year_built}</span></div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* LAND & BUILDING */}
          {(property.land || property.building) && (
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <Home size={18} className="text-amber-500" />
                  Tanah & Bangunan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {property.land && (
                    <>
                      {property.land.land_area !== null && (
                        <div><span className="text-slate-500">Luas Tanah</span><br /><span className="font-semibold">{property.land.land_area} {property.land.land_unit}</span></div>
                      )}
                      {property.land.land_width !== null && (
                        <div><span className="text-slate-500">Lebar Tanah</span><br /><span className="font-semibold">{property.land.land_width} m</span></div>
                      )}
                      {property.land.land_length !== null && (
                        <div><span className="text-slate-500">Panjang Tanah</span><br /><span className="font-semibold">{property.land.land_length} m</span></div>
                      )}
                    </>
                  )}
                  {property.building && (
                    <>
                      {property.building.building_area !== null && (
                        <div><span className="text-slate-500">Luas Bangunan</span><br /><span className="font-semibold">{property.building.building_area} m²</span></div>
                      )}
                      {property.building.building_width !== null && (
                        <div><span className="text-slate-500">Lebar Bangunan</span><br /><span className="font-semibold">{property.building.building_width} m</span></div>
                      )}
                      {property.building.building_length !== null && (
                        <div><span className="text-slate-500">Panjang Bangunan</span><br /><span className="font-semibold">{property.building.building_length} m</span></div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN - 1/3 */}
        <div className="space-y-6">
          {/* PRICE CARD */}
          {property.price && (
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <DollarSign size={18} className="text-emerald-500" />
                  Harga
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-2">
                {property.listing_type === "jual" && (
                  <div>
                    <span className="text-slate-500 text-sm">Harga Jual</span>
                    <p className="text-2xl font-bold text-slate-800">{formatPrice(property.price.selling_price)}</p>
                  </div>
                )}
                {property.listing_type === "sewa" && (
                  <div>
                    <span className="text-slate-500 text-sm">Harga Sewa / Bulan</span>
                    <p className="text-2xl font-bold text-slate-800">{formatPrice(property.price.rental_price)}</p>
                  </div>
                )}
                {property.price.service_charge && (
                  <div className="text-sm"><span className="text-slate-500">Service Charge:</span> {formatPrice(property.price.service_charge)}</div>
                )}
                {property.price.maintenance_fee && (
                  <div className="text-sm"><span className="text-slate-500">IPL:</span> {formatPrice(property.price.maintenance_fee)}</div>
                )}
                {property.price.negotiable && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300">💰 Bisa Nego</Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* LOCATION CARD */}
          {property.address && (
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <MapPin size={18} className="text-emerald-500" />
                  Lokasi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-1 text-sm">
                <p><span className="text-slate-500">Alamat:</span> {property.address.address}</p>
                {property.address.village && <p><span className="text-slate-500">Kelurahan:</span> {property.address.village.name}</p>}
                {property.address.district && <p><span className="text-slate-500">Kecamatan:</span> {property.address.district.name}</p>}
                {property.address.city && <p><span className="text-slate-500">Kota:</span> {property.address.city.name}</p>}
                {property.address.province && <p><span className="text-slate-500">Provinsi:</span> {property.address.province.name}</p>}
                {property.address.country && <p><span className="text-slate-500">Negara:</span> {property.address.country.name}</p>}
                {property.address.postal_code && <p><span className="text-slate-500">Kode Pos:</span> {property.address.postal_code}</p>}
                {property.address.latitude && property.address.longitude && (
                  <p className="text-xs text-slate-400">
                    📍 {property.address.latitude}, {property.address.longitude}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* OWNER CARD */}
          {property.owner && (
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <User size={18} className="text-pink-500" />
                  Pemilik
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-1 text-sm">
                <p className="font-semibold">{property.owner.full_name}</p>
                {property.owner.phone && <p>📞 {property.owner.phone}</p>}
                {property.owner.whatsapp && <p>💬 {property.owner.whatsapp}</p>}
                {property.owner.email && <p>✉️ {property.owner.email}</p>}
              </CardContent>
            </Card>
          )}

          {/* META CARD */}
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-xl">
              <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                <Calendar size={18} className="text-slate-500" />
                Informasi Lainnya
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-1 text-sm">
              <div><span className="text-slate-500">Dibuat:</span> {new Date(property.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
              {property.published_at && (
                <div><span className="text-slate-500">Dipublikasi:</span> {new Date(property.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
              )}
              <div><span className="text-slate-500">Terakhir diupdate:</span> {new Date(property.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}