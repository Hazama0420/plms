"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  X,
  Home,
  MapPin,
  Building2,
  User,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Sparkle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { propertyService } from "@/services/property.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AIChatbox } from "@/components/ai-chatbox";

// ============================================================
// TIPE DATA
// ============================================================
interface LocationData {
  countries: { id: string; name: string }[];
  provinces: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  districts: { id: string; name: string }[];
  villages: { id: string; name: string }[];
}

interface PropertyFormData {
  title: string;
  listing_code: string;
  property_type: string;
  listing_type: "jual" | "sewa";
  property_category: string; // second, aset_bank, baru
  status: "draft" | "review" | "published";
  description: string;
  selling_point: string;
  country_id: string;
  province_id: string;
  city_id: string;
  district_id: string;
  village_id: string;
  address: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  selling_price: string;
  rental_price: string;
  service_charge: string;
  maintenance_fee: string;
  rental_period: string;
  negotiable: boolean;
  bedroom: string;
  bathroom: string;
  garage: string;
  carport: string;
  floor: string;
  electricity: string;
  water_source: string;
  certificate: string;
  facing: string;
  condition: string;
  furnishing: string;
  year_built: string;
  land_area: string;
  land_unit: string;
  land_width: string;
  land_length: string;
  building_area: string;
  building_width: string;
  building_length: string;
  owner_name: string;
  owner_phone: string;
  owner_whatsapp: string;
  owner_email: string;
  owner_identity_type: string;
  owner_identity_number: string;
  owner_address: string;
  owner_notes: string;
  images: File[];
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [locationData, setLocationData] = useState<LocationData>({
    countries: [],
    provinces: [],
    cities: [],
    districts: [],
    villages: [],
  });
  const [loadingLocation, setLoadingLocation] = useState({
    countries: false,
    provinces: false,
    cities: false,
    districts: false,
    villages: false,
  });
  const [form, setForm] = useState<PropertyFormData>({
    title: "",
    listing_code: "",
    property_type: "",
    listing_type: "jual",
    property_category: "",
    status: "draft",
    description: "",
    selling_point: "",
    country_id: "",
    province_id: "",
    city_id: "",
    district_id: "",
    village_id: "",
    address: "",
    postal_code: "",
    latitude: "",
    longitude: "",
    selling_price: "",
    rental_price: "",
    service_charge: "",
    maintenance_fee: "",
    rental_period: "",
    negotiable: false,
    bedroom: "",
    bathroom: "",
    garage: "",
    carport: "",
    floor: "",
    electricity: "",
    water_source: "",
    certificate: "",
    facing: "",
    condition: "",
    furnishing: "",
    year_built: "",
    land_area: "",
    land_unit: "m²",
    land_width: "",
    land_length: "",
    building_area: "",
    building_width: "",
    building_length: "",
    owner_name: "",
    owner_phone: "",
    owner_whatsapp: "",
    owner_email: "",
    owner_identity_type: "",
    owner_identity_number: "",
    owner_address: "",
    owner_notes: "",
    images: [],
  });
  const [existingImages, setExistingImages] = useState<{ id: string; url: string; isPrimary: boolean }[]>([]);

  // AI Loading State
  const [aiLoading, setAiLoading] = useState({
    title: false,
    description: false,
  });

  // ============================================================
  // FETCH DATA
  // ============================================================
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const property = await propertyService.getById(id);

        setForm({
          title: property.title || "",
          listing_code: property.listing_code || "",
          property_type: property.property_type || "",
          listing_type: property.listing_type || "jual",
          property_category: property.property_category || "",
          status: property.status || "draft",
          description: property.description || "",
          selling_point: property.selling_point || "",
          country_id: property.address?.country_id || "",
          province_id: property.address?.province_id || "",
          city_id: property.address?.city_id || "",
          district_id: property.address?.district_id || "",
          village_id: property.address?.village_id || "",
          address: property.address?.address || "",
          postal_code: property.address?.postal_code || "",
          latitude: property.address?.latitude?.toString() || "",
          longitude: property.address?.longitude?.toString() || "",
          selling_price: property.price?.selling_price?.toString() || "",
          rental_price: property.price?.rental_price?.toString() || "",
          service_charge: property.price?.service_charge?.toString() || "",
          maintenance_fee: property.price?.maintenance_fee?.toString() || "",
          rental_period: property.rental_period || "",
          negotiable: property.price?.negotiable || false,
          bedroom: property.specifications?.bedroom?.toString() || "",
          bathroom: property.specifications?.bathroom?.toString() || "",
          garage: property.specifications?.garage?.toString() || "",
          carport: property.specifications?.carport?.toString() || "",
          floor: property.specifications?.floor?.toString() || "",
          electricity: property.specifications?.electricity?.toString() || "",
          water_source: property.specifications?.water_source || "",
          certificate: property.specifications?.certificate || "",
          facing: property.specifications?.facing || "",
          condition: property.specifications?.condition || "",
          furnishing: property.specifications?.furnishing || "",
          year_built: property.specifications?.year_built?.toString() || "",
          land_area: property.land?.land_area?.toString() || "",
          land_unit: property.land?.land_unit || "m²",
          land_width: property.land?.land_width?.toString() || "",
          land_length: property.land?.land_length?.toString() || "",
          building_area: property.building?.building_area?.toString() || "",
          building_width: property.building?.building_width?.toString() || "",
          building_length: property.building?.building_length?.toString() || "",
          owner_name: property.owner?.full_name || "",
          owner_phone: property.owner?.phone || "",
          owner_whatsapp: property.owner?.whatsapp || "",
          owner_email: property.owner?.email || "",
          owner_identity_type: property.owner?.identity_type || "",
          owner_identity_number: property.owner?.identity_number || "",
          owner_address: property.owner?.address || "",
          owner_notes: property.owner?.notes || "",
          images: [],
        });

