// app/(dashboard)/properties/[id]/edit/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import propertyService from "@/services/property.service";
import { CreatePropertyWizard } from "@/components/create-property/CreatePropertyWizard";

interface EditPropertyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditPropertyPage({ params }: EditPropertyPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Unwrap params dengan React.use()
  const { id: propertyId } = use(params);

  useEffect(() => {
    const fetchPropertyAndCheckAuth = async () => {
      if (!propertyId) return;
      try {
        setLoading(true);
        setError(null);

        // 1. Cek Sesi User & Role
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          toast.error("Silakan login terlebih dahulu");
          router.push("/login");
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const userRole = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();

        // 2. Fetch Data Properti
        const data = await propertyService.getById(propertyId);
        if (!data) {
          throw new Error("Data properti tidak ditemukan");
        }

        // 3. Cek Hak Akses Edit
        const isAdmin = userRole === "super_admin" || userRole === "admin" || userRole === "superadmin";
        // ✅ PERBAIKI: gunakan data.created_by, bukan data.user_id
        const isOwner = userRole === "agent" && (data.created_by === user.id);
        // Tambahkan juga kemungkinan assigned_to jika diperlukan
        // const isAssignedAgent = userRole === "agent" && data.assigned_to === user.id;

        if (userRole === "reviewer" || (!isAdmin && !isOwner)) {
          toast.error("Anda tidak memiliki izin untuk mengedit listingan ini.");
          router.push(`/properties/${propertyId}`);
          return;
        }

        setProperty(data);
      } catch (err: any) {
        console.error("Error fetching property or checking permissions:", err);
        setError(err.message || "Gagal memuat data properti");
        toast.error("Gagal memuat data properti");
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyAndCheckAuth();
  }, [propertyId, router]);

  // ===== HELPER: AMBIL DAN STRUCTURING FOTO EKSISTING =====
  const extractPhotos = (data: any) => {
    let rawList: any[] = [];

    // 1. Ambil dari data.media (Tabel media Supabase)
    if (Array.isArray(data.media) && data.media.length > 0) {
      rawList = data.media.map((m: any, idx: number) => {
        const url = m.public_url || m.url || m.file_path;
        return {
          id: m.id || `media-${idx}`,
          preview: url,
          url: url,
          isExisting: true,
        };
      });
    }

    // 2. Fallback dari data.images
    if (rawList.length === 0 && data.images) {
      if (Array.isArray(data.images)) {
        rawList = data.images.map((img: any, idx: number) => {
          const url = typeof img === "string" ? img : img.url || img.preview;
          return {
            id: `img-${idx}`,
            preview: url,
            url: url,
            isExisting: true,
          };
        });
      } else if (typeof data.images === "string" && data.images.trim() !== "") {
        try {
          const parsed = JSON.parse(data.images);
          if (Array.isArray(parsed)) {
            rawList = parsed.map((img: any, idx: number) => {
              const url = typeof img === "string" ? img : img.url || img.preview;
              return {
                id: `parsed-${idx}`,
                preview: url,
                url: url,
                isExisting: true,
              };
            });
          } else {
            rawList = [{ id: "single-1", preview: data.images, url: data.images, isExisting: true }];
          }
        } catch {
          rawList = [{ id: "string-1", preview: data.images, url: data.images, isExisting: true }];
        }
      }
    }

    // 3. Fallback dari data.image_url
    if (rawList.length === 0 && data.image_url) {
      rawList = [{ id: "fallback-1", preview: data.image_url, url: data.image_url, isExisting: true }];
    }

    return rawList;
  };

  // ===== MAP DATA KE FORM WIZARD =====
  const mapPropertyToForm = (data: any) => {
    const existingPhotos = extractPhotos(data);

    return {
      // Basic
      title: data.title || "",
      listing_code: data.listing_code || "",
      property_type: data.property_type || "",
      listing_type: data.listing_type || "jual",
      property_status: data.property_category || "",
      status: data.status || "published",
      description: data.description || "",
      selling_point: data.selling_point || "",
      rental_period: data.rental_period || "",
      assigned_to: data.assigned_to || "",

      // Location
      country_id: data.address?.country_id || "",
      province_id: data.address?.province_id || "",
      city_id: data.address?.city_id || "",
      district_id: data.address?.district_id || "",
      village_id: data.address?.village_id || "",
      address: data.address?.address || "",
      postal_code: data.address?.postal_code || "",
      latitude: data.address?.latitude?.toString() || "",
      longitude: data.address?.longitude?.toString() || "",

      // Price
      selling_price: data.price?.selling_price?.toString() || "",
      rental_price: data.price?.rental_price?.toString() || "",
      service_charge: data.price?.service_charge?.toString() || "",
      maintenance_fee: data.price?.maintenance_fee?.toString() || "",
      negotiable: data.price?.negotiable || false,

      // Specifications
      bedroom: data.specifications?.bedroom?.toString() || "",
      bathroom: data.specifications?.bathroom?.toString() || "",
      garage: data.specifications?.garage?.toString() || "",
      carport: data.specifications?.carport?.toString() || "",
      floor: data.specifications?.floor?.toString() || "",
      electricity: data.specifications?.electricity?.toString() || "",
      water_source: data.specifications?.water_source || "",
      certificate: data.specifications?.certificate || "",
      facing: data.specifications?.facing || "",
      condition: data.specifications?.condition || "",
      furnishing: data.specifications?.furnishing || "",
      year_built: data.specifications?.year_built?.toString() || "",

      // Land
      land_area: data.land?.land_area?.toString() || "",
      land_unit: data.land?.land_unit || "m²",
      land_width: data.land?.land_width?.toString() || "",
      land_length: data.land?.land_length?.toString() || "",

      // Building
      building_area: data.building?.building_area?.toString() || "",
      building_width: data.building?.building_width?.toString() || "",
      building_length: data.building?.building_length?.toString() || "",

      // Owner
      owner_name: data.owner?.full_name || "",
      owner_phone: data.owner?.phone || "",
      owner_whatsapp: data.owner?.whatsapp || "",
      owner_email: data.owner?.email || "",
      owner_identity_type: data.owner?.identity_type || "KTP",
      owner_identity_number: data.owner?.identity_number || "",
      owner_address: data.owner?.address || "",
      owner_notes: data.owner?.notes || "",

      // Facilities
      facilities: data.facilities || [],

      // 📸 FIX PENTING FOTO MODE EDIT:
      photos: existingPhotos,
      // Selalu nyalakan photos_uploaded jika mode edit / foto ada
      photos_uploaded: true,
      media_completed: true,
      co_broke: false,
      youtube_url: "",
    };
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto" />
          <p className="text-slate-500 text-sm">Memeriksa hak akses & memuat data properti...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4 p-6 max-w-md bg-white dark:bg-slate-900 rounded-2xl border shadow-sm">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">Akses Ditolak / Gagal Memuat</p>
          <p className="text-xs text-slate-500">{error || "Properti tidak ditemukan atau Anda tidak memiliki akses edit."}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition"
          >
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  const initialData = mapPropertyToForm(property);

  return (
    <CreatePropertyWizard
      initialData={initialData}
      mode="edit"
      propertyId={propertyId}
      onSuccess={() => {
        toast.success("Property berhasil diupdate!");
        router.push("/properties");
      }}
    />
  );
}