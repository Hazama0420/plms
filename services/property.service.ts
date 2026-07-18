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
  // GET LIST – Daftar Properti (dengan Advanced Filter)
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
            city:cities(name),
            district:districts(name)
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

    // ===== SEARCH =====
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,listing_code.ilike.%${search}%`
      );
    }

    // ===== BASIC FILTERS =====
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (listing_type && listing_type !== "all") {
      query = query.eq("listing_type", listing_type);
    }

    // 🔍 PROPERTY TYPE (CHIPS)
    if (property_type && property_type !== "all") {
      query = query.eq("property_type", property_type);
    }

    // ===== ADVANCED FILTERS =====
    if (advanced?.priceMin !== null && advanced?.priceMin !== undefined) {
      query = query.gte("price.selling_price", advanced.priceMin);
    }
    if (advanced?.priceMax !== null && advanced?.priceMax !== undefined) {
      query = query.lte("price.selling_price", advanced.priceMax);
    }

    if (advanced?.landAreaMin !== null && advanced?.landAreaMin !== undefined) {
      query = query.gte("land.land_area", advanced.landAreaMin);
    }
    if (advanced?.landAreaMax !== null && advanced?.landAreaMax !== undefined) {
      query = query.lte("land.land_area", advanced.landAreaMax);
    }

    if (advanced?.buildingAreaMin !== null && advanced?.buildingAreaMin !== undefined) {
      query = query.gte("building.building_area", advanced.buildingAreaMin);
    }
    if (advanced?.buildingAreaMax !== null && advanced?.buildingAreaMax !== undefined) {
      query = query.lte("building.building_area", advanced.buildingAreaMax);
    }

    if (advanced?.bedroom !== null && advanced?.bedroom !== undefined) {
      query = query.gte("specifications.bedroom", advanced.bedroom);
    }

    if (advanced?.bathroom !== null && advanced?.bathroom !== undefined) {
      query = query.gte("specifications.bathroom", advanced.bathroom);
    }

    if (advanced?.city_id) {
      query = query.eq("address.city_id", advanced.city_id);
    }

    if (advanced?.property_type) {
      query = query.eq("property_type", advanced.property_type);
    }

    if (advanced?.year_built !== null && advanced?.year_built !== undefined) {
      query = query.gte("specifications.year_built", advanced.year_built);
    }

    if (advanced?.certificate) {
      query = query.eq("specifications.certificate", advanced.certificate);
    }

    if (advanced?.furnishing) {
      query = query.eq("specifications.furnishing", advanced.furnishing);
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
  // DUPLICATE
  // ============================================================
  async duplicate(id: string) {
    const original = await this.getById(id);
    if (!original) throw new Error("Property not found");

    const { data, error } = await supabase
      .from("properties")
      .insert({
        listing_code: `${original.listing_code}-copy-${Date.now()}`,
        title: `Copy of ${original.title}`,
        slug: `${original.slug}-copy-${Date.now()}`,
        property_type: original.property_type,
        listing_type: original.listing_type,
        property_category: original.property_category || null,
        status: "draft",
        owner_id: original.owner_id,
        created_by: original.created_by,
        description: original.description,
        selling_point: original.selling_point,
        rental_period: original.rental_period,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Property;
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