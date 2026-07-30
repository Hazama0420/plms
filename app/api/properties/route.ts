import { NextRequest, NextResponse } from "next/server";
import { createServerClientInstance } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createServerClientInstance();

    // 1. ISOLASI PAYLOAD UNTUK TABEL UTAMA 'properties'
    const propertyPayload = {
      title: body.title || `${body.property_type || "Properti"} ${body.listing_type || "Jual"}`,
      property_type: body.property_type || "rumah",
      listing_type: body.listing_type || "jual",
      status: body.status || "published",
      co_broke: Boolean(body.co_broke),
      youtube_url: body.youtube_url || null,
      listing_code: body.listing_code || `PR-${Date.now().toString().slice(-6)}`,
      description: body.description || "",
      selling_point: body.selling_point || "",
    };

    // Insert ke tabel master 'properties'
    const { data: property, error: propError } = await supabase
      .from("properties")
      .insert([propertyPayload])
      .select()
      .single();

    if (propError) {
      console.error("Error INSERT properties:", propError.message);
      return NextResponse.json(
        { success: false, error: propError.message },
        { status: 400 }
      );
    }

    const propertyId = property.id;

    // 2. SIMPAN ALAMAT KE TABEL 'property_address'
    if (body.address || body.city_id || body.province_id) {
      const addressPayload = {
        property_id: propertyId,
        address: body.address || "",
        country_id: body.country_id || null,
        province_id: body.province_id || null,
        city_id: body.city_id || null,
        district_id: body.district_id || null,
        village_id: body.village_id || null,
        postal_code: body.postal_code || null,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
      };

      const { error: addrError } = await supabase
        .from("property_address")
        .upsert(addressPayload, { onConflict: "property_id" });

      if (addrError) console.error("Error UPSERT property_address:", addrError.message);
    }

    // 3. SIMPAN HARGA KE TABEL 'property_price'
    if (body.selling_price || body.rental_price) {
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

    // 4. SIMPAN SPESIFIKASI KE TABEL 'property_specifications'
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

    // 5. SIMPAN FOTO/MEDIA KE TABEL 'property_media' (FIXED SCHEMA PAYLOAD)
    if (Array.isArray(body.photos) && body.photos.length > 0) {
      const mediaRecords = body.photos
        .map((photo: any, index: number) => {
          // Ambil URL string dari objek/string photo
          const publicUrl =
            typeof photo === "string"
              ? photo
              : photo.public_url || photo.url || photo.preview || "";

          if (!publicUrl || publicUrl.trim() === "") return null;

          // Ekstrak nama file & path aman
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
            media_type: "image",                             // NOT NULL & Wajib sesuai CHECK constraint
            file_name: fileName,                             // NOT NULL
            original_name: originalName,                     // NOT NULL
            storage_path: storagePath,                       // NOT NULL
            public_url: publicUrl,                           // URL Publik
            mime_type: photo.mime_type || "image/jpeg",
            file_size: photo.file_size || null,
            is_primary: photo.is_primary ?? index === 0,     // Foto pertama otomatis utama
            sort_order: photo.sort_order ?? index,
          };
        })
        .filter(Boolean); // Buang item bernilai null

      if (mediaRecords.length > 0) {
        const { error: mediaError } = await supabase
          .from("property_media")
          .insert(mediaRecords);

        if (mediaError) {
          console.error("Error INSERT property_media:", mediaError.message);
        }
      }
    }

    return NextResponse.json(
      { success: true, message: "Properti berhasil dibuat", data: property },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("API Property Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}