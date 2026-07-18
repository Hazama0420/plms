// app/(dashboard)/properties/[id]/edit/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
  
  // ✅ Unwrap params dengan React.use()
  const { id: propertyId } = use(params);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) return;
      try {
        setLoading(true);
        const data = await propertyService.getById(propertyId);
        setProperty(data);
      } catch (err: any) {
        console.error("Error fetching property:", err);
        setError(err.message || "Gagal memuat data properti");
        toast.error("Gagal memuat data properti");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  // ===== MAP DATA KE FORM =====
  const mapPropertyToForm = (data: any) => {
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
      owner_identity_type: data.owner?.identity_type || "",
      owner_identity_number: data.owner?.identity_number || "",
      owner_address: data.owner?.address || "",
      owner_notes: data.owner?.notes || "",

      // Facilities (dari database - jika ada field terpisah)
      facilities: data.facilities || [],

      // Photos
      photos: [],
      photos_uploaded: false,
      co_broke: false,
      youtube_url: "",
    };
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto" />
          <p className="text-slate-500">Memuat data properti...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">😅</div>
          <p className="text-lg font-medium text-slate-700">Gagal memuat properti</p>
          <p className="text-sm text-slate-500">{error || "Properti tidak ditemukan"}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm"
          >
            Kembali
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