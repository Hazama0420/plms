// types/property.types.ts

export interface PropertyOwner {
  id: string;
  owner_code: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}

export interface PropertyAddress {
  id: string;
  address: string;
  city: { name: string } | null;
  district: { name: string } | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PropertyPrice {
  id: string;
  selling_price: number | null;
  rental_price: number | null;
  negotiable: boolean;
}

export interface PropertySpecifications {
  id: string;
  bedroom: number | null;
  bathroom: number | null;
  garage: number | null;
  certificate: string | null;
  condition: string | null;
  year_built: number | null;
}

export interface PropertyMedia {
  id: string;
  public_url: string | null;
  is_primary: boolean;
}

export interface Property {
  id: string;
  listing_code: string;
  title: string;
  slug: string;
  property_type: string;
  listing_type: "jual" | "sewa";
  status: "draft" | "review" | "published" | "sold" | "rented" | "archived";
  created_at: string;
  updated_at: string;
  published_at: string | null;
  owner: PropertyOwner | null;
  address: PropertyAddress | null;
  price: PropertyPrice | null;
  specifications: PropertySpecifications | null;
  media: PropertyMedia[];
}

export type PropertyStatus = Property["status"];