        if (property.media && property.media.length > 0) {
          setExistingImages(
            property.media.map((m: any) => ({
              id: m.id,
              url: m.public_url,
              isPrimary: m.is_primary,
            }))
          );
        }

        // Load location dropdowns
        await fetchCountries();
        if (property.address?.country_id) {
          await fetchProvinces(property.address.country_id);
        }
        if (property.address?.province_id) {
          await fetchCities(property.address.province_id);
        }
        if (property.address?.city_id) {
          await fetchDistricts(property.address.city_id);
        }
        if (property.address?.district_id) {
          await fetchVillages(property.address.district_id);
        }
      } catch (error: any) {
        console.error("Error fetching property:", error);
        toast.error("Gagal memuat data property", { description: error.message });
        router.push("/properties");
      } finally {
        setLoadingData(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  // ============================================================
  // FETCH LOCATION
  // ============================================================
  const fetchCountries = async () => {
    setLoadingLocation((prev) => ({ ...prev, countries: true }));
    try {
      const { data, error } = await supabase
        .from("countries")
        .select("id, name")
        .order("name");
      if (error) throw error;
      setLocationData((prev) => ({ ...prev, countries: data || [] }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLocation((prev) => ({ ...prev, countries: false }));
    }
  };

  const fetchProvinces = async (countryId: string) => {
    if (!countryId) return;
    setLoadingLocation((prev) => ({ ...prev, provinces: true }));
    try {
      const { data, error } = await supabase
        .from("provinces")
        .select("id, name")
        .eq("country_id", countryId)
        .order("name");
      if (error) throw error;
      setLocationData((prev) => ({ ...prev, provinces: data || [] }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLocation((prev) => ({ ...prev, provinces: false }));
    }
  };

  const fetchCities = async (provinceId: string) => {
    if (!provinceId) return;
    setLoadingLocation((prev) => ({ ...prev, cities: true }));
    try {
      const { data, error } = await supabase
        .from("cities")
        .select("id, name")
        .eq("province_id", provinceId)
        .order("name");
      if (error) throw error;
      setLocationData((prev) => ({ ...prev, cities: data || [] }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLocation((prev) => ({ ...prev, cities: false }));
    }
  };

  const fetchDistricts = async (cityId: string) => {
    if (!cityId) return;
    setLoadingLocation((prev) => ({ ...prev, districts: true }));
    try {
      const { data, error } = await supabase
        .from("districts")
        .select("id, name")
        .eq("city_id", cityId)
        .order("name");
      if (error) throw error;
      setLocationData((prev) => ({ ...prev, districts: data || [] }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLocation((prev) => ({ ...prev, districts: false }));
    }
  };

  const fetchVillages = async (districtId: string) => {
    if (!districtId) return;
    setLoadingLocation((prev) => ({ ...prev, villages: true }));
    try {
      const { data, error } = await supabase
        .from("villages")
        .select("id, name")
        .eq("district_id", districtId)
        .order("name");
      if (error) throw error;
      setLocationData((prev) => ({ ...prev, villages: data || [] }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLocation((prev) => ({ ...prev, villages: false }));
    }
  };

  // ============================================================
  // AI GENERATE
  // ============================================================
  const generateAIField = async (field: "title" | "description") => {
  if (field === "title" && !form.property_type && !form.address) {
    toast.warning("Isi minimal tipe property dan alamat dulu.");
    return;
  }

  setAiLoading((prev) => ({ ...prev, [field]: true }));

  // Tentukan action
  let action = field === "title" ? "title" : "description";
  
  // Jika field = description dan isi textarea tidak kosong, pakai enhance_description
  if (field === "description" && form.description.trim()) {
    action = "enhance_description";
  }

  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: action,
        data: {
          type: form.property_type || "property",
          location: form.address || "lokasi strategis",
          listingType: form.listing_type,
          price: form.selling_price || form.rental_price || 0,
          bedrooms: form.bedroom || 0,
          bathrooms: form.bathroom || 0,
          landArea: form.land_area || 0,
          buildingArea: form.building_area || 0,
          existingText: form.description, // kirim isi textarea untuk enhance
        },
      }),
    });

    const result = await res.json();
    if (result.success) {
      handleChange(field, result.data);
      const mode = action === "enhance_description" ? "diperbaiki" : "dibuat";
      toast.success(`✅ ${field === "title" ? "Judul" : "Deskripsi"} berhasil ${mode} dengan AI (${result.provider})`);
    } else {
      toast.error(result.error || `Gagal generate ${field}`);
    }
  } catch (error) {
    console.error("AI error:", error);
    toast.error("Gagal terhubung ke AI");
  } finally {
    setAiLoading((prev) => ({ ...prev, [field]: false }));
  }
};

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleChange = (field: keyof PropertyFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (field: keyof PropertyFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === "country_id") {
      setForm((prev) => ({ ...prev, province_id: "", city_id: "", district_id: "", village_id: "" }));
      setLocationData((prev) => ({ ...prev, provinces: [], cities: [], districts: [], villages: [] }));
      fetchProvinces(value);
    } else if (field === "province_id") {
      setForm((prev) => ({ ...prev, city_id: "", district_id: "", village_id: "" }));
      setLocationData((prev) => ({ ...prev, cities: [], districts: [], villages: [] }));
      fetchCities(value);
    } else if (field === "city_id") {
      setForm((prev) => ({ ...prev, district_id: "", village_id: "" }));
      setLocationData((prev) => ({ ...prev, districts: [], villages: [] }));
      fetchDistricts(value);
    } else if (field === "district_id") {
      setForm((prev) => ({ ...prev, village_id: "" }));
      setLocationData((prev) => ({ ...prev, villages: [] }));
      fetchVillages(value);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setForm((prev) => ({ ...prev, images: [...prev.images, ...files] }));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const removeExistingImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from("property_media")
        .delete()
        .eq("id", imageId);
      if (error) throw error;
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Foto berhasil dihapus");
    } catch (error: any) {
      toast.error("Gagal hapus foto", { description: error.message });
    }
  };

  // ============================================================
  // SCROLL TO FIELD
  // ============================================================
  const scrollToError = (field: keyof PropertyFormData) => {
    const tabMap: Record<string, string> = {
      title: "basic",
      property_type: "basic",
      listing_type: "basic",
      selling_price: "basic",
      rental_price: "basic",
      address: "location",
    };
    const tab = tabMap[field] || "basic";
    setActiveTab(tab);
    setTimeout(() => {
      const element = document.getElementById(`field-${field}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus();
      }
    }, 150);
  };

  // ============================================================
  // SUBMIT
  // ============================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!form.title) {
      toast.error("Judul property wajib diisi.");
      scrollToError("title");
      return;
    }
    if (!form.property_type) {
      toast.error("Tipe property wajib dipilih.");
      scrollToError("property_type");
      return;
    }
    if (!form.address) {
      toast.error("Alamat wajib diisi.");
      scrollToError("address");
      return;
    }
    if (form.listing_type === "jual" && !form.selling_price) {
      toast.error("Harga jual wajib diisi.");
      scrollToError("selling_price");
      return;
    }
    if (form.listing_type === "sewa" && !form.rental_price) {
      toast.error("Harga sewa wajib diisi.");
      scrollToError("rental_price");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // 1. Update Property
      const { error: propertyError } = await supabase
        .from("properties")
        .update({
          title: form.title,
          listing_code: form.listing_code || `PRP-${Date.now()}`,
          property_type: form.property_type,
          listing_type: form.listing_type,
          property_category: form.property_category || null,
          status: form.status,
          description: form.description || null,
          selling_point: form.selling_point || null,
          rental_period: form.rental_period || null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (propertyError) throw propertyError;

      // 2. Handle Owner
      const { data: currentProp } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", id)
        .maybeSingle();

      let ownerId = currentProp?.owner_id;

      if (form.owner_name) {
        if (ownerId) {
          const { error: ownerError } = await supabase
            .from("property_owners")
            .update({
              full_name: form.owner_name,
              phone: form.owner_phone || null,
              whatsapp: form.owner_whatsapp || null,
              email: form.owner_email || null,
              identity_type: form.owner_identity_type || null,
              identity_number: form.owner_identity_number || null,
              address: form.owner_address || null,
              notes: form.owner_notes || null,
            })
            .eq("id", ownerId);
          if (ownerError) throw ownerError;
        } else {
          const { data: newOwner, error: newOwnerError } = await supabase
            .from("property_owners")
            .insert({
              owner_code: `OWN-${Date.now()}`,
              full_name: form.owner_name,
              phone: form.owner_phone || null,
              whatsapp: form.owner_whatsapp || null,
              email: form.owner_email || null,
              identity_type: form.owner_identity_type || null,
              identity_number: form.owner_identity_number || null,
              address: form.owner_address || null,
              notes: form.owner_notes || null,
            })
            .select()
            .single();
          if (newOwnerError) throw newOwnerError;
          ownerId = newOwner.id;
          await supabase
            .from("properties")
            .update({ owner_id: ownerId })
            .eq("id", id);
        }
      }

      // 3. Upsert Address
      const { data: existingAddress } = await supabase
        .from("property_address")
        .select("id")
        .eq("property_id", id)
        .maybeSingle();

      const addressData = {
        property_id: id,
        country_id: form.country_id || null,
        province_id: form.province_id || null,
        city_id: form.city_id || null,
        district_id: form.district_id || null,
        village_id: form.village_id || null,
        postal_code: form.postal_code || null,
        address: form.address,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };

      if (existingAddress) {
        await supabase
          .from("property_address")
          .update(addressData)
          .eq("property_id", id);
      } else {
        await supabase
          .from("property_address")
          .insert(addressData);
      }

      // 4. Upsert Price
      const { data: existingPrice } = await supabase
        .from("property_price")
        .select("id")
        .eq("property_id", id)
        .maybeSingle();

      const priceData = {
        property_id: id,
        selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
        rental_price: form.rental_price ? parseFloat(form.rental_price) : null,
        service_charge: form.service_charge ? parseFloat(form.service_charge) : null,
        maintenance_fee: form.maintenance_fee ? parseFloat(form.maintenance_fee) : null,
        negotiable: form.negotiable,
      };

      if (existingPrice) {
        await supabase.from("property_price").update(priceData).eq("property_id", id);
      } else {
        await supabase.from("property_price").insert(priceData);
      }

      // 5. Upsert Specifications
      const { data: existingSpec } = await supabase
        .from("property_specifications")
        .select("id")
        .eq("property_id", id)
        .maybeSingle();

      const specData = {
        property_id: id,
        bedroom: form.bedroom ? parseInt(form.bedroom) : null,
        bathroom: form.bathroom ? parseInt(form.bathroom) : null,
        garage: form.garage ? parseInt(form.garage) : null,
        carport: form.carport ? parseInt(form.carport) : null,
        floor: form.floor ? parseInt(form.floor) : null,
        electricity: form.electricity ? parseInt(form.electricity) : null,
        water_source: form.water_source || null,
        certificate: form.certificate || null,
        facing: form.facing || null,
        condition: form.condition || null,
        furnishing: form.furnishing || null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
      };

      if (existingSpec) {
        await supabase.from("property_specifications").update(specData).eq("property_id", id);
      } else {
        await supabase.from("property_specifications").insert(specData);
      }

      // 6. Upsert Land
      const { data: existingLand } = await supabase
        .from("property_land")
        .select("id")
        .eq("property_id", id)
        .maybeSingle();

      const landData = {
        property_id: id,
        land_area: form.land_area ? parseFloat(form.land_area) : null,
        land_unit: form.land_unit || "m²",
        land_width: form.land_width ? parseFloat(form.land_width) : null,
        land_length: form.land_length ? parseFloat(form.land_length) : null,
      };

      if (existingLand) {
        await supabase.from("property_land").update(landData).eq("property_id", id);
      } else {
        await supabase.from("property_land").insert(landData);
      }

      // 7. Upsert Building
      const { data: existingBuilding } = await supabase
        .from("property_building")
        .select("id")
        .eq("property_id", id)
        .maybeSingle();

      const buildingData = {
        property_id: id,
        building_area: form.building_area ? parseFloat(form.building_area) : null,
        building_width: form.building_width ? parseFloat(form.building_width) : null,
        building_length: form.building_length ? parseFloat(form.building_length) : null,
      };

      if (existingBuilding) {
        await supabase.from("property_building").update(buildingData).eq("property_id", id);
      } else {
        await supabase.from("property_building").insert(buildingData);
      }

      // 8. Upload new images
      if (form.images.length > 0) {
        let failedUploads = 0;
        for (let i = 0; i < form.images.length; i++) {
          const file = form.images[i];
          const filePath = `properties/${id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("property-media")
            .upload(filePath, file, { cacheControl: "3600", upsert: false });

          if (uploadError) {
            console.error("Upload error for file", file.name, uploadError);
            failedUploads++;
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("property-media")
            .getPublicUrl(filePath);

          await supabase.from("property_media").insert({
            property_id: id,
            media_type: "image",
            file_name: file.name,
            original_name: file.name,
            storage_path: filePath,
            public_url: urlData.publicUrl,
            mime_type: file.type,
            file_size: file.size,
            is_primary: existingImages.length === 0 && i === 0,
            sort_order: existingImages.length + i,
            uploaded_by: user.id,
          });
        }
        if (failedUploads > 0) {
          toast.warning(`${failedUploads} file gagal diupload.`, {
            description: "Property tetap tersimpan, tapi sebagian foto tidak lengkap.",
            duration: 5000,
          });
        }
      }

      toast.success("Property berhasil diperbarui!");
      router.push(`/properties/${id}`);
    } catch (error: any) {
      console.error("Error updating property:", error);
      let errorMessage = "Gagal update property.";
      let errorDetails = "";
      if (error?.code === "42501") {
        errorMessage = "Anda tidak memiliki izin untuk mengubah data. Hubungi administrator.";
      } else if (error?.code === "23505") {
        errorMessage = "Data duplikat terdeteksi. Periksa kembali input.";
      } else if (error?.message) {
        errorMessage = error.message;
        errorDetails = error?.details || error?.hint || "";
      }
      toast.error(errorMessage, {
        description: errorDetails || "Silakan coba lagi.",
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* HEADER GRADIENT */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-10 w-10 text-white hover:bg-white/20"
              >
                <ArrowLeft size={22} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">✏️ Edit Property</h1>
                <p className="text-sm text-white/80">Perbarui data property</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              {form.listing_code || "PRP-..."}
            </Badge>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6 bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="basic" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">📋 Basic</TabsTrigger>
                  <TabsTrigger value="location" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">📍 Lokasi</TabsTrigger>
                  <TabsTrigger value="specs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">🔧 Spesifikasi</TabsTrigger>
                  <TabsTrigger value="land" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">📐 Tanah</TabsTrigger>
                  <TabsTrigger value="owner" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">👤 Pemilik</TabsTrigger>
                  <TabsTrigger value="media" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">🖼️ Media</TabsTrigger>
                </TabsList>

                {/* BASIC TAB */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <Card className="border-0 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                        <Home size={18} className="text-blue-500" />
                        Informasi Dasar
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2" id="field-title">
                          <Label htmlFor="title" className="font-medium">Judul Property <span className="text-rose-500">*</span></Label>
                          <div className="flex gap-2">
                            <Input
                              id="title"
                              placeholder="Contoh: Rumah Minimalis Modern di BSD"
                              value={form.title}
                              onChange={(e) => handleChange("title", e.target.value)}
                              className="flex-1 border-blue-200 focus:ring-blue-500"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => generateAIField("title")}
                              disabled={aiLoading.title}
                              className="shrink-0 border-blue-300 hover:bg-blue-50"
                            >
                              {aiLoading.title ? (
                                <span className="animate-spin">⏳</span>
                              ) : (
                                <Sparkle size={16} className="text-blue-500" />
                              )}
                              <span className="ml-1 text-xs">AI</span>
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="listing_code" className="font-medium">Kode Listing</Label>
                          <Input
                            id="listing_code"
                            placeholder="PRP-202507-001"
                            value={form.listing_code}
                            onChange={(e) => handleChange("listing_code", e.target.value)}
                            className="border-blue-200 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4" id="field-property_type">
                        <div className="space-y-2">
                          <Label htmlFor="property_type" className="font-medium">Tipe Property <span className="text-rose-500">*</span></Label>
                          <Select value={form.property_type} onValueChange={(val) => handleChange("property_type", val)}>
                            <SelectTrigger className="border-blue-200 focus:ring-blue-500">
                              <SelectValue placeholder="Pilih tipe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rumah">🏠 Rumah</SelectItem>
                              <SelectItem value="apartemen">🏢 Apartemen</SelectItem>
                              <SelectItem value="tanah">🌿 Tanah</SelectItem>
                              <SelectItem value="villa">🏖️ Villa</SelectItem>
                              <SelectItem value="ruko">🏪 Ruko</SelectItem>
                              <SelectItem value="kantor">🏢 Kantor</SelectItem>
                              <SelectItem value="pabrik">🏭 Pabrik</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="listing_type" className="font-medium">Tipe Listing <span className="text-rose-500">*</span></Label>
                          <Select value={form.listing_type} onValueChange={(val) => handleChange("listing_type", val)}>
                            <SelectTrigger className="border-blue-200 focus:ring-blue-500">
                              <SelectValue placeholder="Pilih tipe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="jual">💰 Jual</SelectItem>
                              <SelectItem value="sewa">📋 Sewa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="property_category" className="font-medium">Jenis Properti</Label>
                          <Select
                            value={form.property_category}
                            onValueChange={(val) => handleChange("property_category", val)}
                          >
                            <SelectTrigger className="border-blue-200 focus:ring-blue-500">
                              <SelectValue placeholder="Pilih jenis" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">-</SelectItem>
                              <SelectItem value="second">Second</SelectItem>
                              <SelectItem value="aset_bank">Aset Bank</SelectItem>
                              <SelectItem value="baru">Baru</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status" className="font-medium">Status</Label>
                          <Select value={form.status} onValueChange={(val) => handleChange("status", val)}>
                            <SelectTrigger className="border-blue-200 focus:ring-blue-500">
                              <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">📝 Draft</SelectItem>
                              <SelectItem value="review">👀 Review</SelectItem>
                              <SelectItem value="published">🚀 Published</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="description" className="font-medium">Deskripsi Lengkap</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => generateAIField("description")}
                            disabled={aiLoading.description}
                            className="text-blue-600"
                          >
                            {aiLoading.description ? "⏳ Generating..." : "✨ AI Generate Deskripsi"}
                          </Button>
                        </div>
                        <Textarea
                          id="description"
                          placeholder="Tulis deskripsi detail tentang property ini..."
                          value={form.description}
                          onChange={(e) => handleChange("description", e.target.value)}
                          rows={4}
                          className="border-blue-200 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="selling_point" className="font-medium">💎 Selling Point</Label>
                        <Input
                          id="selling_point"
                          placeholder="Contoh: Dekat mall, akses tol, view gunung"
                          value={form.selling_point}
                          onChange={(e) => handleChange("selling_point", e.target.value)}
                          className="border-blue-200 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t" id="field-selling_price">
                        <div className="space-y-2">
                          <Label htmlFor="selling_price" className="font-medium">
                            Harga Jual {form.listing_type === "jual" && <span className="text-rose-500">*</span>}
                          </Label>
                          <Input
                            id="selling_price"
                            type="number"
                            placeholder="2500000000"
                            value={form.selling_price}
                            onChange={(e) => handleChange("selling_price", e.target.value)}
                            className="border-blue-200 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-2" id="field-rental_price">
                          <Label htmlFor="rental_price" className="font-medium">
                            Harga Sewa / Bulan {form.listing_type === "sewa" && <span className="text-rose-500">*</span>}
                          </Label>
                          <Input
                            id="rental_price"
                            type="number"
                            placeholder="8500000"
                            value={form.rental_price}
                            onChange={(e) => handleChange("rental_price", e.target.value)}
                            className="border-blue-200 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {form.listing_type === "sewa" && (
                          <div className="space-y-2">
                            <Label htmlFor="rental_period" className="font-medium">Periode Sewa</Label>
                            <Select
                              value={form.rental_period}
                              onValueChange={(val) => handleChange("rental_period", val)}
                            >
                              <SelectTrigger className="border-blue-200 focus:ring-blue-500">
                                <SelectValue placeholder="Pilih periode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">-</SelectItem>
                                <SelectItem value="per_hari">Per Hari</SelectItem>
                                <SelectItem value="per_minggu">Per Minggu</SelectItem>
                                <SelectItem value="per_bulan">Per Bulan</SelectItem>
                                <SelectItem value="per_tahun">Per Tahun</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="service_charge">Service Charge</Label>
                          <Input
                            id="service_charge"
                            type="number"
                            placeholder="500000"
                            value={form.service_charge}
                            onChange={(e) => handleChange("service_charge", e.target.value)}
                            className="border-blue-200 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="maintenance_fee">IPL / Maintenance Fee</Label>
                          <Input
                            id="maintenance_fee"
                            type="number"
                            placeholder="300000"
                            value={form.maintenance_fee}
                            onChange={(e) => handleChange("maintenance_fee", e.target.value)}
                            className="border-blue-200 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            id="negotiable"
                            checked={form.negotiable}
                            onCheckedChange={(val) => handleChange("negotiable", val)}
                          />
                          <Label htmlFor="negotiable">Harga Bisa Nego</Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* LOCATION TAB */}
                <TabsContent value="location" className="space-y-4 mt-4">
                  <Card className="border-0 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                        <MapPin size={18} className="text-emerald-500" />
                        Alamat & Lokasi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="country_id">Negara</Label>
                        <Select
                          value={form.country_id}
                          onValueChange={(val) => handleLocationChange("country_id", val)}
                          disabled={loadingLocation.countries}
                        >
                          <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                            <SelectValue placeholder={loadingLocation.countries ? "Loading..." : "Pilih negara"} />
                          </SelectTrigger>
                          <SelectContent>
                            {locationData.countries.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="province_id">Provinsi</Label>
                        <Select
                          value={form.province_id}
                          onValueChange={(val) => handleLocationChange("province_id", val)}
                          disabled={!form.country_id || loadingLocation.provinces}
                        >
                          <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                            <SelectValue placeholder={loadingLocation.provinces ? "Loading..." : "Pilih provinsi"} />
                          </SelectTrigger>
                          <SelectContent>
                            {locationData.provinces.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city_id">Kota / Kabupaten</Label>
                        <Select
                          value={form.city_id}
                          onValueChange={(val) => handleLocationChange("city_id", val)}
                          disabled={!form.province_id || loadingLocation.cities}
                        >
                          <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                            <SelectValue placeholder={loadingLocation.cities ? "Loading..." : "Pilih kota"} />
                          </SelectTrigger>
                          <SelectContent>
                            {locationData.cities.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="district_id">Kecamatan</Label>
                        <Select
                          value={form.district_id}
                          onValueChange={(val) => handleLocationChange("district_id", val)}
                          disabled={!form.city_id || loadingLocation.districts}
                        >
                          <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                            <SelectValue placeholder={loadingLocation.districts ? "Loading..." : "Pilih kecamatan"} />
                          </SelectTrigger>
                          <SelectContent>
                            {locationData.districts.map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="village_id">Kelurahan / Desa</Label>
                        <Select
                          value={form.village_id}
                          onValueChange={(val) => handleLocationChange("village_id", val)}
                          disabled={!form.district_id || loadingLocation.villages}
                        >
                          <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                            <SelectValue placeholder={loadingLocation.villages ? "Loading..." : "Pilih kelurahan"} />
                          </SelectTrigger>
                          <SelectContent>
                            {locationData.villages.map((v) => (
                              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2" id="field-address">
                        <Label htmlFor="address" className="font-medium">Alamat Lengkap <span className="text-rose-500">*</span></Label>
                        <Textarea
                          id="address"
                          placeholder="Jl. BSD Raya No. 12, Serpong"
                          value={form.address}
                          onChange={(e) => handleChange("address", e.target.value)}
                          rows={3}
                          className="border-emerald-200 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="postal_code">Kode Pos</Label>
                          <Input
                            id="postal_code"
                            placeholder="15310"
                            value={form.postal_code}
                            onChange={(e) => handleChange("postal_code", e.target.value)}
                            className="border-emerald-200 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="latitude">Latitude</Label>
                          <Input
                            id="latitude"
                            placeholder="-6.3223"
                            value={form.latitude}
                            onChange={(e) => handleChange("latitude", e.target.value)}
                            className="border-emerald-200 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="longitude">Longitude</Label>
                          <Input
                            id="longitude"
                            placeholder="106.6186"
                            value={form.longitude}
                            onChange={(e) => handleChange("longitude", e.target.value)}
                            className="border-emerald-200 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* SPECS TAB */}
                <TabsContent value="specs" className="space-y-4 mt-4">
                  <Card className="border-0 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-xl">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                        <Building2 size={18} className="text-purple-500" />
                        Spesifikasi Property
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bedroom">🛏️ Kamar Tidur</Label>
                          <Input
                            id="bedroom"
                            type="number"
                            placeholder="3"
                            value={form.bedroom}
                            onChange={(e) => handleChange("bedroom", e.target.value)}
                            className="border-purple-200 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bathroom">🛁 Kamar Mandi</Label>
                          <Input
                            id="bathroom"
                            type="number"
                            placeholder="2"
                            value={form.bathroom}
                            onChange={(e) => handleChange("bathroom", e.target.value)}
                            className="border-purple-200 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="garage">🚗 Garasi</Label>
                          <Input
                            id="garage"
                            type="number"
                            placeholder="1"
                            value={form.garage}
                            onChange={(e) => handleChange("garage", e.target.value)}
                            className="border-purple-200 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="carport">🏎️ Carport</Label>
                          <Input
                            id="carport"
                            type="number"
                            placeholder="1"
                            value={form.carport}
                            onChange={(e) => handleChange("carport", e.target.value)}
                            className="border-purple-200 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="floor">🏗️ Jumlah Lantai</Label>
                          <Input
                            id="floor"
                            type="number"
                            placeholder="2"
                            value={form.floor}
                            onChange={(e) => handleChange("floor", e.target.value)}
                            className="border-purple-200 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="electricity">⚡ Daya Listrik (VA)</Label>
                          <Input
                            id="electricity"
                            type="number"
                            placeholder="2200"
                            value={form.electricity}
                            onChange={(e) => handleChange("electricity", e.target.value)}
                            className="border-purple-200 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="water_source">💧 Sumber Air</Label>
                          <Select value={form.water_source} onValueChange={(val) => handleChange("water_source", val)}>
                            <SelectTrigger className="border-purple-200 focus:ring-purple-500">
                              <SelectValue placeholder="Pilih sumber air" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pdam">PDAM</SelectItem>
                              <SelectItem value="sumur">Sumur</SelectItem>
                              <SelectItem value="pdam_sumur">PDAM + Sumur</SelectItem>
                              <SelectItem value="air_pegunungan">Air Pegunungan</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="certificate">📜 Sertifikat</Label>
                          <Select value={form.certificate} onValueChange={(val) => handleChange("certificate", val)}>
                            <SelectTrigger className="border-purple-200 focus:ring-purple-500">
                              <SelectValue placeholder="Pilih sertifikat" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SHM">SHM</SelectItem>
                              <SelectItem value="HGB">HGB</SelectItem>
                              <SelectItem value="SHGB">SHGB</SelectItem>
                              <SelectItem value="Strata">Strata Title</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="facing">🧭 Hadap</Label>
                          <Select value={form.facing} onValueChange={(val) => handleChange("facing", val)}>
                            <SelectTrigger className="border-purple-200 focus:ring-purple-500">
                              <SelectValue placeholder="Pilih arah" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="utara">Utara</SelectItem>
                              <SelectItem value="selatan">Selatan</SelectItem>
                              <SelectItem value="timur">Timur</SelectItem>
                              <SelectItem value="barat">Barat</SelectItem>
                              <SelectItem value="timur_laut">Timur Laut</SelectItem>
                              <SelectItem value="barat_laut">Barat Laut</SelectItem>
                              <SelectItem value="tenggara">Tenggara</SelectItem>
                              <SelectItem value="barat_daya">Barat Daya</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="condition">🔧 Kondisi</Label>
                          <Select value={form.condition} onValueChange={(val) => handleChange("condition", val)}>
                            <SelectTrigger className="border-purple-200 focus:ring-purple-500">
                              <SelectValue placeholder="Pilih kondisi" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="baru">Baru</SelectItem>
                              <SelectItem value="sangat_baik">Sangat Baik</SelectItem>
                              <SelectItem value="baik">Baik</SelectItem>
                              <SelectItem value="cukup">Cukup</SelectItem>
                              <SelectItem value="kurang">Kurang</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="furnishing">🛋️ Furnishing</Label>
                          <Select value={form.furnishing} onValueChange={(val) => handleChange("furnishing", val)}>
                            <SelectTrigger className="border-purple-200 focus:ring-purple-500">
                              <SelectValue placeholder="Pilih furnishing" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unfurnished">Unfurnished</SelectItem>
                              <SelectItem value="semi_furnished">Semi Furnished</SelectItem>
                              <SelectItem value="fully_furnished">Fully Furnished</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* LAND TAB */}
                <TabsContent value="land" className="space-y-4 mt-4">
                  <Card className="border-0 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-t-xl">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                        <Home size={18} className="text-amber-500" />
                        Data Tanah & Bangunan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="land_area">Luas Tanah (m²)</Label>
                          <Input
                            id="land_area"
                            type="number"
                            placeholder="150"
                            value={form.land_area}
                            onChange={(e) => handleChange("land_area", e.target.value)}
                            className="border-amber-200 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="land_unit">Satuan Tanah</Label>
                          <Select value={form.land_unit} onValueChange={(val) => handleChange("land_unit", val)}>
                            <SelectTrigger className="border-amber-200 focus:ring-amber-500">
                              <SelectValue placeholder="Pilih satuan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="m²">m²</SelectItem>
                              <SelectItem value="are">Are</SelectItem>
                              <SelectItem value="ha">Ha</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="land_width">Lebar Tanah (m)</Label>
                          <Input
                            id="land_width"
                            type="number"
                            placeholder="10"
                            value={form.land_width}
                            onChange={(e) => handleChange("land_width", e.target.value)}
                            className="border-amber-200 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="land_length">Panjang Tanah (m)</Label>
                          <Input
                            id="land_length"
                            type="number"
                            placeholder="15"
                            value={form.land_length}
                            onChange={(e) => handleChange("land_length", e.target.value)}
                            className="border-amber-200 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="building_area">Luas Bangunan (m²)</Label>
                            <Input
                              id="building_area"
                              type="number"
                              placeholder="120"
                              value={form.building_area}
                              onChange={(e) => handleChange("building_area", e.target.value)}
                              className="border-amber-200 focus:ring-amber-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="year_built">Tahun Bangun</Label>
                            <Input
                              id="year_built"
                              type="number"
                              placeholder="2020"
                              value={form.year_built}
                              onChange={(e) => handleChange("year_built", e.target.value)}
                              className="border-amber-200 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="building_width">Lebar Bangunan (m)</Label>
                            <Input
                              id="building_width"
                              type="number"
                              placeholder="8"
                              value={form.building_width}
                              onChange={(e) => handleChange("building_width", e.target.value)}
                              className="border-amber-200 focus:ring-amber-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="building_length">Panjang Bangunan (m)</Label>
                            <Input
                              id="building_length"
                              type="number"
                              placeholder="15"
                              value={form.building_length}
                              onChange={(e) => handleChange("building_length", e.target.value)}
                              className="border-amber-200 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* OWNER TAB */}
                <TabsContent value="owner" className="space-y-4 mt-4">
                  <Card className="border-0 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-t-xl">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                        <User size={18} className="text-pink-500" />
                        Data Pemilik
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2" id="field-owner_name">
                        <Label htmlFor="owner_name" className="font-medium">Nama Pemilik</Label>
                        <Input
                          id="owner_name"
                          placeholder="Budi Santoso (opsional)"
                          value={form.owner_name}
                          onChange={(e) => handleChange("owner_name", e.target.value)}
                          className="border-pink-200 focus:ring-pink-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="owner_phone">Nomor Telepon</Label>
                          <Input
                            id="owner_phone"
                            placeholder="08123456789"
                            value={form.owner_phone}
                            onChange={(e) => handleChange("owner_phone", e.target.value)}
                            className="border-pink-200 focus:ring-pink-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="owner_whatsapp">Nomor WhatsApp</Label>
                          <Input
                            id="owner_whatsapp"
                            placeholder="08123456789"
                            value={form.owner_whatsapp}
                            onChange={(e) => handleChange("owner_whatsapp", e.target.value)}
                            className="border-pink-200 focus:ring-pink-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="owner_email">Email</Label>
                        <Input
                          id="owner_email"
                          type="email"
                          placeholder="budi@email.com"
                          value={form.owner_email}
                          onChange={(e) => handleChange("owner_email", e.target.value)}
                          className="border-pink-200 focus:ring-pink-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="owner_identity_type">Jenis Identitas</Label>
                          <Select value={form.owner_identity_type} onValueChange={(val) => handleChange("owner_identity_type", val)}>
                            <SelectTrigger className="border-pink-200 focus:ring-pink-500">
                              <SelectValue placeholder="Pilih jenis" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="KTP">KTP</SelectItem>
                              <SelectItem value="SIM">SIM</SelectItem>
                              <SelectItem value="PASPOR">Paspor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="owner_identity_number">Nomor Identitas</Label>
                          <Input
                            id="owner_identity_number"
                            placeholder="3175020101900001"
                            value={form.owner_identity_number}
                            onChange={(e) => handleChange("owner_identity_number", e.target.value)}
                            className="border-pink-200 focus:ring-pink-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="owner_address">Alamat Pemilik</Label>
                        <Textarea
                          id="owner_address"
                          placeholder="Jl. Contoh No. 123, Jakarta"
                          value={form.owner_address}
                          onChange={(e) => handleChange("owner_address", e.target.value)}
                          rows={2}
                          className="border-pink-200 focus:ring-pink-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="owner_notes">Catatan Pemilik</Label>
                        <Textarea
                          id="owner_notes"
                          placeholder="Catatan tambahan tentang pemilik..."
                          value={form.owner_notes}
                          onChange={(e) => handleChange("owner_notes", e.target.value)}
                          rows={2}
                          className="border-pink-200 focus:ring-pink-500"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* MEDIA TAB */}
                <TabsContent value="media" className="space-y-4 mt-4">
                  <Card className="border-0 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-t-xl">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                        <ImageIcon size={18} className="text-cyan-500" />
                        Foto & Media Property
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {existingImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-3">
                          {existingImages.map((img) => (
                            <div key={img.id} className="relative group aspect-square rounded-lg border border-slate-200 overflow-hidden">
                              <img src={img.url} alt="Property" className="w-full h-full object-cover" />
                              {img.isPrimary && (
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">Primary</div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeExistingImage(img.id)}
                                className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="shrink-0 border-dashed border-2 border-cyan-300 hover:bg-cyan-50"
                        >
                          <Upload size={16} className="mr-2" />
                          Tambah Foto
                        </Button>
                        <span className="text-sm text-slate-400">{form.images.length} file baru</span>
                      </div>
                      <p className="text-xs text-slate-400">Upload foto property (max 10MB per file). Foto pertama akan menjadi thumbnail utama.</p>

                      {form.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-3">
                          {form.images.map((file, index) => (
                            <div key={index} className="relative group aspect-square rounded-lg border border-slate-200 overflow-hidden">
                              <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                              {existingImages.length === 0 && index === 0 && (
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">Primary</div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* SIDEBAR */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-slate-50 to-slate-100">
                <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-t-xl">
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <Sparkles size={18} className="text-yellow-200" />
                    Ringkasan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Judul</span><span className="font-medium text-slate-700 truncate max-w-[140px]">{form.title || "Belum diisi"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Kode</span><span className="font-medium text-slate-700 font-mono text-xs">{form.listing_code || "Belum diisi"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Tipe</span><span className="font-medium text-slate-700">{form.property_type || "Belum diisi"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Status</span><Badge variant="outline" className="text-xs">{form.status}</Badge></div>
                    <div className="flex justify-between"><span className="text-slate-500">Kota</span><span className="font-medium text-slate-700">{locationData.cities.find(c => c.id === form.city_id)?.name || "Belum diisi"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Harga</span><span className="font-medium text-slate-700">{form.selling_price || form.rental_price || "Belum diisi"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Kamar</span><span className="font-medium text-slate-700">{form.bedroom || "-"} / {form.bathroom || "-"} 🛏️🛁</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Foto</span><span className="font-medium text-slate-700">{existingImages.length + form.images.length} file</span></div>
                  </div>
                  <hr className="my-2" />
                  <div className="space-y-2">
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-md"
                      disabled={loading}
                    >
                      {loading ? (
                        <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />Menyimpan...</>
                      ) : (
                        <><Save size={18} className="mr-2" />Update Property</>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => router.back()}
                    >
                      Batal
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 text-center mt-2">* Data akan tersimpan sebagai Draft jika status belum Published</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>

      {/* ===== AI CHATBOX ===== */}
      <AIChatbox propertyContext={form} />
    </>
  );
}