// services/property.service.ts

import { supabase } from "@/lib/supabase/client";
import type { Property, PropertyStatus } from "@/types/property.types";

export interface PropertyFilter {
  search?: string;
  status?: PropertyStatus | "all";
  listing_type?: "jual" | "sewa" | "all";
  page?: number;
  limit?: number;
  sort_by?: "created_at" | "title" | "listing_code" | "updated_at";
  sort_order?: "asc" | "desc";
}

export const propertyService = {
  // ===== GET LIST =====
  async getList(filters: PropertyFilter = {}) {
    const {
      search = "",
      status = "all",
      listing_type = "all",
      page = 1,
      limit = 10,
      sort_by = "created_at",
      sort_order = "desc",
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
          media:property_media(*)
        `,
        { count: "exact" }
      )
      .order(sort_by, { ascending: sort_order === "asc" })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,listing_code.ilike.%${search}%`
      );
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (listing_type !== "all") {
      query = query.eq("listing_type", listing_type);
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

  // ===== GET BY ID (menggunakan maybeSingle) =====
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
          media:property_media(*)
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

  // ===== DELETE =====
  async delete(id: string) {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },

  // ===== UPDATE STATUS =====
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

  // ===== DUPLICATE =====
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
        status: "draft",
        owner_id: original.owner_id,
        created_by: original.created_by,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Property;
  },
};