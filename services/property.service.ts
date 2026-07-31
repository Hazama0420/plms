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
// SERVICE OBJECT (tanpa duplikasi)
// ============================================================
const propertyService = {
  // ============================================================
  // GET LIST – Daftar Properti (Dengan Multi-Filter Presisi & Aman)
  // ============================================================
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
      advanced = {},
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from("properties")
      .select(
        `
          *,
          owner:property_owners(*),
          address:property_address(
            *,
            country:countries(name),
            province:provinces(name),
            city:cities(name),
            district:districts(name),
            village:villages(name)
          ),
          price:property_price(*),
          specifications:property_specifications(*),
          land:property_land(*),
          building:property_building(*),
          media:property_media(*)
        `,
        { count: "exact" }
      )
      .order(sort_by, { ascending: sort_order === "asc" })
      .range(offset, offset + limit - 1);

    // ===== SEARCH (Judul atau Kode Listing) =====
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,listing_code.ilike.%${search}%`
      );
    }

    // ===== BASIC FILTERS =====
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // 1. Filter Tipe Transaksi (jual / sewa)
    if (listing_type && listing_type !== "all") {
      query = query.eq("listing_type", listing_type);
    }

    // 2. 🟢 FIX UTAMA: Filter Kategori/Jenis Properti (Menggunakan .ilike agar Case-Insensitive)
    if (property_type && property_type !== "all") {
      query = query.ilike("property_type", property_type);
    }

    // ===== ADVANCED FILTERS (LANJUTAN) =====
   // Filter Harga Minimum
if (advanced?.priceMin !== null && advanced?.priceMin !== undefined && advanced.priceMin !== ("" as any)) {
  query = query.gte("property_price.selling_price", Number(advanced.priceMin));
}

// Filter Harga Maksimum (Diperbaiki)
if (advanced?.priceMax !== null && advanced?.priceMax !== undefined && advanced.priceMax !== ("" as any)) {
  query = query.lte("property_price.selling_price", Number(advanced.priceMax));
}

    // Filter Luas Tanah Minimum
if (advanced?.landAreaMin !== null && advanced?.landAreaMin !== undefined && advanced.landAreaMin !== ("" as any)) {
  query = query.gte("property_specs.land_area", Number(advanced.landAreaMin));
}

// Filter Luas Tanah Maksimum
if (advanced?.landAreaMax !== null && advanced?.landAreaMax !== undefined && advanced.landAreaMax !== ("" as any)) {
  query = query.lte("property_specs.land_area", Number(advanced.landAreaMax));
}

   // 3. Filter Luas Bangunan (Building Area)
if (advanced?.buildingAreaMin != null && !isNaN(Number(advanced.buildingAreaMin))) {
  query = query.gte("property_specs.building_area", Number(advanced.buildingAreaMin));
}
if (advanced?.buildingAreaMax != null && !isNaN(Number(advanced.buildingAreaMax))) {
  query = query.lte("property_specs.building_area", Number(advanced.buildingAreaMax));
}

// Filter Kamar Tidur & Mandi
if (advanced?.bedroom != null && !isNaN(Number(advanced.bedroom))) {
  query = query.eq("property_specs.bedrooms", Number(advanced.bedroom));
}
if (advanced?.bathroom != null && !isNaN(Number(advanced.bathroom))) {
  query = query.eq("property_specs.bathrooms", Number(advanced.bathroom));
}

    if (advanced?.city_id) {
      query = query.eq("property_address.city_id", advanced.city_id);
    }

    // Filter Lokasi Berdasarkan Nama Provinsi & Kota
if ((advanced as any)?.province_name) {
  query = query.ilike("property_address.province_name", `%${(advanced as any).province_name}%`);
}

if ((advanced as any)?.city_name) {
  query = query.ilike("property_address.city_name", `%${(advanced as any).city_name}%`);
}

   if (advanced?.year_built !== null && advanced?.year_built !== undefined && advanced.year_built !== ("" as any)) {
  query = query.eq("property_specifications.year_built", Number(advanced.year_built));
}

    if (advanced?.certificate && advanced.certificate !== "all") {
      query = query.eq("property_specifications.certificate", advanced.certificate);
    }

    if (advanced?.furnishing && advanced.furnishing !== "all") {
      query = query.eq("property_specifications.furnishing", advanced.furnishing);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error (list):", error);
      throw new Error(error.message);
    }

    return {
      data: data as Property[],
      count: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
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
          address:property_address(
            *,
            country:countries(name),
            province:provinces(name),
            city:cities(name),
            district:districts(name),
            village:villages(name)
          ),
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
  async updateStatus(id: string, status: PropertyStatus) {
    const { data, error } = await supabase
      .from("properties")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Property;
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
        const { id: _, property_id: __, country: ___, province: ____, city: _____, district: ______, village: _______, ...cleanAddr } = addr;
        await supabase.from("property_address").insert({
          ...cleanAddr,
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
  async updateAssignedTo(id: string, assignedTo: string | null) {
    const { data, error } = await supabase
      .from("properties")
      .update({
        assigned_to: assignedTo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Property;
  },
};

// ============================================================
// HANYA SATU EKSPOR : EKSPOR DEFAULT
// ============================================================
export default propertyService;