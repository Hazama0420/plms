import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { propertyInsertSchema, validate } from "@/lib/validations";
import { NO_AGENT_MESSAGE, resolvePublishStatus } from "@/lib/property-publish";
import { NO_REGION_MESSAGE, buildAddressPayload, hasRegion } from "@/lib/property-address";

/** `properties.slug` bersifat NOT NULL dan UNIQUE. */
function generateUniqueSlug(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const random = Math.random().toString(36).substring(2, 6);
  return `${base || "properti"}-${Date.now().toString(36)}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    // Membuat properti butuh izin kelola properti.
    const auth = await requirePermission("manage_own_properties");
    if (!auth.ok) return auth.response;

    const raw = await request.json();

    // Membatasi panjang teks bebas sebelum tersimpan (lib/validations.ts).
    // Skema sengaja longgar: field untuk tabel alamat, harga, spesifikasi, dan
    // media di bawah tetap dibaca langsung dari body.
    const parsed = validate(propertyInsertSchema, raw);
    if (!parsed.ok) return parsed.response;

    // Dibaca dari `raw`, bukan `parsed.data`. Skema `.loose()` mengetik field
    // tak terdaftar sebagai `unknown`, sehingga parseFloat/parseInt di bawah
    // tidak akan lolos TypeScript. Validasi di atas tetap berjalan sebagai
    // penjaga — field yang terdaftar sudah dipastikan bentuknya.
    //
    // Sengaja `any`, sama seperti hasil request.json() sebelumnya: dengan tipe
    // yang lebih sempit, Array.isArray() akan menyempitkan body.photos dan
    // membuat .filter(Boolean) di blok media gagal kompilasi.
    const body = raw as any;
    const { supabase, userId } = auth.ctx;

    // Setiap listing wajib punya agen penanggung jawab. Sebelumnya kolom ini
    // tidak pernah diisi di sini, sementara status default-nya "published" —
    // artinya setiap listing lewat route ini lahir dalam keadaan terbit tanpa
    // penanggung jawab. Pembuatnya dipakai sebagai penanggung jawab bawaan.
    const assignedTo = body.assigned_to || userId;

    // Bila entah bagaimana agennya tetap kosong, permintaan publikasi diturunkan
    // menjadi draf alih-alih ditolak: datanya sudah dikirim pengguna dan tidak
    // ada gunanya dibuang.
    const publish = resolvePublishStatus(body.status || "published", assignedTo);

    // Wilayah dari tabel `regions` adalah alamat resmi listing; nama jalan opsional.
    if (!hasRegion(body)) {
      return NextResponse.json(
        { success: false, error: NO_REGION_MESSAGE },
        { status: 400 }
      );
    }

    // 1. ISOLASI PAYLOAD UNTUK TABEL UTAMA 'properties'
    // Kolom di sini harus persis mengikuti skema tabel. `co_broke`, `youtube_url`,
    // dan `user_id` sebelumnya ikut dikirim padahal tidak ada di tabel, sementara
    // `slug` yang NOT NULL UNIQUE justru terlewat — insert-nya selalu gagal.
    const title =
      body.title || `${body.property_type || "Properti"} ${body.listing_type || "Jual"}`;

    const propertyPayload = {
      title,
      slug: generateUniqueSlug(title),
      property_type: body.property_type || "rumah",
      listing_type: body.listing_type || "jual",
      property_category: body.property_status || body.property_category || null,
      status: publish.status,
      listing_code: body.listing_code || `PR-${Date.now().toString().slice(-6)}`,
      description: body.description || "",
      selling_point: body.selling_point || "",
      rental_period: body.rental_period || null,
      facilities: Array.isArray(body.facilities) ? body.facilities : [],
      assigned_to: assignedTo,
      // Kepemilikan diambil dari sesi, bukan dari body, agar tidak bisa dipalsukan.
      created_by: userId,
      published_at: publish.downgraded ? null : new Date().toISOString(),
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
    // Kegagalan di sini dikembalikan ke pemanggil, tidak lagi hanya dicatat di
    // log server — itulah sebabnya alamat bisa hilang tanpa ada tanda apa pun.
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
          error: `Properti tersimpan, tetapi alamat gagal disimpan: ${addrError.message}`,
          data: property,
        },
        { status: 400 }
      );
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
      {
        success: true,
        message: publish.downgraded ? NO_AGENT_MESSAGE : "Properti berhasil dibuat",
        downgraded: publish.downgraded,
        data: property,
      },
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