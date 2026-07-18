// types/property.types.ts

// ============================================================
// ENUMS / UNION TYPES
// ============================================================

export type PropertyStatus = "draft" | "review" | "published" | "sold" | "rented" | "archived";
export type ListingType = "jual" | "sewa";
export type PropertyType =
  | "rumah"
  | "apartemen"
  | "tanah"
  | "villa"
  | "ruko"
  | "kantor"
  | "pabrik"
  | "gudang"
  | "hotel"
  | "ruang_usaha";

// ============================================================
// PROPERTY OWNER
// ============================================================

export interface PropertyOwner {
  id: string;
  owner_code: string;
  full_name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  identity_type?: string | null;
  identity_number?: string | null;
  address?: string | null;
  notes?: string | null;
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
  property_category?: string | null;
  status: PropertyStatus;
  description?: string | null;
  selling_point?: string | null;
  rental_period?: string | null;
  owner_id?: string | null;
  created_by: string;
  published_at?: string | null;
  created_at: string;
  updated_at: string;

  // ===== AGENT ASSIGN =====
  assigned_to?: string | null;
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;

  // ===== RELASI =====
  owner?: PropertyOwner | null;
  address?: PropertyAddress | null;
  price?: PropertyPrice | null;
  specifications?: PropertySpecifications | null;
  land?: PropertyLand | null;
  building?: PropertyBuilding | null;
  media?: PropertyMedia[];
}

// ============================================================
// ADVANCED FILTER
// ============================================================

export interface AdvancedFilter {
  // Harga
  priceMin?: number | null;
  priceMax?: number | null;

  // Spesifikasi
  bedroom?: number | null;
  bathroom?: number | null;

  // Ukuran
  landAreaMin?: number | null;
  landAreaMax?: number | null;
  buildingAreaMin?: number | null;
  buildingAreaMax?: number | null;

  // Lokasi & Tipe
  city_id?: string | null;
  property_type?: string | null;

  // Lainnya
  year_built?: number | null;
  certificate?: string | null;
  furnishing?: string | null;
}

// ============================================================
// PROPERTY FILTERS (untuk query list)
// ============================================================

export interface PropertyFilter {
  search?: string;
  status?: PropertyStatus | "all";
  listing_type?: ListingType | "all";
  property_type?: string;
  page?: number;
  limit?: number;
  sort_by?: "created_at" | "title" | "listing_code" | "updated_at";
  sort_order?: "asc" | "desc";
  advanced?: AdvancedFilter;
}