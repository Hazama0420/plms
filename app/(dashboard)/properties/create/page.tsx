// app/(dashboard)/properties/create/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Wand2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
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
  districts: { id: string; name: string; city_id: string }[]; // ✅ tambah city_id
  villages: { id: string; name: string }[];
}

interface PropertyFormData {
  title: string;
  listing_code: string;
  property_type: string;
  listing_type: "jual" | "sewa";
  property_category: string;
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

type PropertyType = "rumah" | "apartemen" | "tanah" | "villa" | "ruko" | "kantor" | "pabrik" | "gudang" | "hotel" | "ruang_usaha";

const FIELD_VISIBILITY: Record<
  PropertyType,
  { hidden: string[]; extra: { name: string; label: string; type: string; options?: string[] }[] }
> = {
  rumah: { hidden: [], extra: [] },
  apartemen: { hidden: [], extra: [] },
  tanah: {
    hidden: ["bedroom", "bathroom", "garage", "carport", "floor", "building_area", "building_width", "building_length"],
    extra: [
      { name: "satuan_tanah", label: "Satuan Tanah", type: "select", options: ["", "m2", "are", "hektar"] },
      { name: "satuan_harga", label: "Satuan Harga", type: "select", options: ["", "total", "/m2", "/are", "/hektar"] },
    ],
  },
  villa: { hidden: [], extra: [] },
  ruko: { hidden: ["carport"], extra: [] },
  kantor: { hidden: ["bedroom", "carport"], extra: [] },
  pabrik: { hidden: ["bedroom", "carport"], extra: [] },
  gudang: { hidden: ["bedroom", "carport"], extra: [] },
  hotel: { hidden: ["carport"], extra: [] },
  ruang_usaha: { hidden: ["bedroom", "carport"], extra: [] },
};

// UUID regex for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function CreatePropertyPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [aiLoading, setAiLoading] = useState({
    title: false,
    description: false,
    parse: false,
  });
  const [parseText, setParseText] = useState("");

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

  const [cityName, setCityName] = useState("");
  const [provinceName, setProvinceName] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [villageName, setVillageName] = useState("");

  // Helpers
  const getCountryName = (id: string) =>
    locationData.countries.find((c) => c.id === id)?.name || "";
  const getProvinceName = (id: string) =>
    locationData.provinces.find((p) => p.id === id)?.name || "";
  const getCityName = (id: string) =>
    locationData.cities.find((c) => c.id === id)?.name || "";
  const getDistrictName = (id: string) =>
    locationData.districts.find((d) => d.id === id)?.name || "";
  const getVillageName = (id: string) =>
    locationData.villages.find((v) => v.id === id)?.name || "";

  // ===== FETCH LOCATION =====
  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    setLoadingLocation((prev) => ({ ...prev, countries: true }));
    try {
      const { data, error } = await supabase
        .from("countries")
        .select("id, name")
        .order("name");
      if (error) throw error;
      setLocationData((prev) => ({ ...prev, countries: data || [] }));

      if (data && data.length > 0 && isInitialLoad) {
        const indonesia = data.find((c) => c.name === "Indonesia") || data[0];
        if (indonesia) {
          setForm((prev) => ({ ...prev, country_id: indonesia.id }));
          fetchProvinces(indonesia.id);
          setIsInitialLoad(false);
        }
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
      toast.error("Gagal mengambil data negara");
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
      console.error("Error fetching provinces:", error);
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
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingLocation((prev) => ({ ...prev, cities: false }));
    }
  };

  // ✅ FIX: fetch districts with city_id
  const fetchDistricts = async (cityId: string) => {
    if (!cityId) return;
    setLoadingLocation((prev) => ({ ...prev, districts: true }));
    try {
      const { data, error } = await supabase
        .from("districts")
        .select("id, name, city_id") // ✅ tambah city_id
        .eq("city_id", cityId)
        .order("name");
      if (error) throw error;
      setLocationData((prev) => ({ ...prev, districts: data || [] }));
    } catch (error) {
      console.error("Error fetching districts:", error);
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
      console.error("Error fetching villages:", error);
    } finally {
      setLoadingLocation((prev) => ({ ...prev, villages: false }));
    }
  };

  // ===== UPDATE NAMA LOKASI =====
  useEffect(() => {
    const city = locationData.cities.find((c) => c.id === form.city_id);
    setCityName(city?.name || "");
  }, [form.city_id, locationData.cities]);

  useEffect(() => {
    const province = locationData.provinces.find((p) => p.id === form.province_id);
    setProvinceName(province?.name || "");
  }, [form.province_id, locationData.provinces]);

  useEffect(() => {
    const district = locationData.districts.find((d) => d.id === form.district_id);
    setDistrictName(district?.name || "");
  }, [form.district_id, locationData.districts]);

  useEffect(() => {
    const village = locationData.villages.find((v) => v.id === form.village_id);
    setVillageName(village?.name || "");
  }, [form.village_id, locationData.villages]);

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const generateListingCode = () => {
    const prefix = "PRP";
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    setForm((prev) => ({ ...prev, listing_code: `${prefix}-${year}${month}${day}-${random}` }));
  };

  const generateUniqueSlug = (title: string) => {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const random = Math.random().toString(36).substring(2, 6);
    const timestamp = Date.now().toString(36);
    return `${baseSlug}-${timestamp}-${random}`;
  };

  // ===== AI PARSE =====
  const handleAIParse = async () => {
    if (!parseText.trim()) {
      toast.warning("Silakan tempelkan teks listing terlebih dahulu.");
      return;
    }

    setAiLoading((prev) => ({ ...prev, parse: true }));

    try {
      const areaList = locationData.districts
        .map((d) => {
          const city = locationData.cities.find((c) => c.id === d.city_id); // ✅ sekarang d.city_id ada
          return `${d.name} - ${city?.name || "Unknown"}`;
        })
        .join("\n");

      const fieldNames = [
        "title",
        "property_type",
        "listing_type",
        "property_category",
        "selling_point",
        "address",
        "selling_price",
        "rental_price",
        "rental_period",
        "bedroom",
        "bathroom",
        "garage",
        "carport",
        "floor",
        "electricity",
        "water_source",
        "certificate",
        "facing",
        "condition",
        "furnishing",
        "year_built",
        "land_area",
        "land_unit",
        "land_width",
        "land_length",
        "building_area",
        "building_width",
        "building_length",
        "owner_name",
        "owner_phone",
        "owner_whatsapp",
        "owner_email",
      ].join(", ");

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse",
          data: {
            text: parseText,
            currentType: form.property_type || "belum ditentukan",
            fieldNames,
            areaList,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        const parsed = result.data;

        const mapping: Record<string, keyof PropertyFormData> = {
          title: "title",
          property_type: "property_type",
          listing_type: "listing_type",
          property_category: "property_category",
          selling_point: "selling_point",
          address: "address",
          selling_price: "selling_price",
          rental_price: "rental_price",
          rental_period: "rental_period",
          bedroom: "bedroom",
          bathroom: "bathroom",
          garage: "garage",
          carport: "carport",
          floor: "floor",
          electricity: "electricity",
          water_source: "water_source",
          certificate: "certificate",
          facing: "facing",
          condition: "condition",
          furnishing: "furnishing",
          year_built: "year_built",
          land_area: "land_area",
          land_unit: "land_unit",
          land_width: "land_width",
          land_length: "land_length",
          building_area: "building_area",
          building_width: "building_width",
          building_length: "building_length",
        };

        Object.entries(parsed).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== "") {
            const field = mapping[key];
            if (field) {
              handleChange(field, value.toString());
            }
          }
        });

        if (parsed.city) {
          const city = locationData.cities.find(
            (c) => c.name.toLowerCase() === parsed.city.toLowerCase()
          );
          if (city) {
            handleChange("city_id", city.id);
            fetchDistricts(city.id);
          }
        }

        if (!parsed.owner_name) {
          handleChange("owner_name", "");
          handleChange("owner_phone", "");
          handleChange("owner_whatsapp", "");
          handleChange("owner_email", "");
        }

        toast.success(`✅ Data berhasil diekstrak dengan AI (${result.provider || "AI"})!`);
        setActiveTab("location");
      } else {
        toast.error(result.error || "Gagal parsing teks");
      }
    } catch (error: any) {
      console.error("AI parse error:", error);
      toast.error("Gagal terhubung ke AI service");
    } finally {
      setAiLoading((prev) => ({ ...prev, parse: false }));
    }
  };

  // ===== AI GENERATE =====
  const generateAIField = async (field: "title" | "description") => {
    if (field === "title" && !form.property_type && !form.address) {
      toast.warning("Isi minimal tipe property dan alamat dulu.");
      return;
    }

    setAiLoading((prev) => ({ ...prev, [field]: true }));

    let action = field === "title" ? "title" : "description";
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
            price: form.selling_price ? parseFloat(form.selling_price) : 0,
            bedrooms: form.bedroom ? parseInt(form.bedroom) : 0,
            bathrooms: form.bathroom ? parseInt(form.bathroom) : 0,
            landArea: form.land_area ? parseFloat(form.land_area) : 0,
            buildingArea: form.building_area ? parseFloat(form.building_area) : 0,
            existingText: form.description,
          },
        }),
      });

      const result = await res.json();

      if (result.success) {
        handleChange(field, result.data);
        const mode = action === "enhance_description" ? "diperbaiki" : "dibuat";
        toast.success(
          `✅ ${field === "title" ? "Judul" : "Deskripsi"} berhasil ${mode} dengan AI (${result.provider || "AI"})`
        );
      } else {
        toast.error(result.error || `Gagal generate ${field}`);
      }
    } catch (error: any) {
      console.error("AI generation error:", error);
      toast.error("Gagal terhubung ke AI service");
    } finally {
      setAiLoading((prev) => ({ ...prev, [field]: false }));
    }
  };

  // ============================================================
  // SUBMIT
  // ============================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Validasi
    if (!form.title) {
      toast.error("Judul property wajib diisi.");
      setActiveTab("basic");
      setTimeout(() => document.getElementById("title")?.focus(), 100);
      return;
    }
    if (!form.property_type) {
      toast.error("Tipe property wajib dipilih.");
      setActiveTab("basic");
      return;
    }
    if (!form.address) {
      toast.error("Alamat wajib diisi.");
      setActiveTab("location");
      return;
    }
    if (form.listing_type === "jual" && !form.selling_price) {
      toast.error("Harga jual wajib diisi.");
      setActiveTab("basic");
      return;
    }
    if (form.listing_type === "sewa" && !form.rental_price) {
      toast.error("Harga sewa wajib diisi.");
      setActiveTab("basic");
      return;
    }

    // Validasi UUID
    const locationFields = ['country_id', 'province_id', 'city_id', 'district_id', 'village_id'] as const;
    for (const field of locationFields) {
      const val = form[field];
      if (val && !UUID_REGEX.test(val)) {
        handleChange(field, '');
        console.warn(`Invalid UUID for ${field}, reset to null`);
      }
    }

    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error("Sesi login tidak valid. Silakan login ulang.");
      if (!user) throw new Error("Anda belum login.");

      // Owner
      let ownerId = null;
      if (form.owner_name) {
        const { data: owner, error: ownerError } = await supabase
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
        if (ownerError) {
          console.error("Owner insert error:", ownerError);
          throw new Error(`Gagal menyimpan data pemilik: ${ownerError.message}`);
        }
        ownerId = owner.id;
      }

      // Insert Property
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert({
          listing_code: form.listing_code || `PRP-${Date.now()}`,
          title: form.title,
          slug: generateUniqueSlug(form.title),
          property_type: form.property_type,
          listing_type: form.listing_type,
          property_category: form.property_category || null,
          status: form.status,
          description: form.description || null,
          selling_point: form.selling_point || null,
          rental_period: form.rental_period || null,
          owner_id: ownerId,
          created_by: user.id,
          published_at: form.status === "published" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (propertyError) {
        console.error("Property insert error:", propertyError);
        throw new Error(`Gagal menyimpan properti: ${propertyError.message}`);
      }

      // Insert Address
      if (form.address) {
        const addressData: any = {
          property_id: property.id,
          address: form.address,
          postal_code: form.postal_code || null,
          latitude: form.latitude ? parseFloat(form.latitude) : null,
          longitude: form.longitude ? parseFloat(form.longitude) : null,
        };
        if (form.country_id && UUID_REGEX.test(form.country_id)) addressData.country_id = form.country_id;
        if (form.province_id && UUID_REGEX.test(form.province_id)) addressData.province_id = form.province_id;
        if (form.city_id && UUID_REGEX.test(form.city_id)) addressData.city_id = form.city_id;
        if (form.district_id && UUID_REGEX.test(form.district_id)) addressData.district_id = form.district_id;
        if (form.village_id && UUID_REGEX.test(form.village_id)) addressData.village_id = form.village_id;

        const { error: addressError } = await supabase
          .from("property_address")
          .insert(addressData);

        if (addressError) {
          console.error("Address insert error:", addressError);
          throw new Error(`Gagal menyimpan alamat: ${addressError.message}`);
        }
      }

      // Insert Price
      if (form.selling_price || form.rental_price) {
        const { error: priceError } = await supabase
          .from("property_price")
          .insert({
            property_id: property.id,
            selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
            rental_price: form.rental_price ? parseFloat(form.rental_price) : null,
            service_charge: form.service_charge ? parseFloat(form.service_charge) : null,
            maintenance_fee: form.maintenance_fee ? parseFloat(form.maintenance_fee) : null,
            negotiable: form.negotiable,
          });
        if (priceError) {
          console.error("Price insert error:", priceError);
          throw new Error(`Gagal menyimpan harga: ${priceError.message}`);
        }
      }

      // Insert Specifications
      if (form.bedroom || form.bathroom || form.garage || form.certificate) {
        const { error: specError } = await supabase
          .from("property_specifications")
          .insert({
            property_id: property.id,
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
          });
        if (specError) {
          console.error("Spec insert error:", specError);
          throw new Error(`Gagal menyimpan spesifikasi: ${specError.message}`);
        }
      }

      // Insert Land
      if (form.land_area) {
        const { error: landError } = await supabase
          .from("property_land")
          .insert({
            property_id: property.id,
            land_area: parseFloat(form.land_area),
            land_unit: form.land_unit || "m²",
            land_width: form.land_width ? parseFloat(form.land_width) : null,
            land_length: form.land_length ? parseFloat(form.land_length) : null,
          });
        if (landError) {
          console.error("Land insert error:", landError);
          throw new Error(`Gagal menyimpan data tanah: ${landError.message}`);
        }
      }

      // Insert Building
      if (form.building_area) {
        const { error: buildingError } = await supabase
          .from("property_building")
          .insert({
            property_id: property.id,
            building_area: parseFloat(form.building_area),
            building_width: form.building_width ? parseFloat(form.building_width) : null,
            building_length: form.building_length ? parseFloat(form.building_length) : null,
          });
        if (buildingError) {
          console.error("Building insert error:", buildingError);
          throw new Error(`Gagal menyimpan data bangunan: ${buildingError.message}`);
        }
      }

      // Upload Images
      if (form.images.length > 0) {
        let failedUploads = 0;
        for (let i = 0; i < form.images.length; i++) {
          const file = form.images[i];
          const filePath = `properties/${property.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("property-media")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            console.error("Upload error for file", file.name, uploadError);
            failedUploads++;
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("property-media")
            .getPublicUrl(filePath);

          const { error: insertError } = await supabase
            .from("property_media")
            .insert({
              property_id: property.id,
              media_type: "image",
              file_name: file.name,
              original_name: file.name,
              storage_path: filePath,
              public_url: urlData.publicUrl,
              mime_type: file.type,
              file_size: file.size,
              is_primary: i === 0,
              sort_order: i,
              uploaded_by: user.id,
            });

          if (insertError) {
            console.error("Insert media error for file", file.name, insertError);
            failedUploads++;
          }
        }

        if (failedUploads > 0) {
          toast.warning(`${failedUploads} file gagal diupload.`, {
            description: "Property tetap tersimpan, tapi sebagian foto tidak lengkap.",
            duration: 5000,
          });
        }
      }

      toast.success("Property berhasil dibuat!", {
        description: "Data property telah tersimpan di database.",
        duration: 4000,
      });

      setTimeout(() => router.push("/properties"), 1500);
    } catch (error: any) {
      console.error("Full error creating property:", error);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      console.error("Error details:", error?.details);
      console.error("Error hint:", error?.hint);

      let errorMessage = "Terjadi kesalahan tidak diketahui.";
      let errorDetails = "";

      if (error?.code === "42501") {
        errorMessage = "Anda tidak memiliki izin untuk menambahkan property.";
        errorDetails = "Hubungi administrator untuk mendapatkan akses.";
      } else if (error?.code === "23505") {
        errorMessage = "Data sudah ada di database.";
        errorDetails = "Periksa kembali judul atau kode listing.";
      } else if (error?.code === "23503") {
        errorMessage = "Referensi data tidak valid.";
        errorDetails = "Periksa kembali pilihan negara/provinsi/kota/kecamatan/kelurahan.";
      } else if (error?.message) {
        errorMessage = error.message;
        errorDetails = error?.details || error?.hint || "";
      }

      toast.error(errorMessage, {
        description: errorDetails || "Silakan coba lagi atau hubungi dukungan.",
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getHiddenFields = () => {
    const type = form.property_type as PropertyType;
    return FIELD_VISIBILITY[type]?.hidden || [];
  };

  const isFieldHidden = (field: string) => {
    return getHiddenFields().includes(field);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <div className="space-y-6">
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
                <h1 className="text-2xl font-bold tracking-tight">✏️ Tambah Property Baru</h1>
                <p className="text-sm text-white/80">Isi semua data property dengan lengkap dan akurat</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {form.status === "draft" ? "📝 Draft" : form.status === "review" ? "👀 Review" : "🚀 Published"}
              </Badge>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={generateListingCode}
                className="bg-white/20 text-white hover:bg-white/30"
              >
                🔄 Generate Kode
              </Button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="lg:col-span-2 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6 bg-slate-100 p-1 rounded-xl dark:bg-slate-800">
                  <TabsTrigger value="basic">📋 Basic</TabsTrigger>
                  <TabsTrigger value="location">📍 Lokasi</TabsTrigger>
                  <TabsTrigger value="specs">🔧 Spesifikasi</TabsTrigger>
                  <TabsTrigger value="land">📐 Tanah</TabsTrigger>
                  <TabsTrigger value="owner">👤 Pemilik</TabsTrigger>
                  <TabsTrigger value="media">🖼️ Media</TabsTrigger>
                </TabsList>

                {/* BASIC TAB */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <Card className="border-0 shadow-md dark:bg-slate-800">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl dark:from-blue-950/30 dark:to-purple-950/30">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Home size={18} className="text-blue-500" />
                        Informasi Dasar
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4 dark:text-slate-300">
                      {/* AI Parse */}
                      <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-xl border border-blue-200 dark:border-blue-900 dark:bg-blue-950/20">
                        <div className="flex items-center gap-2">
                          <Wand2 size={18} className="text-blue-500" />
                          <Label className="font-semibold text-blue-700 dark:text-blue-300">
                            ✨ AI Parsing – Isi Otomatis dari Teks Listing
                          </Label>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Tempelkan teks listing (dari email, website, atau dokumen) lalu klik tombol AI Parse untuk mengisi semua field secara otomatis.
                        </p>
                        <Textarea
                          placeholder="Tempelkan teks listing di sini..."
                          value={parseText}
                          onChange={(e) => setParseText(e.target.value)}
                          rows={3}
                          className="border-blue-200 dark:border-blue-800 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-200"
                        />
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={handleAIParse}
                          disabled={aiLoading.parse}
                          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md"
                        >
                          {aiLoading.parse ? (
                            <>
                              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                              Parsing...
                            </>
                          ) : (
                            <>
                              <Wand2 size={16} className="mr-2" />
                              ✨ AI Parse
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Judul + Kode */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title" className="font-medium">
                            Judul Property <span className="text-rose-500">*</span>
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="title"
                              placeholder="Contoh: Rumah Minimalis Modern di BSD"
                              value={form.title}
                              onChange={(e) => handleChange("title", e.target.value)}
                              className="flex-1 border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => generateAIField("title")}
                              disabled={aiLoading.title}
                              className="shrink-0 border-blue-300 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-950"
                            >
                              {aiLoading.title ? <span className="animate-spin">⏳</span> : <Sparkle size={16} className="text-blue-500" />}
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
                            className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      {/* Tipe Property + Listing Type */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="property_type" className="font-medium">
                            Tipe Property <span className="text-rose-500">*</span>
                          </Label>
                          <Select
                            value={form.property_type}
                            onValueChange={(val) => handleChange("property_type", val)}
                          >
                            <SelectTrigger className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Pilih tipe" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                              <SelectItem value="rumah">🏠 Rumah</SelectItem>
                              <SelectItem value="apartemen">🏢 Apartemen</SelectItem>
                              <SelectItem value="tanah">🌿 Tanah</SelectItem>
                              <SelectItem value="villa">🏖️ Villa</SelectItem>
                              <SelectItem value="ruko">🏪 Ruko</SelectItem>
                              <SelectItem value="kantor">🏢 Kantor</SelectItem>
                              <SelectItem value="pabrik">🏭 Pabrik</SelectItem>
                              <SelectItem value="gudang">📦 Gudang</SelectItem>
                              <SelectItem value="hotel">🏨 Hotel</SelectItem>
                              <SelectItem value="ruang_usaha">🏪 Ruang Usaha</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="listing_type" className="font-medium">
                            Tipe Listing <span className="text-rose-500">*</span>
                          </Label>
                          <Select
                            value={form.listing_type}
                            onValueChange={(val) => handleChange("listing_type", val)}
                          >
                            <SelectTrigger className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Pilih tipe" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                              <SelectItem value="jual">💰 Jual</SelectItem>
                              <SelectItem value="sewa">📋 Sewa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Property Category + Status */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="property_category" className="font-medium">Jenis Properti</Label>
                          {/* ✅ FIX: pakai sentinel "none" */}
                          <Select
                            value={form.property_category || "none"}
                            onValueChange={(val) =>
                              handleChange("property_category", val === "none" ? "" : val)
                            }
                          >
                            <SelectTrigger className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Pilih jenis" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                              <SelectItem value="none">-</SelectItem>
                              <SelectItem value="second">Second</SelectItem>
                              <SelectItem value="aset_bank">Aset Bank</SelectItem>
                              <SelectItem value="baru">Baru</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status" className="font-medium">Status</Label>
                          <Select
                            value={form.status}
                            onValueChange={(val) => handleChange("status", val)}
                          >
                            <SelectTrigger className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                              <SelectItem value="draft">📝 Draft</SelectItem>
                              <SelectItem value="review">👀 Review</SelectItem>
                              <SelectItem value="published">🚀 Published</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Deskripsi + AI Generate */}
                      <div className="space-y-2">
                        <Label htmlFor="description" className="font-medium">Deskripsi Lengkap</Label>
                        <div className="flex flex-col gap-2">
                          <Textarea
                            id="description"
                            placeholder="Tulis deskripsi detail tentang property ini..."
                            value={form.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            rows={4}
                            className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => generateAIField("description")}
                            disabled={aiLoading.description}
                            className="self-start border-blue-300 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-950"
                          >
                            {aiLoading.description ? <span className="animate-spin">⏳</span> : <Sparkle size={16} className="text-blue-500" />}
                            <span className="ml-1 text-xs">Generate dengan AI</span>
                          </Button>
                        </div>
                      </div>

                      {/* Selling Point */}
                      <div className="space-y-2">
                        <Label htmlFor="selling_point" className="font-medium">💎 Selling Point</Label>
                        <Input
                          id="selling_point"
                          placeholder="Contoh: Dekat mall, akses tol, view gunung"
                          value={form.selling_point}
                          onChange={(e) => handleChange("selling_point", e.target.value)}
                          className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                        />
                      </div>

                      {/* Harga */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t dark:border-slate-700">
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
                            className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rental_price" className="font-medium">
                            Harga Sewa / Bulan {form.listing_type === "sewa" && <span className="text-rose-500">*</span>}
                          </Label>
                          <Input
                            id="rental_price"
                            type="number"
                            placeholder="8500000"
                            value={form.rental_price}
                            onChange={(e) => handleChange("rental_price", e.target.value)}
                            className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      {/* Rental Period + Service Charge */}
                      <div className="grid grid-cols-2 gap-4">
                        {form.listing_type === "sewa" && (
                          <div className="space-y-2">
                            <Label htmlFor="rental_period" className="font-medium">Periode Sewa</Label>
                            {/* ✅ FIX: pakai sentinel "none" */}
                            <Select
                              value={form.rental_period || "none"}
                              onValueChange={(val) =>
                                handleChange("rental_period", val === "none" ? "" : val)
                              }
                            >
                              <SelectTrigger className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                                <SelectValue placeholder="Pilih periode" />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                                <SelectItem value="none">-</SelectItem>
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
                            className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
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
                            className="border-blue-200 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
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
                  <Card className="border-0 shadow-md dark:bg-slate-800">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl dark:from-emerald-950/30 dark:to-teal-950/30">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <MapPin size={18} className="text-emerald-500" />
                        Alamat & Lokasi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {/* Country */}
                      <div className="space-y-2">
                        <Label htmlFor="country_id">Negara</Label>
                        <Select
                          value={form.country_id}
                          onValueChange={(val) => handleLocationChange("country_id", val || "")}
                          disabled={loadingLocation.countries}
                        >
                          <SelectTrigger className="border-emerald-200 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                            <SelectValue placeholder={loadingLocation.countries ? "Memuat..." : "Pilih negara"} />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            {locationData.countries.length === 0 ? (
                              <SelectItem value="no-country" disabled className="text-muted-foreground">
                                {loadingLocation.countries ? "Memuat..." : "Tidak ada data"}
                              </SelectItem>
                            ) : (
                              locationData.countries.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Province */}
                      <div className="space-y-2">
                        <Label htmlFor="province_id">Provinsi</Label>
                        <Select
                          value={form.province_id}
                          onValueChange={(val) => handleLocationChange("province_id", val || "")}
                          disabled={!form.country_id || loadingLocation.provinces}
                        >
                          <SelectTrigger className="border-emerald-200 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                            <SelectValue placeholder={loadingLocation.provinces ? "Memuat..." : "Pilih provinsi"} />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            {locationData.provinces.length === 0 ? (
                              <SelectItem value="no-province" disabled className="text-muted-foreground">
                                {loadingLocation.provinces ? "Memuat..." : "Tidak ada data"}
                              </SelectItem>
                            ) : (
                              locationData.provinces.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* City */}
                      <div className="space-y-2">
                        <Label htmlFor="city_id">Kota / Kabupaten</Label>
                        <Select
                          value={form.city_id}
                          onValueChange={(val) => handleLocationChange("city_id", val || "")}
                          disabled={!form.province_id || loadingLocation.cities}
                        >
                          <SelectTrigger className="border-emerald-200 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                            <SelectValue placeholder={loadingLocation.cities ? "Memuat..." : "Pilih kota"} />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            {locationData.cities.length === 0 ? (
                              <SelectItem value="no-city" disabled className="text-muted-foreground">
                                {loadingLocation.cities ? "Memuat..." : "Tidak ada data"}
                              </SelectItem>
                            ) : (
                              locationData.cities.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* District */}
                      <div className="space-y-2">
                        <Label htmlFor="district_id">Kecamatan</Label>
                        <Select
                          value={form.district_id}
                          onValueChange={(val) => handleLocationChange("district_id", val || "")}
                          disabled={!form.city_id || loadingLocation.districts}
                        >
                          <SelectTrigger className="border-emerald-200 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                            <SelectValue placeholder={loadingLocation.districts ? "Memuat..." : "Pilih kecamatan"} />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            {locationData.districts.length === 0 ? (
                              <SelectItem value="no-district" disabled className="text-muted-foreground">
                                {loadingLocation.districts ? "Memuat..." : "Tidak ada data"}
                              </SelectItem>
                            ) : (
                              locationData.districts.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Village */}
                      <div className="space-y-2">
                        <Label htmlFor="village_id">Kelurahan / Desa</Label>
                        <Select
                          value={form.village_id}
                          onValueChange={(val) => handleLocationChange("village_id", val || "")}
                          disabled={!form.district_id || loadingLocation.villages}
                        >
                          <SelectTrigger className="border-emerald-200 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                            <SelectValue placeholder={loadingLocation.villages ? "Memuat..." : "Pilih kelurahan"} />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            {locationData.villages.length === 0 ? (
                              <SelectItem value="no-village" disabled className="text-muted-foreground">
                                {loadingLocation.villages ? "Memuat..." : "Tidak ada data"}
                              </SelectItem>
                            ) : (
                              locationData.villages.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address" className="font-medium">Alamat Lengkap <span className="text-rose-500">*</span></Label>
                        <Textarea
                          id="address"
                          placeholder="Jl. BSD Raya No. 12, Serpong"
                          value={form.address}
                          onChange={(e) => handleChange("address", e.target.value)}
                          rows={3}
                          className="border-emerald-200 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
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
                            className="border-emerald-200 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
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
                            className="border-emerald-200 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="longitude">Longitude</Label>
                          <Input
                            id="longitude"
                            placeholder="106.6186"
                            value={form.longitude}
                            onChange={(e) => handleChange("longitude", e.target.value)}
                            className="border-emerald-200 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* SPECS TAB */}
                <TabsContent value="specs" className="space-y-4 mt-4">
                  <Card className="border-0 shadow-md dark:bg-slate-800">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-xl dark:from-purple-950/30 dark:to-violet-950/30">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Building2 size={18} className="text-purple-500" />
                        Spesifikasi Property
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        {!isFieldHidden("bedroom") && (
                          <div className="space-y-2">
                            <Label htmlFor="bedroom">🛏️ Kamar Tidur</Label>
                            <Input
                              id="bedroom"
                              type="number"
                              placeholder="3"
                              value={form.bedroom}
                              onChange={(e) => handleChange("bedroom", e.target.value)}
                              className="border-purple-200 focus:ring-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                            />
                          </div>
                        )}
                        {!isFieldHidden("bathroom") && (
                          <div className="space-y-2">
                            <Label htmlFor="bathroom">🛁 Kamar Mandi</Label>
                            <Input
                              id="bathroom"
                              type="number"
                              placeholder="2"
                              value={form.bathroom}
                              onChange={(e) => handleChange("bathroom", e.target.value)}
                              className="border-purple-200 focus:ring-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                            />
                          </div>
                        )}
                        {!isFieldHidden("garage") && (
                          <div className="space-y-2">
                            <Label htmlFor="garage">🚗 Garasi</Label>
                            <Input
                              id="garage"
                              type="number"
                              placeholder="1"
                              value={form.garage}
                              onChange={(e) => handleChange("garage", e.target.value)}
                              className="border-purple-200 focus:ring-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {!isFieldHidden("carport") && (
                          <div className="space-y-2">
                            <Label htmlFor="carport">🏎️ Carport</Label>
                            <Input
                              id="carport"
                              type="number"
                              placeholder="1"
                              value={form.carport}
                              onChange={(e) => handleChange("carport", e.target.value)}
                              className="border-purple-200 focus:ring-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                            />
                          </div>
                        )}
                        {!isFieldHidden("floor") && (
                          <div className="space-y-2">
                            <Label htmlFor="floor">🏗️ Jumlah Lantai</Label>
                            <Input
                              id="floor"
                              type="number"
                              placeholder="2"
                              value={form.floor}
                              onChange={(e) => handleChange("floor", e.target.value)}
                              className="border-purple-200 focus:ring-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="electricity">⚡ Daya Listrik (VA)</Label>
                          <Input
                            id="electricity"
                            type="number"
                            placeholder="2200"
                            value={form.electricity}
                            onChange={(e) => handleChange("electricity", e.target.value)}
                            className="border-purple-200 focus:ring-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="water_source">💧 Sumber Air</Label>
                          <Select
                            value={form.water_source}
                            onValueChange={(val) => handleChange("water_source", val)}
                          >
                            <SelectTrigger className="border-purple-200 focus:ring-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Pilih sumber air" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                              <SelectItem value="pdam">PDAM</SelectItem>
                              <SelectItem value="sumur">Sumur</SelectItem>
                              <SelectItem value="pdam_sumur">PDAM + Sumur</SelectItem>
                              <SelectItem value="air_pegunungan">Air Pegunungan</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="certificate">📜 Sertifikat</Label>
                          <Select
                            value={form.certificate}
                            onValueChange={(val) => handleChange("certificate", val)}
                          >
                            <SelectTrigger className="border-purple-200 focus:ring-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Pilih sertifikat" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
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
                          <Select
                            value={form.facing}
                            onValueChange={(val) => handleChange("facing", val)}
                          >
                            <SelectTrigger className="border-purple-200 focus:ring-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Pilih arah" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
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
                          <Select
                            value={form.condition}
                            onValueChange={(val) => handleChange("condition", val)}
                          >
                            <SelectTrigger className="border-purple-200 focus:ring-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Pilih kondisi" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
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
                          <Select
                            value={form.furnishing}
                            onValueChange={(val) => handleChange("furnishing", val)}
                          >
                            <SelectTrigger className="border-purple-200 focus:ring-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Pilih furnishing" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
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
                  <Card className="border-0 shadow-md dark:bg-slate-800">
                    <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-t-xl dark:from-amber-950/30 dark:to-yellow-950/30">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
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
                            className="border-amber-200 focus:ring-amber-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="land_unit">Satuan Tanah</Label>
                          <Select
                            value={form.land_unit}
                            onValueChange={(val) => handleChange("land_unit", val)}
                          >
                            <SelectTrigger className="border-amber-200 focus:ring-amber-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Pilih satuan" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
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
                            className="border-amber-200 focus:ring-amber-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
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
                            className="border-amber-200 focus:ring-amber-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      {!isFieldHidden("building_area") && (
                        <div className="border-t pt-4 dark:border-slate-700">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="building_area">Luas Bangunan (m²)</Label>
                              <Input
                                id="building_area"
                                type="number"
                                placeholder="120"
                                value={form.building_area}
                                onChange={(e) => handleChange("building_area", e.target.value)}
                                className="border-amber-200 focus:ring-amber-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
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
                                className="border-amber-200 focus:ring-amber-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                              />
                            </div>
                          </div>
                          {!isFieldHidden("building_width") && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div className="space-y-2">
                                <Label htmlFor="building_width">Lebar Bangunan (m)</Label>
                                <Input
                                  id="building_width"
                                  type="number"
                                  placeholder="8"
                                  value={form.building_width}
                                  onChange={(e) => handleChange("building_width", e.target.value)}
                                  className="border-amber-200 focus:ring-amber-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
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
                                  className="border-amber-200 focus:ring-amber-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* OWNER TAB */}
                <TabsContent value="owner" className="space-y-4 mt-4">
                  <Card className="border-0 shadow-md dark:bg-slate-800">
                    <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-t-xl dark:from-pink-950/30 dark:to-rose-950/30">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <User size={18} className="text-pink-500" />
                        Data Pemilik
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="owner_name" className="font-medium">Nama Pemilik</Label>
                        <Input
                          id="owner_name"
                          placeholder="Budi Santoso (opsional)"
                          value={form.owner_name}
                          onChange={(e) => handleChange("owner_name", e.target.value)}
                          className="border-pink-200 focus:ring-pink-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
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
                            className="border-pink-200 focus:ring-pink-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="owner_whatsapp">Nomor WhatsApp</Label>
                          <Input
                            id="owner_whatsapp"
                            placeholder="08123456789"
                            value={form.owner_whatsapp}
                            onChange={(e) => handleChange("owner_whatsapp", e.target.value)}
                            className="border-pink-200 focus:ring-pink-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
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
                          className="border-pink-200 focus:ring-pink-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="owner_identity_type">Jenis Identitas</Label>
                          <Select
                            value={form.owner_identity_type}
                            onValueChange={(val) => handleChange("owner_identity_type", val)}
                          >
                            <SelectTrigger className="border-pink-200 focus:ring-pink-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              <SelectValue placeholder="Pilih jenis" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
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
                            className="border-pink-200 focus:ring-pink-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
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
                          className="border-pink-200 focus:ring-pink-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
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
                          className="border-pink-200 focus:ring-pink-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* MEDIA TAB */}
                <TabsContent value="media" className="space-y-4 mt-4">
                  <Card className="border-0 shadow-md dark:bg-slate-800">
                    <CardHeader className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-t-xl dark:from-cyan-950/30 dark:to-sky-950/30">
                      <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <ImageIcon size={18} className="text-cyan-500" />
                        Foto & Media Property
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
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
                          className="shrink-0 border-dashed border-2 border-cyan-300 hover:bg-cyan-50 dark:border-cyan-700 dark:hover:bg-cyan-950"
                        >
                          <Upload size={16} className="mr-2" />
                          Pilih Foto
                        </Button>
                        <span className="text-sm text-slate-400 dark:text-slate-500">
                          {form.images.length} file dipilih
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Upload foto property (max 10MB per file). Foto pertama akan menjadi thumbnail utama.
                      </p>
                      {form.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-3">
                          {form.images.map((file, index) => (
                            <div
                              key={index}
                              className="relative group aspect-square rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700"
                            >
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {index === 0 && (
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">
                                  Primary
                                </div>
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

            {/* ===== SIDEBAR ===== */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-t-xl dark:from-yellow-600 dark:to-orange-600">
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <Sparkles size={18} className="text-yellow-200" />
                    Ringkasan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 dark:text-slate-300">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Judul</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                        {form.title || "Belum diisi"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Kode</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200 font-mono text-xs">
                        {form.listing_code || "Belum diisi"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Tipe</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {form.property_type || "Belum diisi"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Status</span>
                      <Badge variant="outline" className="text-xs dark:border-slate-600 dark:text-slate-300">
                        {form.status === "draft"
                          ? "📝 Draft"
                          : form.status === "review"
                          ? "👀 Review"
                          : "🚀 Published"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Provinsi</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {provinceName || "Belum diisi"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Kota</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {cityName || "Belum diisi"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Kecamatan</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {districtName || "Belum diisi"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Kelurahan</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {villageName || "Belum diisi"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Harga</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {form.selling_price || form.rental_price || "Belum diisi"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Kamar</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {form.bedroom || "-"} / {form.bathroom || "-"} 🛏️🛁
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Foto</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {form.images.length} file
                      </span>
                    </div>
                  </div>
                  <hr className="my-2 dark:border-slate-700" />
                  <div className="space-y-2">
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-md"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save size={18} className="mr-2" />
                          Simpan Property
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      onClick={() => router.back()}
                    >
                      Batal
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2">
                    * Data akan tersimpan sebagai Draft jika status belum Published
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>

      <AIChatbox propertyContext={form} />
    </>
  );
}