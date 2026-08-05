import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { NO_AGENT_MESSAGE, requiresAgent, resolvePublishStatus } from "@/lib/property-publish";
import { buildAddressPayload } from "@/lib/property-address";

// ============================================================
// PUT HANDLER (Update Properti & Seluruh Sub-Tabel Relasi)
// ============================================================
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission("manage_own_properties");
    if (!auth.ok) return auth.response;

    const { id: propertyId } = await context.params;
    const body = await request.json();
    const { supabase } = auth.ctx;

    // 1. UPDATE TABEL MASTER 'properties'
    const propertyPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) propertyPayload.title = body.title;
    if (body.property_type !== undefined) propertyPayload.property_type = body.property_type;
    if (body.listing_type !== undefined) propertyPayload.listing_type = body.listing_type;
    if (body.status !== undefined) propertyPayload.status = body.status;
    if (body.listing_code !== undefined) propertyPayload.listing_code = body.listing_code;
    if (body.description !== undefined) propertyPayload.description = body.description || "";
    if (body.selling_point !== undefined) propertyPayload.selling_point = body.selling_point || "";
    if (body.rental_period !== undefined) propertyPayload.rental_period = body.rental_period || null;
    if (body.facilities !== undefined)
      propertyPayload.facilities = Array.isArray(body.facilities) ? body.facilities : [];

    // Listing tanpa agen penanggung jawab tidak boleh terbit. Route ini tidak
    // pernah mengubah `assigned_to`, jadi agen yang berlaku adalah milik baris
    // yang tersimpan sekarang. Barisnya hanya dibaca bila memang mau diterbitkan
    // — update biasa tidak perlu membayar query tambahan.
    let downgraded = false;
    if (requiresAgent(propertyPayload.status)) {
      const { data: existing } = await supabase
        .from("properties")
        .select("assigned_to")
        .eq("id", propertyId)
        .single();

      const resolved = resolvePublishStatus(propertyPayload.status, existing?.assigned_to);
      propertyPayload.status = resolved.status;
      downgraded = resolved.downgraded;
    }

    const { data: property, error: propError } = await supabase
      .from("properties")
      .update(propertyPayload)
      .eq("id", propertyId)
      .select()
      .single();

    if (propError) {
      console.error("Error PUT properties:", propError.message);
      return NextResponse.json(
        { success: false, error: propError.message },
        { status: 400 }
      );
    }

    // 2. UPSERT ALAMAT KE 'property_address'
    // Kegagalan alamat sekarang dikembalikan ke pemanggil alih-alih hanya dicatat
    // di log — itulah yang membuat alamat bisa hilang tanpa ada tanda apa pun.
    if (
      body.address !== undefined ||
      body.region_id !== undefined ||
      body.province_name !== undefined ||
      body.city_name !== undefined
    ) {
      const { error: addrError } = await supabase
        .from("property_address")
        .upsert(
          { property_id: propertyId, ...buildAddressPayload(body) },
          { onConflict: "property_id" }
        );

      if (addrError) {
        console.error("Error UPSERT property_address:", addrError.message);
        return NextResponse.json(
          {
            success: false,
            error: `Properti diupdate, tetapi alamat gagal disimpan: ${addrError.message}`,
            data: property,
          },
          { status: 400 }
        );
      }
    }

    // 3. UPSERT HARGA KE 'property_price'
    if (body.selling_price !== undefined || body.rental_price !== undefined) {
      const pricePayload = {
        property_id: propertyId,
        selling_price: body.selling_price ? parseFloat(body.selling_price) : null,
        rental_price: body.rental_price ? parseFloat(body.rental_price) : null,
        service_charge: body.service_charge ? parseFloat(body.service_charge) : null,
        maintenance_fee: body.maintenance_fee ? parseFloat(body.maintenance_fee) : null,
        rental_period: body.rental_period || null,
        negotiable: Boolean(body.negotiable),
      };

      const { error: priceError } = await supabase
        .from("property_price")
        .upsert(pricePayload, { onConflict: "property_id" });

      if (priceError) console.error("Error UPSERT property_price:", priceError.message);
    }

    // 4. UPSERT SPESIFIKASI KE 'property_specifications'
    if (
      body.bedroom !== undefined ||
      body.bathroom !== undefined ||
      body.land_area !== undefined ||
      body.building_area !== undefined
    ) {
      const specPayload = {
        property_id: propertyId,
        bedroom: body.bedroom ? parseInt(body.bedroom) : null,
        bathroom: body.bathroom ? parseInt(body.bathroom) : null,
        garage: body.garage ? parseInt(body.garage) : null,
        carport: body.carport ? parseInt(body.carport) : null,
        electricity: body.electricity ? parseInt(body.electricity) : null,
        year_built: body.year_built ? parseInt(body.year_built) : null,
        certificate: body.certificate || null,
        condition: body.condition || null,
        furnishing: body.furnishing || null,
        land_area: body.land_area ? parseFloat(body.land_area) : null,
        building_area: body.building_area ? parseFloat(body.building_area) : null,
      };

      const { error: specError } = await supabase
        .from("property_specifications")
        .upsert(specPayload, { onConflict: "property_id" });

      if (specError) console.error("Error UPSERT property_specifications:", specError.message);
    }

    // 5. UPDATE MEDIA/FOTO KE 'property_media'
    if (Array.isArray(body.photos)) {
      // Hapus media lama untuk properti ini
      await supabase.from("property_media").delete().eq("property_id", propertyId);

      if (body.photos.length > 0) {
        const mediaRecords = body.photos
          .map((photo: any, index: number) => {
            const publicUrl =
              typeof photo === "string"
                ? photo
                : photo.public_url || photo.url || photo.preview || "";

            if (!publicUrl || publicUrl.trim() === "") return null;

            const urlParts = publicUrl.split("/");
            const extractedName =
              urlParts[urlParts.length - 1] || `photo_${Date.now()}_${index}.jpg`;

            const fileName = photo.file_name || extractedName;
            const originalName = photo.original_name || fileName;
            const storagePath =
              photo.storage_path ||
              photo.path ||
              `properties/${propertyId}/${fileName}`;

            return {
              property_id: propertyId,
              media_type: "image",                           // NOT NULL & Sesuai constraint
              file_name: fileName,                           // NOT NULL
              original_name: originalName,                   // NOT NULL
              storage_path: storagePath,                     // NOT NULL
              public_url: publicUrl,                         // Public URL
              mime_type: photo.mime_type || "image/jpeg",
              file_size: photo.file_size || null,
              is_primary: photo.is_primary ?? index === 0,
              sort_order: photo.sort_order ?? index,
            };
          })
          .filter(Boolean);

        if (mediaRecords.length > 0) {
          const { error: mediaError } = await supabase
            .from("property_media")
            .insert(mediaRecords);

          if (mediaError) console.error("Error INSERT property_media:", mediaError.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: property,
      downgraded,
      ...(downgraded ? { message: NO_AGENT_MESSAGE } : {}),
    });
  } catch (err: any) {
    console.error("PUT Property Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH HANDLER (Partial Update)
// ============================================================
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission("manage_own_properties");
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const body = await request.json();
    const { supabase } = auth.ctx;

    // Hapus variabel temporary frontend
    delete body.photos_uploaded;
    delete body.isExisting;
    delete body.file;

    // Kepemilikan tidak boleh dipindah lewat PATCH bebas.
    delete body.user_id;
    delete body.id;

    // PATCH menyalin seluruh body, sehingga `status` dan `assigned_to` bisa
    // berubah dalam satu permintaan yang sama. Agen yang berlaku adalah nilai
    // baru bila dikirim, kalau tidak nilai yang sudah tersimpan.
    let downgraded = false;
    if (requiresAgent(body.status)) {
      const { data: existing } = await supabase
        .from("properties")
        .select("assigned_to")
        .eq("id", id)
        .single();

      const effectiveAgent =
        body.assigned_to !== undefined ? body.assigned_to : existing?.assigned_to;

      const resolved = resolvePublishStatus(body.status, effectiveAgent);
      body.status = resolved.status;
      downgraded = resolved.downgraded;
    }

    const { data, error } = await supabase
      .from("properties")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      downgraded,
      ...(downgraded ? { message: NO_AGENT_MESSAGE } : {}),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ============================================================
// GET HANDLER (Ambil Detail 1 Properti + Relasi Sub-Tabel)
// ============================================================
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Respons memuat relasi property_owners (nama, telepon, email pemilik).
    // Itu data pribadi, jadi endpoint ini wajib login.
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const { supabase } = auth.ctx;

    const { data, error } = await supabase
      .from("properties")
      .select(
        `
          *,
          owner:property_owners(*),
          address:property_address(*),
          price:property_price(*),
          specifications:property_specifications(*),
          land:property_land(*),
          building:property_building(*),
          media:property_media(*)
        `
      )
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE HANDLER (Hapus Properti)
// ============================================================
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Penghapusan permanen — butuh izin kelola seluruh properti.
    const auth = await requirePermission("manage_all_properties");
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const { supabase } = auth.ctx;

    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Properti berhasil dihapus" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}