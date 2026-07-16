// types/property.types.ts

export type PropertyStatus = "draft" | "review" | "published" | "sold" | "rented" | "archived";
export type ListingType = "jual" | "sewa";
export type PropertyType = "rumah" | "apartemen" | "tanah" | "villa" | "ruko" | "kantor" | "pabrik" | "gudang" | "hotel" | "ruang_usaha";

// ============================================================
// PROPERTY OWNER
// ============================================================
export interface PropertyOwner {
  id: string;
  owner_code: string;
  full_name: string;
  phone?: string | null;
  whatsapp?: string | null; // ✅ TAMBAHKAN
  email?: string | null;
  identity_type?: string | null; // ✅ TAMBAHKAN
  identity_number?: string | null; // ✅ TAMBAHKAN
  address?: string | null; // ✅ TAMBAHKAN
  notes?: string | null; // ✅ TAMBAHKAN
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// PROPERTY ADDRESS
// ============================================================
export interface PropertyAddress {
  id: string;
  property_id: string;
  country_id?: string | null;
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_id?: string | null;
  postal_code?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  // Relasi (opsional)
  country?: { name: string };
  province?: { name: string };
  city?: { name: string };
  district?: { name: string };
  village?: { name: string };
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// PROPERTY PRICE
// ============================================================
export interface PropertyPrice {
  id: string;
  property_id: string;
  selling_price?: number | null;
  rental_price?: number | null;
  service_charge?: number | null;
  maintenance_fee?: number | null;
  negotiable?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// PROPERTY SPECIFICATIONS
// ============================================================
export interface PropertySpecifications {
  id: string;
  property_id: string;
  bedroom?: number | null;
  bathroom?: number | null;
  garage?: number | null;
  carport?: number | null;
  floor?: number | null;
  electricity?: number | null;
  water_source?: string | null;
  certificate?: string | null;
  facing?: string | null;
  condition?: string | null;
  furnishing?: string | null;
  year_built?: number | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// PROPERTY LAND
// ============================================================
export interface PropertyLand {
  id: string;
  property_id: string;
  land_area?: number | null;
  land_unit?: string | null;
  land_width?: number | null;
  land_length?: number | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// PROPERTY BUILDING
// ============================================================
export interface PropertyBuilding {
  id: string;
  property_id: string;
  building_area?: number | null;
  building_width?: number | null;
  building_length?: number | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// PROPERTY MEDIA
// ============================================================
export interface PropertyMedia {
  id: string;
  property_id: string;
  media_type: string;
  file_name: string;
  original_name?: string;
  storage_path: string;
  public_url: string;
  mime_type?: string;
  file_size?: number;
  is_primary: boolean;
  sort_order?: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// PROPERTY (MAIN)
// ============================================================
export interface Property {
  id: string;
  listing_code: string;
  title: string;
  slug: string;
  property_type: string;
  listing_type: ListingType;
  property_category?: string | null; // ✅ TAMBAHKAN
  status: PropertyStatus;
  description?: string | null;
  selling_point?: string | null; // ✅ TAMBAHKAN
  rental_period?: string | null; // ✅ TAMBAHKAN
  owner_id?: string | null;
  created_by: string;
  published_at?: string | null;
  created_at: string;
  updated_at: string;

  // Relasi
  owner?: PropertyOwner | null;
  address?: PropertyAddress | null;
  price?: PropertyPrice | null;
  specifications?: PropertySpecifications | null;
  land?: PropertyLand | null;
  building?: PropertyBuilding | null;
  media?: PropertyMedia[];
}

// ============================================================
// PROPERTY FILTERS
// ============================================================
export interface PropertyFilter {
  search?: string;
  status?: PropertyStatus | "all";
  listing_type?: ListingType | "all";
  page?: number;
  limit?: number;
  sort_by?: "created_at" | "title" | "listing_code" | "updated_at";
  sort_order?: "asc" | "desc";
}