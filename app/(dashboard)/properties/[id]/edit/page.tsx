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
  const [initialData, setInitialData] = useState<any>(null);
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
        const isOwner = userRole === "agent" && (data.created_by === user.id);

        if (userRole === "reviewer" || (!isAdmin && !isOwner)) {
          toast.error("Anda tidak memiliki izin untuk mengedit listingan ini.");
          router.push(`/properties/${data.slug || propertyId}`);
          return;
        }

        // 4. Transformasikan data & Auto-Fetch Nama Lokasi
        const formatted = await mapPropertyToForm(data);
        setInitialData(formatted);

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

    if (Array.isArray(data.media) && data.media.length > 0) {
      rawList = data.media.map((m: any, idx: number) => {
        const url = m.public_url || m.file_url || m.url || m.file_path || "";
        return {
          id: m.id || `media-${idx}`,
          preview: url,
          url: url,
          public_url: m.public_url || url,
          storage_path: m.storage_path || url,
          media_type: m.media_type || "image",
          file_name: m.file_name || `existing_${idx}_${Date.now()}.jpg`,
          original_name: m.original_name || m.file_name || `existing_${idx}.jpg`,
          mime_type: m.mime_type || "image/jpeg",
          file_size: m.file_size || null,
          isExisting: true,
        };
      });
    }

    if (rawList.length === 0 && data.images) {
      if (Array.isArray(data.images)) {
        rawList = data.images.map((img: any, idx: number) => {
          const url = typeof img === "string" ? img : img.public_url || img.url || img.preview || img.file_url || "";
          return {
            id: `img-${idx}`,
            preview: url,
            url: url,
            public_url: url,
            storage_path: url,
            media_type: "image",
            file_name: `existing_img_${idx}_${Date.now()}.jpg`,
            original_name: `existing_img_${idx}.jpg`,
            mime_type: "image/jpeg",
            file_size: null,
            isExisting: true,
          };
        });
      } else if (typeof data.images === "string" && data.images.trim() !== "") {
        try {
          const parsed = JSON.parse(data.images);
          if (Array.isArray(parsed)) {
            rawList = parsed.map((img: any, idx: number) => {
              const url = typeof img === "string" ? img : img.public_url || img.url || img.preview || img.file_url || "";
              return {
                id: `parsed-${idx}`,
                preview: url,
                url: url,
                public_url: url,
                storage_path: url,
                media_type: "image",
                file_name: `existing_parsed_${idx}_${Date.now()}.jpg`,
                original_name: `existing_parsed_${idx}.jpg`,
                mime_type: "image/jpeg",
                file_size: null,
                isExisting: true,
              };
            });
          } else {
            rawList = [{
              id: "single-1",
              preview: data.images,
              url: data.images,
              public_url: data.images,
              storage_path: data.images,
              media_type: "image",
              file_name: `existing_single_${Date.now()}.jpg`,
              original_name: `existing_single.jpg`,
              mime_type: "image/jpeg",
              file_size: null,
              isExisting: true,
            }];
          }
        } catch {
          rawList = [{
            id: "string-1",
            preview: data.images,
            url: data.images,
            public_url: data.images,
            storage_path: data.images,
            media_type: "image",
            file_name: `existing_string_${Date.now()}.jpg`,
            original_name: `existing_string.jpg`,
            mime_type: "image/jpeg",
            file_size: null,
            isExisting: true,
          }];
        }
      }
    }

    if (rawList.length === 0 && data.image_url) {
      rawList = [{
        id: "fallback-1",
        preview: data.image_url,
        url: data.image_url,
        public_url: data.image_url,
        storage_path: data.image_url,
        media_type: "image",
        file_name: `existing_fallback_${Date.now()}.jpg`,
        original_name: `existing_fallback.jpg`,
        mime_type: "image/jpeg",
        file_size: null,
        isExisting: true,
      }];
    }

    return rawList;
  };

  // ===== MAP DATA KE FORM WIZARD (ASYNC & AUTO-FETCH NAMA LOKASI) =====
  const mapPropertyToForm = async (data: any) => {
    const existingPhotos = extractPhotos(data);

    let addr = data.address || data.property_address || {};
    if (Array.isArray(addr)) {
      addr = addr[0] || {};
    }

    const provId = addr.province_id || data.province_id || "";
    const cityId = addr.city_id || data.city_id || "";
    const distId = addr.district_id || data.district_id || "";
    const villId = addr.village_id || data.village_id || "";

    // Nama wilayah dibaca langsung dari `property_address`. Empat query lookup
    // ke tabel master (provinces/cities/districts/villages) tidak lagi diperlukan.
    let provName = addr.province_name || addr.provinces?.name || data.province_name || data.provinces?.name || "";
    let cityName = addr.city_name || addr.cities?.name || data.city_name || data.cities?.name || "";
    let distName = addr.district_name || addr.districts?.name || data.district_name || data.districts?.name || "";
    let villName = addr.village_name || addr.villages?.name || data.village_name || data.villages?.name || "";

    return {
      title: data.title || "",
      listing_code: data.listing_code || "",
      property_type: data.property_type || "",
      listing_type: data.listing_type || "jual",
      property_status: data.property_category || "",
      status: data.status || "published",
      description: data.description || "",
      selling_point: data.selling_point || "",
      rental_period: data.rental_period || "per_tahun",
      assigned_to: data.assigned_to || "",

      country_id: addr.country_id || data.country_id || "",
      province_id: provId,
      city_id: cityId,
      district_id: distId,
      village_id: villId,

      province_name: provName,
      city_name: cityName,
      district_name: distName,
      village_name: villName,

      address: typeof addr === "string" ? addr : addr.address || data.address || "",
      postal_code: addr.postal_code || data.postal_code || "",
      latitude: addr.latitude?.toString() || data.latitude?.toString() || "",
      longitude: addr.longitude?.toString() || data.longitude?.toString() || "",

      selling_price: data.price?.selling_price?.toString() || data.selling_price?.toString() || "",
      rental_price: data.price?.rental_price?.toString() || data.rental_price?.toString() || "",
      service_charge: data.price?.service_charge?.toString() || data.service_charge?.toString() || "",
      maintenance_fee: data.price?.maintenance_fee?.toString() || data.maintenance_fee?.toString() || "",
      negotiable: data.price?.negotiable ?? data.negotiable ?? false,

      bedroom: data.specifications?.bedroom?.toString() || data.bedroom?.toString() || "",
      bathroom: data.specifications?.bathroom?.toString() || data.bathroom?.toString() || "",
      garage: data.specifications?.garage?.toString() || data.garage?.toString() || "",
      carport: data.specifications?.carport?.toString() || data.carport?.toString() || "",
      floor: data.specifications?.floor?.toString() || data.floor?.toString() || "",
      electricity: data.specifications?.electricity?.toString() || data.electricity?.toString() || "",
      water_source: data.specifications?.water_source || data.water_source || "",
      certificate: data.specifications?.certificate || data.certificate || "",
      facing: data.specifications?.facing || data.facing || "",
      condition: data.specifications?.condition || data.condition || "",
      furnishing: data.specifications?.furnishing || data.furnishing || "",
      year_built: data.specifications?.year_built?.toString() || data.year_built?.toString() || "",

      land_area: data.land?.land_area?.toString() || data.land_area?.toString() || "",
      land_unit: data.land?.land_unit || data.land_unit || "m²",
      land_width: data.land?.land_width?.toString() || data.land_width?.toString() || "",
      land_length: data.land?.land_length?.toString() || data.land_length?.toString() || "",

      building_area: data.building?.building_area?.toString() || data.building_area?.toString() || "",
      building_width: data.building?.building_width?.toString() || data.building_width?.toString() || "",
      building_length: data.building?.building_length?.toString() || data.building_length?.toString() || "",

      owner_name: data.owner?.full_name || data.owner_name || "",
      owner_phone: data.owner?.phone || data.owner_phone || "",
      owner_whatsapp: data.owner?.whatsapp || data.owner_whatsapp || "",
      owner_email: data.owner?.email || data.owner_email || "",
      owner_identity_type: data.owner?.identity_type || data.owner_identity_type || "KTP",
      owner_identity_number: data.owner?.identity_number || data.owner_identity_number || "",
      owner_address: data.owner?.address || data.owner_address || "",
      owner_notes: data.owner?.notes || data.owner_notes || "",

      facilities: data.facilities || [],

      // 🟢 PERBAIKAN UTAMA: Pastikan data photos diberi flag lengkap agar wizard menganggapnya valid walau tidak disentuh
      photos: existingPhotos,
      photos_uploaded: existingPhotos.length > 0,
      media_completed: existingPhotos.length > 0,
      co_broke: data.co_broke || false,
      youtube_url: data.youtube_url || "",
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

  if (error || !initialData) {
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
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

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