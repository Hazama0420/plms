// services/property.service.ts
import { supabase } from "@/lib/supabase/client";
import type {
  Property,
  PropertyStatus,
  AdvancedFilter,
  PropertyFilter,
} from "@/types/property.types";

// Ekspor tipe untuk digunakan di tempat lain
export type { PropertyFilter };

// ============================================================
// NORMALISASI NILAI FILTER
// ============================================================

/**
 * Label di UI tidak selalu sama dengan nilai di basis data. "Perkantoran"
 * tersimpan sebagai `kantor`, dan "Ruang Usaha" sebagai `ruang_usaha`.
 * Tanpa pemetaan ini, memilih kategori tersebut selalu menghasilkan nol baris.
 */
const PROPERTY_TYPE_ALIASES: Record<string, string> = {
  perkantoran: "kantor",
  "ruang usaha": "ruang_usaha",
  apartment: "apartemen",
  house: "rumah",
  land: "tanah",
};

function normalizePropertyType(value: string): string {
  const key = value.trim().toLowerCase();
  return (PROPERTY_TYPE_ALIASES[key] ?? key).replace(/\s+/g, "_");
}

/** "dijual"/"sale"/"jual" → "jual"; "disewa"/"rent"/"sewa" → "sewa". */
const LISTING_TYPE_ALIASES: Record<string, string> = {
  jual: "jual",
  dijual: "jual",
  sale: "jual",
  sell: "jual",
  sewa: "sewa",
  disewa: "sewa",
  disewakan: "sewa",
  rent: "sewa",
  rental: "sewa",
};

function normalizeListingType(value: string): string {
  const key = value.trim().toLowerCase();
  return LISTING_TYPE_ALIASES[key] ?? key;
}

/** Mengubah nilai filter menjadi angka; string kosong dianggap "tidak diisi". */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Menetralkan karakter yang punya arti khusus di dalam pola PostgREST agar
 * kata kunci pencarian tidak bisa menyelipkan filter tambahan.
 */
function escapePattern(value: string): string {
  return value.replace(/[%_,().*\\]/g, " ").trim();
}

/**
 * Batas jumlah id properti yang boleh ikut dari pencocokan alamat.
 *
 * Kata kunci dicocokkan ke alamat lewat pra-kueri ke `property_address`, lalu
 * id-nya disisipkan ke klausa `or` sebagai `id.in.(...)`. PostgREST tidak bisa
 * meng-OR kolom tabel induk dengan kolom tabel anak dalam satu klausa, jadi
 * dua langkah ini satu-satunya cara mendapat perilaku "judul ATAU alamat".
 *
 * Batasnya ada karena setiap id memakan ~37 karakter di URL kueri; tanpa itu
 * kata kunci umum seperti "Jakarta" bisa membangun URL belasan kilobyte yang
 * ditolak gateway Supabase.
 */
const ADDRESS_MATCH_LIMIT = 200;

