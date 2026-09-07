// components/create-property/steps/StepReview.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { NO_AGENT_MESSAGE, resolvePublishStatus } from "@/lib/property-publish";
import {
  NO_REGION_MESSAGE,
  buildAddressPayload,
  composeFullAddress,
  hasRegion,
} from "@/lib/property-address";
import { Button } from "@/components/ui/button";
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
  Layers,
  ShieldCheck,
  ImageIcon,
  AlertTriangle,
  ArrowRight,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/hooks";

interface StepReviewProps {
  formData: any;
  prevStep?: () => void;
  goToStep?: (stepIndex: number) => void;
  mode?: "create" | "edit";
  propertyId?: string;
  onSuccess?: () => void;
}

export function StepReview({
  formData,
  goToStep,
  mode = "create",
  propertyId,
  onSuccess,
}: StepReviewProps) {
  const { t } = useTranslation();
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
  const regionValid = hasRegion(formData);

  // Status Checklist Persiapan Publikasi
  const checklist = [
    {
      label: t("createProperty.reviewStep.checklistItems.categoryTitle"),
      valid: Boolean(formData.title && formData.property_type),
      stepIndex: 0,
    },
    {
      label: t("createProperty.reviewStep.checklistItems.regionAdmin"),
      valid: regionValid,
      stepIndex: 2,
      critical: true,
      errorMsg: t("createProperty.reviewStep.checklistItems.regionError"),
    },
    {
      label: t("createProperty.reviewStep.checklistItems.price"),
      valid: Boolean(formData.selling_price || formData.rental_price),
      stepIndex: 4,
    },
    {
      label: t("createProperty.reviewStep.checklistItems.specs"),
      valid: Boolean(formData.bedroom || formData.land_area || formData.building_area),
      stepIndex: 1,
    },
    {
      label: t("createProperty.reviewStep.checklistItems.photos"),
      valid: Boolean(Array.isArray(formData.photos) && formData.photos.length > 0),
      stepIndex: 0,
    },
    {
      label: t("createProperty.reviewStep.checklistItems.agent"),
      valid: Boolean(formData.assigned_to),
      stepIndex: 5,
    },
  ];

  // Handle Publikasi Properti
  const handlePublish = async () => {
    setPublishing(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error(t("createProperty.reviewStep.errors.invalidSession"));

      if (!formData.title) throw new Error(t("createProperty.reviewStep.errors.titleRequired"));
      if (!formData.property_type) throw new Error(t("createProperty.reviewStep.errors.propertyTypeRequired"));
      // Yang wajib adalah wilayah hasil pencarian `regions`; nama jalan opsional.
      if (!hasRegion(formData)) throw new Error(NO_REGION_MESSAGE);

      const listingTypeMap: Record<string, string> = {
        jual: "jual",
        sewa: "sewa",
      };
      const listingType = listingTypeMap[formData.listing_type] || "jual";

      const addressPayload = buildAddressPayload(formData);
      const facilitiesPayload = Array.isArray(formData.facilities) ? formData.facilities : [];

      // ==========================================
      // 1. HANDLE DATA PEMILIK & JENIS IDENTITAS (DENGAN ERROR CHECKING KETAT)
      // ==========================================
      let ownerId = null;
      if (formData.owner_name) {
        let existingOwnerId = null;

        if (mode === "edit" && propertyId) {
          const { data: currentProp } = await supabase
            .from("properties")
            .select("owner_id")
            .eq("id", propertyId)
            .maybeSingle();
          existingOwnerId = currentProp?.owner_id;
        }

        const ownerPayload = {
          full_name: formData.owner_name,
          phone: formData.owner_phone || null,
          whatsapp: formData.owner_whatsapp || null,
          email: formData.owner_email || null,
          address: formData.owner_address || null,
          notes: formData.owner_notes || null,
        };

        if (existingOwnerId) {
          // 🟢 UPDATE DATA PEMILIK EKSISTING DENGAN CEK ERROR
          const { error: updateOwnerErr } = await supabase
            .from("property_owners")
            .update(ownerPayload)
            .eq("id", existingOwnerId);

          if (updateOwnerErr) {
            throw new Error(t("createProperty.reviewStep.errors.updateOwnerFailed").replace("{msg}", updateOwnerErr.message));
          }
          ownerId = existingOwnerId;
        } else {
          // 🟢 INSERT DATA PEMILIK BARU DENGAN CEK ERROR
          const { data: newOwner, error: insertOwnerErr } = await supabase
            .from("property_owners")
            .insert({
              owner_code: `OWN-${Date.now()}`,
              ...ownerPayload,
            })
            .select()
            .single();

          if (insertOwnerErr) {
            throw new Error(t("createProperty.reviewStep.errors.insertOwnerFailed").replace("{msg}", insertOwnerErr.message));
          }
          if (newOwner) ownerId = newOwner.id;
        }
      }

      // ==========================================
      // MODE EDIT
      // ==========================================
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
            facilities: facilitiesPayload,
            owner_id: ownerId, // 🟢 Sinkronisasi owner_id
            updated_at: new Date().toISOString(),
          })
          .eq("id", propertyId);

        if (propertyError) throw new Error(t("createProperty.reviewStep.errors.updatePropertyFailed").replace("{msg}", propertyError.message));

        // UPSERT ALAMAT
        const { error: addressError } = await supabase.from("property_address").upsert(
          { property_id: propertyId, ...addressPayload },
          { onConflict: "property_id" }
        );
        if (addressError) throw new Error(t("createProperty.reviewStep.errors.saveAddressFailed").replace("{msg}", addressError.message));

        // UPSERT HARGA
        if (formData.selling_price || formData.rental_price) {
          const { error: priceError } = await supabase.from("property_price").upsert(
            {
              property_id: propertyId,
              selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
              rental_price: formData.rental_price ? parseFloat(formData.rental_price) : null,
              service_charge: formData.service_charge ? parseFloat(formData.service_charge) : null,
              maintenance_fee: formData.maintenance_fee ? parseFloat(formData.maintenance_fee) : null,
              negotiable: formData.negotiable || false,
            },
            { onConflict: "property_id" }
          );
          if (priceError) throw new Error(t("createProperty.reviewStep.errors.savePriceFailed").replace("{msg}", priceError.message));
        }

        // UPSERT SPESIFIKASI
        const { error: specError } = await supabase.from("property_specifications").upsert(
          {
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
          },
          { onConflict: "property_id" }
        );
        if (specError) throw new Error(t("createProperty.reviewStep.errors.saveSpecFailed").replace("{msg}", specError.message));

        // UPSERT LUAS TANAH
        if (formData.land_area) {
          const { error: landError } = await supabase.from("property_land").upsert(
            {
              property_id: propertyId,
              land_area: parseFloat(formData.land_area),
              land_unit: "m²",
              land_width: formData.land_width ? parseFloat(formData.land_width) : null,
              land_length: formData.land_length ? parseFloat(formData.land_length) : null,
            },
            { onConflict: "property_id" }
          );
          if (landError) throw new Error(t("createProperty.reviewStep.errors.saveLandFailed").replace("{msg}", landError.message));
        }

        // UPSERT BANGUNAN
        if (formData.building_area) {
          const { error: buildingError } = await supabase.from("property_building").upsert(
            {
              property_id: propertyId,
              building_area: parseFloat(formData.building_area),
              building_width: formData.building_width ? parseFloat(formData.building_width) : null,
              building_length: formData.building_length ? parseFloat(formData.building_length) : null,
            },
            { onConflict: "property_id" }
          );
          if (buildingError) throw new Error(t("createProperty.reviewStep.errors.saveBuildingFailed").replace("{msg}", buildingError.message));
        }

        // 🟢 FIX FOTO HILANG: DELETE HANYA DILAKUKAN JIKA PAYLOAD BARU VALID
        if (Array.isArray(formData.photos) && formData.photos.length > 0) {
          const mediaPayload = formData.photos.map((p: any, idx: number) => {
            const url = typeof p === "string" ? p : p.public_url || p.preview || p.url || p.file_url || "";
            return {
              property_id: propertyId,
              public_url: url,
              storage_path: p.storage_path || url,
              media_type: p.media_type || "image",
              file_name: p.file_name || `photo_${idx}_${Date.now()}.jpg`,
              original_name: p.original_name || p.file_name || `photo_${idx}.jpg`,
              mime_type: p.mime_type || "image/jpeg",
              file_size: p.file_size || null,
              is_primary: idx === 0,
            };
          }).filter((m: any) => m.public_url !== "");

          if (mediaPayload.length > 0) {
            await supabase.from("property_media").delete().eq("property_id", propertyId);
            const { error: insertError } = await supabase.from("property_media").insert(mediaPayload);
            if (insertError) {
              console.error("Gagal menyimpan media foto baru:", insertError.message);
              toast.error(t("createProperty.reviewStep.errors.syncPhotoFailed").replace("{msg}", insertError.message));
            }
          }
        }

        toast.success(t("createProperty.reviewStep.successUpdate"), { duration: 4000 });
        if (onSuccess) onSuccess();
        else setTimeout(() => router.push("/properties"), 1200);
        return;
      }

      // ==========================================
      // MODE CREATE
      // ==========================================
      const assignedTo = formData.assigned_to || user.id;
      const publish = resolvePublishStatus("published", assignedTo);

      const propertyPayload = {
        listing_code: formData.listing_code || `PRP-${Date.now()}`,
        title: formData.title,
        slug: generateUniqueSlug(formData.title),
        property_type: formData.property_type,
        listing_type: listingType,
        property_category: formData.property_status || formData.property_category || null,
        status: publish.status,
        description: formData.description || null,
        selling_point: formData.selling_point || null,
        rental_period: formData.rental_period || null,
        facilities: facilitiesPayload,
        owner_id: ownerId,
        created_by: user.id,
        assigned_to: assignedTo,
        published_at: publish.downgraded ? null : new Date().toISOString(),
      };

      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert([propertyPayload])
        .select()
        .single();

      if (propertyError) throw new Error(t("createProperty.reviewStep.errors.insertPropertyFailed").replace("{msg}", propertyError.message));

      const newPropertyId = property.id;

      // UPSERT ALAMAT
      const { error: newAddressError } = await supabase.from("property_address").upsert(
        { property_id: newPropertyId, ...addressPayload },
        { onConflict: "property_id" }
      );
      if (newAddressError) throw new Error(t("createProperty.reviewStep.errors.saveAddressFailed").replace("{msg}", newAddressError.message));

      // UPSERT HARGA
      if (formData.selling_price || formData.rental_price) {
        const { error: newPriceError } = await supabase.from("property_price").upsert(
          {
            property_id: newPropertyId,
            selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
            rental_price: formData.rental_price ? parseFloat(formData.rental_price) : null,
            service_charge: formData.service_charge ? parseFloat(formData.service_charge) : null,
            maintenance_fee: formData.maintenance_fee ? parseFloat(formData.maintenance_fee) : null,
            negotiable: formData.negotiable || false,
          },
          { onConflict: "property_id" }
        );
        if (newPriceError) throw new Error(t("createProperty.reviewStep.errors.savePriceFailed").replace("{msg}", newPriceError.message));
      }

      // UPSERT SPESIFIKASI
      const { error: newSpecError } = await supabase.from("property_specifications").upsert(
        {
          property_id: newPropertyId,
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
        },
        { onConflict: "property_id" }
      );
      if (newSpecError) throw new Error(t("createProperty.reviewStep.errors.saveSpecFailed").replace("{msg}", newSpecError.message));

      // UPSERT LUAS TANAH
      if (formData.land_area) {
        const { error: newLandError } = await supabase.from("property_land").upsert(
          {
            property_id: newPropertyId,
            land_area: parseFloat(formData.land_area),
            land_unit: "m²",
            land_width: formData.land_width ? parseFloat(formData.land_width) : null,
            land_length: formData.land_length ? parseFloat(formData.land_length) : null,
          },
          { onConflict: "property_id" }
        );
        if (newLandError) throw new Error(t("createProperty.reviewStep.errors.saveLandFailed").replace("{msg}", newLandError.message));
      }

      // UPSERT BANGUNAN
      if (formData.building_area) {
        const { error: newBuildingError } = await supabase.from("property_building").upsert(
          {
            property_id: newPropertyId,
            building_area: parseFloat(formData.building_area),
            building_width: formData.building_width ? parseFloat(formData.building_width) : null,
            building_length: formData.building_length ? parseFloat(formData.building_length) : null,
          },
          { onConflict: "property_id" }
        );
        if (newBuildingError) throw new Error(t("createProperty.reviewStep.errors.saveBuildingFailed").replace("{msg}", newBuildingError.message));
      }

      // SIMPAN MEDIA FOTO
      if (Array.isArray(formData.photos) && formData.photos.length > 0) {
        const mediaPayload = formData.photos.map((p: any, idx: number) => {
          const url = typeof p === "string" ? p : p.public_url || p.preview || p.url || p.file_url || "";
          return {
            property_id: newPropertyId,
            public_url: url,
            storage_path: p.storage_path || url,
            media_type: "image",
            file_name: p.file_name || null,
            original_name: p.original_name || null,
            mime_type: p.mime_type || null,
            file_size: p.file_size || null,
            is_primary: idx === 0,
          };
        }).filter((m: any) => m.public_url !== "");

        if (mediaPayload.length > 0) {
          await supabase.from("property_media").insert(mediaPayload);
        }
      }

      // Hapus draf tersimpan di localStorage setelah berhasil dipublikasikan
      try {
        localStorage.removeItem("inland_property_draft");
      } catch {}

      if (publish.downgraded) {
        toast.warning(t("createProperty.reviewStep.successDraft"), {
          description: NO_AGENT_MESSAGE,
          duration: 6000,
        });
      } else {
        toast.success(t("createProperty.reviewStep.successPublish"), { duration: 4000 });
      }
      setTimeout(() => router.push("/properties"), 1200);
    } catch (error: any) {
      console.error("Publish error:", error);
      toast.error(error.message || t("createProperty.reviewStep.errors.publishFailed"));
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
          {mode === "edit" ? t("createProperty.reviewStep.titleEdit") : t("createProperty.reviewStep.titleReview")}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("createProperty.reviewStep.subtitle")}
        </p>
      </div>

      {/* CHECKLIST KESIAPAN PUBLIKASI */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {t("createProperty.reviewStep.checklistTitle")}
          </h3>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {t("createProperty.reviewStep.checklistComplete")
              .replace("{validCount}", checklist.filter((c) => c.valid).length.toString())
              .replace("{totalCount}", checklist.length.toString())}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {checklist.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                item.valid
                  ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                  : item.critical
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
                  : "bg-muted/40 border-border/60 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.valid ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span className="font-semibold truncate">{item.label}</span>
              </div>

              {!item.valid && goToStep && (
                <button
                  type="button"
                  onClick={() => goToStep(item.stepIndex)}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 flex items-center gap-0.5"
                >
                  {t("createProperty.reviewStep.completeBtn")} <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* INDIKATOR SKOR KUALITAS LISTING */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              {t("createProperty.reviewStep.qualityScoreTitle")}
            </h3>
          </div>
          <span className="bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full inline-block self-start sm:self-auto">
            {t("createProperty.reviewStep.excellentScore").replace("{score}", qualityScore.toString())}
          </span>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${qualityScore}%` }}
          />
        </div>

        <p className="text-[11px] text-indigo-200/80 mt-2">
          {t("createProperty.reviewStep.scoreHint")}
        </p>
      </div>

      {/* LAYOUT PREVIEW & DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KARTU PREVIEW PROPERTI */}
        <div className="lg:col-span-5 space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            {t("createProperty.reviewStep.previewTitle")}
          </label>

          <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-card shadow-lg rounded-2xl group">
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
                  <span className="text-xs">{t("createProperty.reviewStep.noCoverPhoto")}</span>
                </div>
              )}

              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                <span className="bg-emerald-600 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded-md shadow-md">
                  {formData.listing_type === "sewa" ? t("createProperty.reviewStep.rent") : t("createProperty.reviewStep.sell")}
                </span>
                <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-xs capitalize">
                  {formData.property_type || t("createProperty.reviewStep.propertyTypePlaceholder")}
                </span>
              </div>

              {formData.photos && formData.photos.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur-xs font-mono">
                  {t("createProperty.reviewStep.morePhotos").replace("{count}", (formData.photos.length - 1).toString())}
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                  {formData.title || t("createProperty.reviewStep.listingTitlePlaceholder")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  {composeFullAddress(formData.address, formData) || t("createProperty.reviewStep.regionNotSelected")}
                </p>
              </div>

              <div className="pt-2 border-t flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">{t("createProperty.reviewStep.offeringPrice")}</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formData.selling_price
                      ? `Rp ${new Intl.NumberFormat("id-ID").format(formData.selling_price)}`
                      : formData.rental_price
                      ? `Rp ${new Intl.NumberFormat("id-ID").format(formData.rental_price)} /bln`
                      : t("createProperty.reviewStep.priceContactAgent")}
                  </p>
                </div>
                {formData.negotiable && (
                  <span className="text-[10px] border border-emerald-500/40 text-emerald-600 px-2 py-0.5 rounded-full font-semibold">
                    {t("createProperty.reviewStep.negotiable")}
                  </span>
                )}
              </div>

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

        {/* DETAILS & RINGKASAN DATA */}
        <div className="lg:col-span-7 space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            {t("createProperty.reviewStep.detailsTitle")}
          </label>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" /> {t("createProperty.reviewStep.specsBuilding")}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-muted-foreground">{t("createProperty.reviewStep.categoryLabel")}</span>
                  <span className="font-semibold capitalize">{formData.property_status || formData.property_category || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-muted-foreground">{t("createProperty.reviewStep.certificateLabel")}</span>
                  <span className="font-semibold">{formData.certificate || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-muted-foreground">{t("createProperty.reviewStep.electricityLabel")}</span>
                  <span className="font-semibold">{formData.electricity ? `${formData.electricity} VA` : "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-muted-foreground">{t("createProperty.reviewStep.furnishingLabel")}</span>
                  <span className="font-semibold">{formData.furnishing || "-"}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" /> {t("createProperty.reviewStep.installedFacilities")}
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
                <p className="text-xs text-slate-400 italic">{t("createProperty.reviewStep.noSpecificFacilities")}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" /> {t("createProperty.reviewStep.ownerInfoTitle")}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{formData.owner_name || t("createProperty.reviewStep.noOwnerRecorded")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{formData.owner_phone || formData.owner_whatsapp || "-"}</span>
                </div>
                <div className="col-span-2 flex justify-between py-1 border-t border-slate-200/50 dark:border-slate-800">
                  <span className="text-muted-foreground">{t("createProperty.reviewStep.identityTypeLabel")}</span>
                  <span className="font-mono font-semibold">
                    {formData.owner_identity_type || "KTP"} - {formData.owner_identity_number || t("createProperty.reviewStep.noIdentityNumber")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ⚠️ PERINGATAN BILA WILAYAH BELUM LENGKAP */}
      {!regionValid && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-rose-900 dark:text-rose-200">
                {t("createProperty.reviewStep.incompleteRegionAlert")}
              </p>
              <p className="text-muted-foreground">
                {NO_REGION_MESSAGE} Listing tidak dapat dipublikasikan tanpa data wilayah resmi.
              </p>
            </div>
          </div>

          {goToStep && (
            <Button
              type="button"
              size="sm"
              onClick={() => goToStep(2)}
              className="h-8 px-3 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shrink-0 cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              {t("createProperty.reviewStep.fixLocationBtn")}
            </Button>
          )}
        </div>
      )}

      {/* AKSI PUBLIKASI */}
      <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {!regionValid ? (
            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {t("createProperty.reviewStep.publishDisabledAlert")}
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {t("createProperty.reviewStep.publishReadyAlert")}
            </span>
          )}
        </div>

        <Button
          type="button"
          onClick={handlePublish}
          disabled={publishing || !regionValid}
          className={`w-full sm:w-auto text-xs h-11 sm:h-9 font-bold px-7 rounded-xl transition-all ${
            !regionValid
              ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer"
          }`}
        >
          {publishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              <span>{mode === "edit" ? t("createProperty.reviewStep.savingChanges") : t("createProperty.reviewStep.publishing")}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-1.5" />
              <span>{mode === "edit" ? t("createProperty.reviewStep.updateNowBtn") : t("createProperty.reviewStep.publishNowBtn")}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}