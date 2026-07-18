// components/create-property/steps/StepReview.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { mediaService } from "@/services/media.service";

interface StepReviewProps {
  formData: any;
  prevStep: () => void;
  mode?: "create" | "edit";
  propertyId?: string;
  onSuccess?: () => void;
}

export function StepReview({ formData, prevStep, mode = "create", propertyId, onSuccess }: StepReviewProps) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  const generateUniqueSlug = (title: string) => {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const random = Math.random().toString(36).substring(2, 6);
    const timestamp = Date.now().toString(36);
    return `${baseSlug}-${timestamp}-${random}`;
  };

  const handlePublish = async () => {
    setPublishing(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error("Sesi login tidak valid.");
      if (!user) throw new Error("Anda belum login.");

      if (!formData.title) throw new Error("Judul wajib diisi.");
      if (!formData.property_type) throw new Error("Tipe properti wajib dipilih.");
      if (!formData.address) throw new Error("Alamat wajib diisi.");

      const listingTypeMap: Record<string, string> = {
        'jual': 'jual',
        'sewa': 'sewa',
      };
      const listingType = listingTypeMap[formData.listing_type] || 'jual';

      // ===== MODE EDIT =====
      if (mode === "edit" && propertyId) {
        // UPDATE Property
        const { error: propertyError } = await supabase
          .from("properties")
          .update({
            title: formData.title,
            property_type: formData.property_type,
            listing_type: listingType,
            property_category: formData.property_status || null,
            description: formData.description || null,
            selling_point: formData.selling_point || null,
            rental_period: formData.rental_period || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", propertyId);

        if (propertyError) throw new Error(`Gagal update properti: ${propertyError.message}`);

        // UPDATE Address
        if (formData.address) {
          const addressData: any = {
            address: formData.address,
            postal_code: formData.postal_code || null,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            country_id: formData.country_id || null,
            province_id: formData.province_id || null,
            city_id: formData.city_id || null,
            district_id: formData.district_id || null,
            village_id: formData.village_id || null,
          };
          const { error: addressError } = await supabase
            .from("property_address")
            .update(addressData)
            .eq("property_id", propertyId);
          if (addressError) throw new Error(`Gagal update alamat: ${addressError.message}`);
        }

        // UPDATE Price
        if (formData.selling_price || formData.rental_price) {
          const { error: priceError } = await supabase
            .from("property_price")
            .update({
              selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
              rental_price: formData.rental_price ? parseFloat(formData.rental_price) : null,
              service_charge: formData.service_charge ? parseFloat(formData.service_charge) : null,
              maintenance_fee: formData.maintenance_fee ? parseFloat(formData.maintenance_fee) : null,
              negotiable: formData.negotiable || false,
            })
            .eq("property_id", propertyId);
          if (priceError) throw new Error(`Gagal update harga: ${priceError.message}`);
        }

        // UPDATE Specifications
        const { error: specError } = await supabase
          .from("property_specifications")
          .update({
            bedroom: formData.bedroom ? parseInt(formData.bedroom) : null,
            bathroom: formData.bathroom ? parseInt(formData.bathroom) : null,
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
          })
          .eq("property_id", propertyId);
        if (specError) throw new Error(`Gagal update spesifikasi: ${specError.message}`);

        // UPDATE Land
        if (formData.land_area) {
          const { error: landError } = await supabase
            .from("property_land")
            .update({
              land_area: parseFloat(formData.land_area),
              land_unit: "m²",
              land_width: formData.land_width ? parseFloat(formData.land_width) : null,
              land_length: formData.land_length ? parseFloat(formData.land_length) : null,
            })
            .eq("property_id", propertyId);
          if (landError) throw new Error(`Gagal update data tanah: ${landError.message}`);
        }

        // UPDATE Building
        if (formData.building_area) {
          const { error: buildingError } = await supabase
            .from("property_building")
            .update({
              building_area: parseFloat(formData.building_area),
              building_width: formData.building_width ? parseFloat(formData.building_width) : null,
              building_length: formData.building_length ? parseFloat(formData.building_length) : null,
            })
            .eq("property_id", propertyId);
          if (buildingError) throw new Error(`Gagal update data bangunan: ${buildingError.message}`);
        }

        toast.success("Property berhasil diupdate!", { duration: 4000 });

        if (onSuccess) {
          onSuccess();
        } else {
          setTimeout(() => router.push("/properties"), 1500);
        }
        return;
      }

      // ===== MODE CREATE =====
      // Insert Owner
      let ownerId = null;
      if (formData.owner_name) {
        const { data: owner, error: ownerError } = await supabase
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
        if (ownerError) throw new Error(`Gagal menyimpan pemilik: ${ownerError.message}`);
        ownerId = owner.id;
      }

      // Insert Property
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert({
          listing_code: formData.listing_code || `PRP-${Date.now()}`,
          title: formData.title,
          slug: generateUniqueSlug(formData.title),
          property_type: formData.property_type,
          listing_type: listingType,
          property_category: formData.property_status || null,
          status: "published",
          description: formData.description || null,
          selling_point: formData.selling_point || null,
          rental_period: formData.rental_period || null,
          owner_id: ownerId,
          created_by: user.id,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (propertyError) throw new Error(`Gagal menyimpan properti: ${propertyError.message}`);

      // Insert Address
      if (formData.address) {
        const addressData: any = {
          property_id: property.id,
          address: formData.address,
          postal_code: formData.postal_code || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          country_id: formData.country_id || null,
          province_id: formData.province_id || null,
          city_id: formData.city_id || null,
          district_id: formData.district_id || null,
          village_id: formData.village_id || null,
        };
        const { error: addressError } = await supabase
          .from("property_address")
          .insert(addressData);
        if (addressError) throw new Error(`Gagal menyimpan alamat: ${addressError.message}`);
      }

      // Insert Price
      if (formData.selling_price || formData.rental_price) {
        const { error: priceError } = await supabase
          .from("property_price")
          .insert({
            property_id: property.id,
            selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
            rental_price: formData.rental_price ? parseFloat(formData.rental_price) : null,
            service_charge: formData.service_charge ? parseFloat(formData.service_charge) : null,
            maintenance_fee: formData.maintenance_fee ? parseFloat(formData.maintenance_fee) : null,
            negotiable: formData.negotiable || false,
          });
        if (priceError) throw new Error(`Gagal menyimpan harga: ${priceError.message}`);
      }

      // Insert Specifications
      const { error: specError } = await supabase
        .from("property_specifications")
        .insert({
          property_id: property.id,
          bedroom: formData.bedroom ? parseInt(formData.bedroom) : null,
          bathroom: formData.bathroom ? parseInt(formData.bathroom) : null,
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
      if (specError) throw new Error(`Gagal menyimpan spesifikasi: ${specError.message}`);

      // Insert Land
      if (formData.land_area) {
        const { error: landError } = await supabase
          .from("property_land")
          .insert({
            property_id: property.id,
            land_area: parseFloat(formData.land_area),
            land_unit: "m²",
            land_width: formData.land_width ? parseFloat(formData.land_width) : null,
            land_length: formData.land_length ? parseFloat(formData.land_length) : null,
          });
        if (landError) throw new Error(`Gagal menyimpan data tanah: ${landError.message}`);
      }

      // Insert Building
      if (formData.building_area) {
        const { error: buildingError } = await supabase
          .from("property_building")
          .insert({
            property_id: property.id,
            building_area: parseFloat(formData.building_area),
            building_width: formData.building_width ? parseFloat(formData.building_width) : null,
            building_length: formData.building_length ? parseFloat(formData.building_length) : null,
          });
        if (buildingError) throw new Error(`Gagal menyimpan data bangunan: ${buildingError.message}`);
      }

      // Upload Photos
      if (formData.photos && formData.photos.length > 0) {
        try {
          const files = formData.photos.map((p: any) => p.file);
          await mediaService.uploadImages(property.id, files);
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          toast.warning("Foto gagal diupload, Anda bisa upload ulang nanti.");
        }
      }

      toast.success("Property berhasil dipublikasikan!", { duration: 4000 });
      setTimeout(() => router.push("/properties"), 1500);
    } catch (error: any) {
      console.error("Publish error:", error);
      toast.error(error.message || "Gagal mempublikasikan property");
    } finally {
      setPublishing(false);
    }
  };

  const renderSummaryItem = (label: string, value: any) => {
    if (!value) return null;
    return (
      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-sm font-medium text-slate-900 dark:text-white">{value}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {mode === "edit" ? "Preview & Update" : "Preview & Publish"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {mode === "edit" ? "Periksa kembali semua data sebelum mengupdate" : "Periksa kembali semua data sebelum mempublikasikan"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="text-lg">Preview Properti</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
              {formData.photos && formData.photos.length > 0 ? (
                <img
                  src={formData.photos[0].preview}
                  alt="Cover"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span className="text-slate-400">Belum ada foto</span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {formData.title || "Judul Properti"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formData.address || "Alamat tidak diisi"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{formData.property_type || "Tipe"}</Badge>
              <Badge variant="secondary">
                {formData.listing_type === "jual" ? "💰 Jual" : "📋 Sewa"}
              </Badge>
              {formData.property_status && (
                <Badge variant="outline">{formData.property_status}</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {formData.bedroom && (
                <div className="flex items-center gap-1">
                  <span>🛏️</span> {formData.bedroom} KT
                </div>
              )}
              {formData.bathroom && (
                <div className="flex items-center gap-1">
                  <span>🛁</span> {formData.bathroom} KM
                </div>
              )}
              {formData.land_area && (
                <div className="flex items-center gap-1">
                  <span>📐</span> {formData.land_area} m²
                </div>
              )}
              {formData.building_area && (
                <div className="flex items-center gap-1">
                  <span>🏠</span> {formData.building_area} m²
                </div>
              )}
            </div>
            {formData.selling_price && (
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                Rp {new Intl.NumberFormat("id-ID").format(formData.selling_price)}
              </div>
            )}
            {formData.rental_price && (
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                Rp {new Intl.NumberFormat("id-ID").format(formData.rental_price)} / bulan
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ringkasan Data */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[400px] overflow-y-auto">
              {renderSummaryItem("Judul", formData.title)}
              {renderSummaryItem("Tipe Properti", formData.property_type)}
              {renderSummaryItem("Tipe Listing", formData.listing_type === "jual" ? "Jual" : "Sewa")}
              {renderSummaryItem("Status Properti", formData.property_status)}
              {renderSummaryItem("Alamat", formData.address)}
              {renderSummaryItem("Harga Jual", formData.selling_price ? `Rp ${new Intl.NumberFormat("id-ID").format(formData.selling_price)}` : null)}
              {renderSummaryItem("Harga Sewa", formData.rental_price ? `Rp ${new Intl.NumberFormat("id-ID").format(formData.rental_price)}` : null)}
              {renderSummaryItem("Kamar Tidur", formData.bedroom)}
              {renderSummaryItem("Kamar Mandi", formData.bathroom)}
              {renderSummaryItem("Luas Tanah", formData.land_area ? `${formData.land_area} m²` : null)}
              {renderSummaryItem("Luas Bangunan", formData.building_area ? `${formData.building_area} m²` : null)}
              {renderSummaryItem("Fasilitas", formData.facilities?.length > 0 ? formData.facilities.join(", ") : null)}
              {renderSummaryItem("Nama Pemilik", formData.owner_name)}
              {renderSummaryItem("Telepon", formData.owner_phone)}
              {renderSummaryItem("Email", formData.owner_email)}
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Periksa Kembali</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Pastikan semua data sudah benar sebelum publikasi. Data tidak dapat diubah setelah dipublikasikan tanpa melalui proses edit.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          ← Kembali
        </Button>
        <Button
          onClick={handlePublish}
          disabled={publishing}
          className="gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-600/30"
        >
          {publishing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === "edit" ? "Mengupdate..." : "Mempublikasikan..."}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              {mode === "edit" ? "Update Sekarang" : "Publikasikan Sekarang"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}