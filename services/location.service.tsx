// services/location.service.ts

import { supabase } from "@/lib/supabase/client";

export interface Country {
  id: string;
  name: string;
  iso2: string;
  iso3: string;
}

export interface Province {
  id: string;
  name: string;
  country_id: string;
}

export interface City {
  id: string;
  name: string;
  province_id: string;
  city_type?: string;
  postal_code?: string;
}

export interface District {
  id: string;
  name: string;
  city_id: string;
}

export interface Village {
  id: string;
  name: string;
  district_id: string;
  postal_code?: string;
}

export const locationService = {
  // ===== COUNTRIES =====
  async getCountries(activeOnly: boolean = true) {
    let query = supabase
      .from("countries")
      .select("id, name, iso2, iso3")
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as Country[];
  },

  async getCountryById(id: string) {
    const { data, error } = await supabase
      .from("countries")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return data as Country;
  },

  // ===== PROVINCES =====
  async getProvinces(countryId: string, activeOnly: boolean = true) {
    let query = supabase
      .from("provinces")
      .select("id, name, country_id")
      .eq("country_id", countryId)
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as Province[];
  },

  // ===== CITIES =====
  async getCities(provinceId: string, activeOnly: boolean = true) {
    let query = supabase
      .from("cities")
      .select("id, name, province_id, city_type, postal_code")
      .eq("province_id", provinceId)
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as City[];
  },

  // ===== DISTRICTS =====
  async getDistricts(cityId: string, activeOnly: boolean = true) {
    let query = supabase
      .from("districts")
      .select("id, name, city_id")
      .eq("city_id", cityId)
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as District[];
  },

  // ===== VILLAGES =====
  async getVillages(districtId: string, activeOnly: boolean = true) {
    let query = supabase
      .from("villages")
      .select("id, name, district_id, postal_code")
      .eq("district_id", districtId)
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as Village[];
  },
};