// ============================================================
// SERVICE OBJECT (tanpa duplikasi)
// ============================================================
const propertyService = {
  // ============================================================
  // GET LIST – Daftar Properti (Dengan Multi-Filter Presisi & Aman)
  // ============================================================
  //
  // Seluruh penyaringan dikerjakan di basis data, bukan di peramban. Versi
  // sebelumnya mengambil satu halaman berisi 12 baris terbaru lalu menyaringnya
  // di sisi klien, sehingga hasil pencarian hanya berasal dari 12 properti itu
  // — memilih "Rumah" atau "Kota: Bandung" tampak seperti tidak berfungsi
  // karena kebanyakan properti yang cocok tidak pernah ikut terambil.
  async getList(filters: PropertyFilter = {}) {
    const {
      search = "",
      status = "all",
      listing_type = "all",
      property_type = "all",
      page = 1,
      limit = 12,
      sort_by = "created_at",
      sort_order = "desc",
      owner_id = null,
      is_featured = null,
      advanced = {},
    } = filters;

    const offset = (page - 1) * limit;
    const ascending = sort_order === "asc";

    // ===== NILAI FILTER LANJUTAN =====
    const priceMin = toNumber(advanced.priceMin);
    const priceMax = toNumber(advanced.priceMax);
    const landAreaMin = toNumber(advanced.landAreaMin);
    const landAreaMax = toNumber(advanced.landAreaMax);
    const buildingAreaMin = toNumber(advanced.buildingAreaMin);
    const buildingAreaMax = toNumber(advanced.buildingAreaMax);
    const bedroom = toNumber(advanced.bedroom);
    const bathroom = toNumber(advanced.bathroom);
    const yearBuilt = toNumber(advanced.year_built);

    const provinceName = escapePattern(toText(advanced.province_name));
    const cityName = escapePattern(toText(advanced.city_name));
    const districtName = escapePattern(toText(advanced.district_name));

    // Filter multi-lokasi katalog: beberapa kecamatan sekaligus, dicocokkan
    // sebagai OR. Nilainya dikirim sebagai array — bukan satu string ber-koma —
    // karena escapePattern membuang koma dan akan meleburkan seluruh pilihan
    // menjadi satu kata kunci yang tidak pernah cocok.
    const districtNames = (
      Array.isArray(advanced.district_names) ? advanced.district_names : []
    )
      .map((value) => escapePattern(toText(value)))
      .filter(Boolean);

    const certificate = toText(advanced.certificate);
    const furnishing = toText(advanced.furnishing);
    const hasCertificate = Boolean(certificate) && certificate !== "all";
    const hasFurnishing = Boolean(furnishing) && furnishing !== "all";

    const sortByPrice = sort_by === "price";

    // ===== PENENTUAN JOIN =====
    //
    // `!inner` menentukan hidup-matinya filter relasi. Tanpa itu PostgREST hanya
    // mengosongkan objek anak yang tidak cocok, sementara baris induknya tetap
    // ikut terkirim — persis gejala "filter harga/luas tidak berpengaruh".
    //
    // Join dipasang hanya saat filternya benar-benar dipakai, supaya properti
    // yang belum punya baris harga atau luas tidak lenyap dari daftar biasa.
    const joinPrice = priceMin !== null || priceMax !== null || sortByPrice;
    const joinLand = landAreaMin !== null || landAreaMax !== null;
    const joinBuilding = buildingAreaMin !== null || buildingAreaMax !== null;
    const joinSpecs =
      bedroom !== null ||
      bathroom !== null ||
      yearBuilt !== null ||
      hasCertificate ||
      hasFurnishing;
    const joinAddress =
      Boolean(provinceName) ||
      Boolean(cityName) ||
      Boolean(districtName) ||
      districtNames.length > 0;

    const inner = (needed: boolean) => (needed ? "!inner" : "");

    // Nama wilayah kini tersimpan langsung di `property_address` (region_id +
    // province_name/city_name/district_name/village_name), jadi tidak ada lagi
    // join ke countries/provinces/cities/districts/villages. Join bertingkat itu
    // juga sempat menyembunyikan properti yang tabel referensinya sudah kosong.
    const selectClause = `
      *,
      owner:property_owners(*),
      address:property_address${inner(joinAddress)}(*),
      price:property_price${inner(joinPrice)}(*),
      specifications:property_specifications${inner(joinSpecs)}(*),
      land:property_land${inner(joinLand)}(*),
      building:property_building${inner(joinBuilding)}(*),
      media:property_media(*)
    `;

    // Klausa select disusun dinamis, sehingga tipe hasilnya tidak lagi bisa
    // disimpulkan dari string literal. Builder dilonggarkan di sini saja, lalu
    // hasil akhirnya dipetakan kembali ke `Property[]`.
    let query: any = supabase.from("properties").select(selectClause, { count: "exact" });

    // ===== PENGURUTAN =====
    if (sortByPrice) {
      // Hanya pengurutan relasi yang dikirim: menggabungkannya dengan order
      // pada tabel induk membuat urutan akhirnya tidak menentu.
      query = query.order("selling_price", {
        referencedTable: "price",
        ascending,
        nullsFirst: false,
      });
    } else {
      query = query.order(sort_by, { ascending });
    }

    query = query.range(offset, offset + limit - 1);

    // ===== SEARCH (judul, kode listing, deskripsi, dan ALAMAT) =====
    //
    // Sebelumnya kata kunci hanya dicocokkan ke tiga kolom di tabel induk,
    // sehingga mengetik nama daerah — "Gunung Sindur", "BSD", "Bogor" — hampir
    // selalu nihil meski propertinya ada: nama wilayah tersimpan di
    // `property_address`, bukan di judul.
    //
    // Menggabungkannya jadi satu `.or()` tidak bisa: PostgREST menolak klausa
    // yang mencampur kolom tabel induk dengan kolom tabel anak. Jadi alamatnya
    // dicari lebih dulu secara terpisah, lalu id hasilnya disisipkan sebagai
    // salah satu cabang `or` — hasil akhirnya "judul ATAU kode ATAU deskripsi
    // ATAU alamat", bukan irisan keempatnya.
    const keyword = escapePattern(search);
    if (keyword) {
      const orClauses = [
        `title.ilike.%${keyword}%`,
        `listing_code.ilike.%${keyword}%`,
        `description.ilike.%${keyword}%`,
      ];

      const { data: addressMatches, error: addressError } = await supabase
        .from("property_address")
        .select("property_id")
        .or(
          [
            `province_name.ilike.%${keyword}%`,
            `city_name.ilike.%${keyword}%`,
            `district_name.ilike.%${keyword}%`,
            `village_name.ilike.%${keyword}%`,
            `address.ilike.%${keyword}%`,
          ].join(",")
        )
        .limit(ADDRESS_MATCH_LIMIT);

      if (addressError) {
        // Pencarian alamat yang gagal tidak boleh mengosongkan seluruh hasil:
        // pencocokan judul tetap dijalankan seperti sebelumnya.
        console.error("Supabase error (cari alamat):", addressError);
      } else {
        const ids = Array.from(
          new Set(
            (addressMatches ?? [])
              .map((row: { property_id: string | null }) => row.property_id)
              .filter((value): value is string => Boolean(value))
          )
        );
        if (ids.length > 0) {
          orClauses.push(`id.in.(${ids.join(",")})`);
        }
      }

      query = query.or(orClauses.join(","));
    }

    // ===== FILTER DASAR =====
    if (Array.isArray(status)) {
      if (status.length > 0) query = query.in("status", status);
    } else if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (listing_type && listing_type !== "all") {
      query = query.eq("listing_type", normalizeListingType(String(listing_type)));
    }

    if (property_type && property_type !== "all") {
      // .ilike agar tidak peka huruf besar/kecil, setelah nilainya diselaraskan
      // dengan penulisan di basis data.
      query = query.ilike("property_type", normalizePropertyType(property_type));
    }

    if (is_featured) {
      query = query.eq("is_featured", true);
    }

    if (owner_id) {
      // Properti dianggap "milik saya" bila dibuat sendiri atau ditugaskan.
      query = query.or(`created_by.eq.${owner_id},assigned_to.eq.${owner_id}`);
    }

    // ===== HARGA (tabel property_price, alias `price`) =====
    if (priceMin !== null) query = query.gte("price.selling_price", priceMin);
    if (priceMax !== null) query = query.lte("price.selling_price", priceMax);

    // ===== LUAS TANAH (tabel property_land, alias `land`) =====
    if (landAreaMin !== null) query = query.gte("land.land_area", landAreaMin);
    if (landAreaMax !== null) query = query.lte("land.land_area", landAreaMax);

    // ===== LUAS BANGUNAN (tabel property_building, alias `building`) =====
    if (buildingAreaMin !== null) query = query.gte("building.building_area", buildingAreaMin);
    if (buildingAreaMax !== null) query = query.lte("building.building_area", buildingAreaMax);

    // ===== SPESIFIKASI (tabel property_specifications, alias `specifications`) =====
    //
    // Kolomnya tunggal — `bedroom`/`bathroom`, bukan bentuk jamak — dan UI
    // menuliskannya sebagai "3+", jadi pembandingnya minimal, bukan sama dengan.
    if (bedroom !== null) query = query.gte("specifications.bedroom", bedroom);
    if (bathroom !== null) query = query.gte("specifications.bathroom", bathroom);
    if (yearBuilt !== null) query = query.gte("specifications.year_built", yearBuilt);
    if (hasCertificate) query = query.eq("specifications.certificate", certificate);
    if (hasFurnishing) query = query.eq("specifications.furnishing", furnishing);

    // ===== LOKASI (tabel property_address, alias `address`) =====
    // Filter kota/provinsi sekarang langsung ke kolom nama di `property_address`.
    if (provinceName) query = query.ilike("address.province_name", `%${provinceName}%`);
    if (cityName) query = query.ilike("address.city_name", `%${cityName}%`);
    if (districtName) query = query.ilike("address.district_name", `%${districtName}%`);

    // Beberapa kecamatan sekaligus. `referencedTable` wajib: tanpa itu PostgREST
    // menerapkan OR pada tabel `properties`, yang tidak punya kolom
    // district_name, dan seluruh kueri gagal.
    if (districtNames.length > 0) {
      query = query.or(
        districtNames.map((name) => `district_name.ilike.%${name}%`).join(","),
        { referencedTable: "address" }
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error (list):", error);
      throw new Error(error.message);
    }

    return {
      data: (data ?? []) as Property[],
      count: count || 0,
      page,
      totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
    };
  },

  // ============================================================
  // GET BY ID – Detail Properti
  // ============================================================
  async getById(id: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let query = supabase
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
          media:property_media(*),
          assigned_user:users!assigned_to(id, full_name, email, avatar_url)
        `
      );

    if (uuidRegex.test(id)) {
      query = query.eq("id", id);
    } else {
      query = query.eq("listing_code", id);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Supabase error (detail):", error);
      throw new Error(error.message);
    }
    if (!data) {
      throw new Error("Property not found");
    }
    return data as Property;
  },

  // ============================================================
  // DELETE
  // ============================================================
  async delete(id: string) {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },

  // ============================================================
  // UPDATE STATUS
  // ============================================================
  //
  // Lewat route, bukan update langsung dari peramban: perubahan status memicu
  // notifikasi ke agen pemegang dan pembuat listing, dan baris notifikasi untuk
  // akun lain hanya bisa ditulis dengan service role di sisi server.
  //
  // Mengembalikan objek respons utuh, bukan hanya barisnya: server bisa
  // menurunkan permintaan "published" menjadi draf bila listingnya belum punya
  // agen, dan pemanggil perlu tahu itu agar tidak memberi pesan sukses palsu.
  async updateStatus(id: string, status: PropertyStatus) {
    const res = await fetch(`/api/properties/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Gagal mengubah status properti");
    }

    return {
      data: json.data as Property,
      downgraded: Boolean(json.downgraded),
      message: (json.message as string | undefined) ?? null,
    };
  },

  // ============================================================
  // DUPLICATE (LENGKAP DENGAN DATA RELASI TURUNANNYA)
  // ============================================================
  async duplicate(id: string) {
    const original = await this.getById(id);
    if (!original) throw new Error("Property not found");

    const timestamp = Date.now();
    const newListingCode = `${original.listing_code || "PROP"}-COPY-${timestamp}`;

    const { data: newProperty, error: insertError } = await supabase
      .from("properties")
      .insert({
        listing_code: newListingCode,
        title: `Copy of ${original.title}`,
        slug: `${original.slug || "prop"}-copy-${timestamp}`,
        property_type: original.property_type,
        listing_type: original.listing_type,
        property_category: original.property_category || null,
        status: "draft",
        owner_id: original.owner_id || null,
        created_by: original.created_by || null,
        assigned_to: original.assigned_to || null,
        description: original.description || null,
        selling_point: original.selling_point || null,
        rental_period: original.rental_period || null,
      })
      .select()
      .single();

    if (insertError || !newProperty) {
      throw new Error(insertError?.message || "Gagal menduplikasi properti utama.");
    }

    const newPropertyId = newProperty.id;

    if (original.address) {
      const addr = Array.isArray(original.address) ? original.address[0] : original.address;
      if (addr) {
        const { id: _, property_id: __, ...rest } = addr;
        await supabase.from("property_address").insert({
          ...rest,
          property_id: newPropertyId,
        });
      }
    }

    if (original.price) {
      const prc = Array.isArray(original.price) ? original.price[0] : original.price;
      if (prc) {
        const { id: _, property_id: __, ...cleanPrice } = prc;
        await supabase.from("property_price").insert({
          ...cleanPrice,
          property_id: newPropertyId,
        });
      }
    }

    if (original.specifications) {
      const spec = Array.isArray(original.specifications) ? original.specifications[0] : original.specifications;
      if (spec) {
        const { id: _, property_id: __, ...cleanSpec } = spec;
        await supabase.from("property_specifications").insert({
          ...cleanSpec,
          property_id: newPropertyId,
        });
      }
    }

    if (original.land) {
      const lnd = Array.isArray(original.land) ? original.land[0] : original.land;
      if (lnd) {
        const { id: _, property_id: __, ...cleanLand } = lnd;
        await supabase.from("property_land").insert({
          ...cleanLand,
          property_id: newPropertyId,
        });
      }
    }

    if (original.building) {
      const bld = Array.isArray(original.building) ? original.building[0] : original.building;
      if (bld) {
        const { id: _, property_id: __, ...cleanBuilding } = bld;
        await supabase.from("property_building").insert({
          ...cleanBuilding,
          property_id: newPropertyId,
        });
      }
    }

    if (original.media && Array.isArray(original.media) && original.media.length > 0) {
      const mediaListToInsert = original.media.map((m: any) => {
        const { id: _, property_id: __, ...cleanMedia } = m;
        return {
          ...cleanMedia,
          property_id: newPropertyId,
        };
      });
      await supabase.from("property_media").insert(mediaListToInsert);
    }

    return await this.getById(newPropertyId);
  },

  // ============================================================
  // GET MEDIA
  // ============================================================
  async getMedia(propertyId: string) {
    const { data, error } = await supabase
      .from("property_media")
      .select("*")
      .eq("property_id", propertyId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  // ============================================================
  // UPDATE
  // ============================================================
  async update(id: string, data: Partial<Property>) {
    const { error } = await supabase
      .from("properties")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error(error.message);
    return await this.getById(id);
  },

  // ============================================================
  // UPDATE ASSIGNED TO
  // ============================================================
  //
  // Lewat route dengan alasan yang sama seperti updateStatus: agen yang baru
  // ditugaskan harus mendapat notifikasi, dan itu tidak bisa ditulis dari
  // peramban atas nama akun lain.
  async updateAssignedTo(id: string, assignedTo: string | null) {
    const res = await fetch(`/api/properties/${id}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: assignedTo }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Gagal menugaskan agen");
    }

    // `drafted` menandai listing terbit yang ikut dikembalikan ke draf karena
    // penugasannya dilepas — tanpa agen, listing tidak boleh tetap publik.
    return {
      data: json.data as Property,
      drafted: Boolean(json.drafted),
      message: (json.message as string | undefined) ?? null,
    };
  },
};

// ============================================================
// HANYA SATU EKSPOR : EKSPOR DEFAULT
// ============================================================
export default propertyService;