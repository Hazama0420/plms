// components/create-property/steps/StepReview.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Home,
  UserCheck,
  Phone,
  Building2,
  Check,
  ArrowLeft,
  Layers,
  ShieldCheck,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

interface StepReviewProps {
  formData: any;
  prevStep: () => void;
  mode?: "create" | "edit";
  propertyId?: string;
  onSuccess?: () => void;
}

export function StepReview({
  formData,
  prevStep,
  mode = "create",
  propertyId,
  onSuccess,
}: StepReviewProps) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  // Generasi Slug Unik
  const generateUniqueSlug = (title: string) => {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const random = Math.random().toString(36).substring(2, 6);
    const timestamp = Date.now().toString(36);
    return `${baseSlug}-${timestamp}-${random}`;
  };

  // Sanitasi ID
  const cleanId = (val: any) => {
    if (!val || val === "" || val === "null" || val === "undefined") return null;
    return val;
  };

  // Kalkulasi Skor Kualitas Listing (0 - 100%)
  const calculateQualityScore = () => {
    let score = 0;
    if (formData.title && formData.title.length > 10) score += 15;
    if (formData.photos && formData.photos.length >= 3) score += 25;
    else if (formData.photos && formData.photos.length > 0) score += 10;
    if (formData.selling_price || formData.rental_price) score += 15;
    if (formData.description && formData.description.length >= 50) score += 15;
    if (formData.bedroom || formData.land_area || formData.building_area) score += 15;
    if (formData.facilities && formData.facilities.length > 0) score += 10;
    if (formData.owner_name || formData.owner_phone) score += 5;
    return Math.min(score, 100);
  };

  const qualityScore = calculateQualityScore();

  // Handle Publikasi Properti
  const handlePublish = async () => {
    setPublishing(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sesi login tidak valid. Silakan login kembali.");

      if (!formData.title) throw new Error("Judul wajib diisi.");
      if (!formData.property_type) throw new Error("Tipe properti wajib dipilih.");
      if (!formData.address) throw new Error("Alamat wajib diisi.");

      const listingTypeMap: Record<string, string> = {
        jual: "jual",
        sewa: "sewa",
      };
      const listingType = listingTypeMap[formData.listing_type] || "jual";

      const addressPayload = {
        address: typeof formData.address === "string" ? formData.address : formData.address?.address || "",
        postal_code: formData.postal_code || formData.address?.postal_code || null,
        latitude: formData.latitude && !isNaN(parseFloat(formData.latitude)) ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude && !isNaN(parseFloat(formData.longitude)) ? parseFloat(formData.longitude) : null,
        country_id: cleanId(formData.country_id || formData.address?.country_id),
        province_id: cleanId(formData.province_id || formData.address?.province_id),
        city_id: cleanId(formData.city_id || formData.address?.city_id),
        district_id: cleanId(formData.district_id || formData.address?.district_id),
        village_id: cleanId(formData.village_id || formData.address?.village_id),
      };

      const safeUpsert = async (primaryTable: string, fallbackTable: string, payload: any) => {
        let { error } = await supabase.from(primaryTable).upsert(payload, { onConflict: "property_id" });
        if (error && fallbackTable) {
          const res = await supabase.from(fallbackTable).upsert(payload, { onConflict: "property_id" });
          error = res.error;
        }
        return error;
      };

      const safeInsert = async (primaryTable: string, fallbackTable: string, payload: any) => {
        let { error } = await supabase.from(primaryTable).insert(payload);
        if (error && fallbackTable) {
          const res = await supabase.from(fallbackTable).insert(payload);
          error = res.error;
        }
        return error;
      };

      // MODE EDIT
      if (mode === "edit" && propertyId) {
        const { error: propertyError } = await supabase
          .from("properties")
          .update({
            title: formData.title,
            property_type: formData.property_type,
            listing_type: listingType,
            property_category: formData.property_status || formData.property_category || null,
            description: formData.description || null,
            selling_point: formData.selling_point || null,
            rental_period: formData.rental_period || null,
            assigned_to: formData.assigned_to || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", propertyId);

        if (propertyError) throw new Error(`Gagal update properti: ${propertyError.message}`);

        if (formData.address) {
          await safeUpsert("addresses", "property_address", {
            property_id: propertyId,
            ...addressPayload,
          });
        }

        if (formData.selling_price || formData.rental_price) {
          await safeUpsert("prices", "property_price", {
            property_id: propertyId,
            selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
            rental_price: formData.rental_price ? parseFloat(formData.rental_price) : null,
            service_charge: formData.service_charge ? parseFloat(formData.service_charge) : null,
            maintenance_fee: formData.maintenance_fee ? parseFloat(formData.maintenance_fee) : null,
            negotiable: formData.negotiable || false,
          });
        }

        await safeUpsert("specifications", "property_specifications", {
          property_id: propertyId,
          bedroom: formData.bedroom ? parseInt(formData.bedroom) : formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathroom: formData.bathroom ? parseInt(formData.bathroom) : formData.bathrooms ? parseInt(formData.bathrooms) : null,
          garage: formData.garage ? parseInt(formData.garage) : null,
          carport: formData.carport ? parseInt(formData.carport) : null,
          floor: formData.floor ? parseInt(formData.floor) : null,
          electricity: formData.electricity ? parseInt(formData.electricity) : null,
          water_source: formData.water_source || null,
          certificate: formData.certificate || null,
          facing: formData.facing || null,
          condition: formData.condition || null,
          furnishing: formData.furnishing || null,
          year_built: formData.year_built ? parseInt(formData.year_built) : null,
        });

        if (formData.land_area) {
          await safeUpsert("land", "property_land", {
            property_id: propertyId,
            land_area: parseFloat(formData.land_area),
            land_unit: "m²",
            land_width: formData.land_width ? parseFloat(formData.land_width) : null,
            land_length: formData.land_length ? parseFloat(formData.land_length) : null,
          });
        }

        if (formData.building_area) {
          await safeUpsert("building", "property_building", {
            property_id: propertyId,
            building_area: parseFloat(formData.building_area),
            building_width: formData.building_width ? parseFloat(formData.building_width) : null,
            building_length: formData.building_length ? parseFloat(formData.building_length) : null,
          });
        }

        toast.success("Properti berhasil diperbarui!", { duration: 4000 });
        if (onSuccess) onSuccess();
        else setTimeout(() => router.push("/properties"), 1200);
        return;
      }

      // MODE CREATE
      let ownerId = null;
      if (formData.owner_name) {
        const { data: owner } = await supabase
          .from("property_owners")
          .insert({
            owner_code: `OWN-${Date.now()}`,
            full_name: formData.owner_name,
            phone: formData.owner_phone || null,
            whatsapp: formData.owner_whatsapp || null,
            email: formData.owner_email || null,
            identity_type: formData.owner_identity_type || null,
            identity_number: formData.owner_identity_number || null,
            address: formData.owner_address || null,
            notes: formData.owner_notes || null,
          })
          .select()
          .single();

        if (owner) ownerId = owner.id;
      }

      const propertyPayload = {
        listing_code: formData.listing_code || `PRP-${Date.now()}`,
        title: formData.title,
        slug: generateUniqueSlug(formData.title),
        property_type: formData.property_type,
        listing_type: listingType,
        property_category: formData.property_status || formData.property_category || null,
        status: "published",
        description: formData.description || null,
        selling_point: formData.selling_point || null,
        rental_period: formData.rental_period || null,
        owner_id: ownerId,
        created_by: user.id,
        assigned_to: formData.assigned_to || user.id,
        published_at: new Date().toISOString(),
      };

      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert([propertyPayload])
        .select()
        .single();

      if (propertyError) throw new Error(`Gagal menyimpan properti: ${propertyError.message}`);

      if (formData.address) {
        await safeInsert("addresses", "property_address", {
          property_id: property.id,
          ...addressPayload,
        });
      }

      if (formData.selling_price || formData.rental_price) {
        await safeInsert("prices", "property_price", {
          property_id: property.id,
          selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
          rental_price: formData.rental_price ? parseFloat(formData.rental_price) : null,
          service_charge: formData.service_charge ? parseFloat(formData.service_charge) : null,
          maintenance_fee: formData.maintenance_fee ? parseFloat(formData.maintenance_fee) : null,
          negotiable: formData.negotiable || false,
        });
      }

      await safeInsert("specifications", "property_specifications", {
        property_id: property.id,
        bedroom: formData.bedroom ? parseInt(formData.bedroom) : formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathroom: formData.bathroom ? parseInt(formData.bathroom) : formData.bathrooms ? parseInt(formData.bathrooms) : null,
        garage: formData.garage ? parseInt(formData.garage) : null,
        carport: formData.carport ? parseInt(formData.carport) : null,
        floor: formData.floor ? parseInt(formData.floor) : null,
        electricity: formData.electricity ? parseInt(formData.electricity) : null,
        water_source: formData.water_source || null,
        certificate: formData.certificate || null,
        facing: formData.facing || null,
        condition: formData.condition || null,
        furnishing: formData.furnishing || null,
        year_built: formData.year_built ? parseInt(formData.year_built) : null,
      });

      if (formData.land_area) {
        await safeInsert("land", "property_land", {
          property_id: property.id,
          land_area: parseFloat(formData.land_area),
          land_unit: "m²",
          land_width: formData.land_width ? parseFloat(formData.land_width) : null,
          land_length: formData.land_length ? parseFloat(formData.land_length) : null,
        });
      }

      if (formData.building_area) {
        await safeInsert("building", "property_building", {
          property_id: property.id,
          building_area: parseFloat(formData.building_area),
          building_width: formData.building_width ? parseFloat(formData.building_width) : null,
          building_length: formData.building_length ? parseFloat(formData.building_length) : null,
        });
      }

      toast.success("Properti berhasil dipublikasikan!", { duration: 4000 });
      setTimeout(() => router.push("/properties"), 1200);
    } catch (error: any) {
      console.error("Publish error:", error);
      toast.error(error.message || "Gagal mempublikasikan properti");
    } finally {
      setPublishing(false);
    }
  };

  const coverPhoto = formData.photos && formData.photos.length > 0
    ? formData.photos[0].preview || formData.photos[0].url || (typeof formData.photos[0] === "string" ? formData.photos[0] : null)
    : null;

  return (
    <div className="space-y-8">
      {/* HEADER UTAMA */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-600" />
          {mode === "edit" ? "Tinjau & Update Properti" : "Tinjau & Publikasikan"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Periksa kembali tampilan kartu listing, kelengkapan spesifikasi, dan data pemilik sebelum disimpan.
        </p>
      </div>

      {/* 📌 INDIKATOR SKOR KUALITAS LISTING (SAFE TAILWIND PROGRESS BAR) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              Skor Kualitas Listing Properti
            </h3>
          </div>
          <span className="bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full inline-block self-start sm:self-auto">
            {qualityScore}% Sangat Bagus
          </span>
        </div>

        {/* Custom Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${qualityScore}%` }}
          />
        </div>

        <p className="text-[11px] text-indigo-200/80 mt-2">
          Listing dengan skor tinggi berpeluang menarik pembeli 3x lebih cepat di portal pencarian.
        </p>
      </div>

      {/* 📌 LAYOUT PREVIEW & DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KARTU PREVIEW PROPERTI (5 COLS) */}
        <div className="lg:col-span-5 space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Preview Kartu Listing
          </label>

          <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-card shadow-lg rounded-2xl group">
            {/* GAMBAR COVER UTAMA */}
            <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
              {coverPhoto ? (
                <img
                  src={coverPhoto}
                  alt="Cover Preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                  <span className="text-xs">Foto Sampul Belum Diunggah</span>
                </div>
              )}

              {/* OVERLAY BADGES */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                <span className="bg-emerald-600 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded-md shadow-md">
                  {formData.listing_type === "sewa" ? "📋 Sewa" : "💰 Jual"}
                </span>
                <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-xs capitalize">
                  {formData.property_type || "Properti"}
                </span>
              </div>

              {formData.photos && formData.photos.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur-xs font-mono">
                  +{formData.photos.length - 1} Foto
                </div>
              )}
            </div>

            {/* DETAIL KARTU */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                  {formData.title || "Judul Listing Properti"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  {typeof formData.address === "string" ? formData.address : formData.address?.address || "Alamat belum diisi"}
                </p>
              </div>

              {/* HARGA */}
              <div className="pt-2 border-t flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Harga Penawaran</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formData.selling_price
                      ? `Rp ${new Intl.NumberFormat("id-ID").format(formData.selling_price)}`
                      : formData.rental_price
                      ? `Rp ${new Intl.NumberFormat("id-ID").format(formData.rental_price)} /bln`
                      : "Harga Kontak Agen"}
                  </p>
                </div>
                {formData.negotiable && (
                  <span className="text-[10px] border border-emerald-500/40 text-emerald-600 px-2 py-0.5 rounded-full font-semibold">
                    Nego
                  </span>
                )}
              </div>

              {/* FITUR UTAMA CARD */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">
                <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Bed className="w-3.5 h-3.5 mx-auto mb-1 text-slate-500" />
                  {formData.bedroom || formData.bedrooms || "0"} KT
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Bath className="w-3.5 h-3.5 mx-auto mb-1 text-slate-500" />
                  {formData.bathroom || formData.bathrooms || "0"} KM
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Maximize2 className="w-3.5 h-3.5 mx-auto mb-1 text-slate-500" />
                  {formData.land_area || "0"} m²
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Home className="w-3.5 h-3.5 mx-auto mb-1 text-slate-500" />
                  {formData.building_area || "0"} m²
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DETAILS & RINGKASAN DATA (7 COLS) */}
        <div className="lg:col-span-7 space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Rincian Lengkap Formulir
          </label>

          <div className="space-y-3">
            {/* SPESIFIKASI KELENGKAPAN */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" /> Spesifikasi & Bangunan
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-muted-foreground">Kategori:</span>
                  <span className="font-semibold capitalize">{formData.property_status || formData.property_category || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-muted-foreground">Sertifikat:</span>
                  <span className="font-semibold">{formData.certificate || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-muted-foreground">Daya Listrik:</span>
                  <span className="font-semibold">{formData.electricity ? `${formData.electricity} VA` : "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-muted-foreground">Kondisi Perabot:</span>
                  <span className="font-semibold">{formData.furnishing || "-"}</span>
                </div>
              </div>
            </div>

            {/* FASILITAS TERPILIH */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" /> Fasilitas Terpasang
              </h4>
              {formData.facilities && formData.facilities.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {formData.facilities.map((f: string) => (
                    <span key={f} className="text-[10px] bg-background border px-2 py-0.5 rounded-md font-semibold flex items-center">
                      <Check className="w-3 h-3 text-emerald-500 mr-1" /> {f}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Tidak ada fasilitas spesifik yang dipilih.</p>
              )}
            </div>

            {/* INFORMASI PEMILIK */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" /> Informasi Pemilik Properti (Internal Agen)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{formData.owner_name || "Pemilik tidak dicatat"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{formData.owner_phone || formData.owner_whatsapp || "-"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PEMBERITAHUAN FINAL */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
          <p className="font-bold">Konfirmasi Publikasi</p>
          <p className="text-amber-700/80 dark:text-amber-400">
            Dengan menekan tombol {mode === "edit" ? "Update Sekarang" : "Publikasikan Sekarang"}, data listing akan disinkronkan ke database secara aman.
          </p>
        </div>
      </div>

      {/* FOOTER NAVIGASI WIZARD */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={publishing}
          className="gap-2 text-xs h-9 border-slate-300 dark:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Button>

        <Button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          className="gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 font-bold px-6"
        >
          {publishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{mode === "edit" ? "Menyimpan Perubahan..." : "Mempublikasikan..."}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>{mode === "edit" ? "Update Sekarang" : "Publikasikan Sekarang"}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}