// app/(dashboard)/properties/[id]/layout.tsx
//
// Metadata dan structured data untuk satu listing properti.
//
// KENAPA LAYOUT, BUKAN PAGE
// =========================
// page.tsx di folder ini adalah client component sepanjang 850+ baris yang
// menyentuh sesi, role, favorit, lightbox, dan lead capture. Dokumen Next.js 16
// yang terpasang di repo ini menyatakan tegas bahwa `metadata` dan
// `generateMetadata` HANYA didukung di Server Component
// (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md),
// jadi halaman itu tidak akan pernah bisa mengekspornya.
//
// Dokumen yang sama menyebut metadata boleh diletakkan di `layout.js` maupun
// `page.js`, dan layout menerima `params` yang sama dengan page. Maka berkas
// ini: server component yang meneruskan `children` apa adanya, tapi memasok
// seluruh metadata dari sisi server. Halaman clientnya tidak disentuh sama
// sekali — tidak ada risiko regresi pada perilaku yang sudah berjalan.
import { cache } from "react";
import type { Metadata } from "next";

import { createPublicClient } from "@/lib/supabase/public";
import { SITE, OG_BASE } from "@/lib/site-config";
import { formatLocationShort, readAddress } from "@/lib/property-address";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AddressRow {
  address?: string | null;
  city_name?: string | null;
  province_name?: string | null;
  district_name?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface PriceRow {
  selling_price?: number | null;
  rental_price?: number | null;
}

interface SpecRow {
  bedroom?: number | null;
  bathroom?: number | null;
}

interface LandRow {
  land_area?: number | null;
}

interface BuildingRow {
  building_area?: number | null;
}

interface MediaRow {
  public_url?: string | null;
  is_primary?: boolean | null;
}

interface PropertyRow {
  id: string;
  title: string | null;
  description: string | null;
  property_type: string | null;
  listing_type: string | null;
  address: AddressRow | AddressRow[] | null;
  price: PriceRow | PriceRow[] | null;
  specifications: SpecRow | SpecRow[] | null;
  land: LandRow | LandRow[] | null;
  building: BuildingRow | BuildingRow[] | null;
  media: MediaRow[] | null;
}

/**
 * PostgREST mengembalikan relasi satu-ke-satu kadang sebagai objek, kadang
 * sebagai larik berisi satu elemen. Seluruh basis kode ini sudah menjaga diri
 * dengan pola yang sama (lihat property.service.ts pada duplicate()).
 */
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * Dibungkus cache() agar kueri berjalan sekali saja per permintaan.
 *
 * generateMetadata dan badan layout keduanya membutuhkan baris yang sama, dan
 * tanpa ini Supabase dipanggil dua kali untuk data yang identik. Dokumen Next
 * menganjurkan persis cara ini ketika datanya tidak diambil lewat `fetch`
 * (yang punya memoisasi sendiri).
 */
const getPublishedProperty = cache(
  async (idOrCode: string): Promise<PropertyRow | null> => {
    try {
      const supabase = createPublicClient();

      // Kolom disebut satu per satu, bukan `*`: metadata hanya perlu sebagian
      // kecil, dan baris properti membawa banyak kolom internal yang tidak ada
      // urusannya dengan hasil pencarian.
      //
      // land_area ada di property_land, building_area di property_building —
      // bukan di property_specifications. Ini mencocokkan struktur yang dipakai
      // filter getAll() di propertyService (services/property.service.ts:294-299).
      let query = supabase
        .from("properties")
        .select(
          `
            id, title, description, property_type, listing_type,
            address:property_address(address, city_name, province_name, district_name, postal_code, latitude, longitude),
            price:property_price(selling_price, rental_price),
            specifications:property_specifications(bedroom, bathroom),
            land:property_land(land_area),
            building:property_building(building_area),
            media:property_media(public_url, is_primary)
          `
        )
        // Penjagaan terpenting di berkas ini. Listing draf, dalam tinjauan,
        // atau terarsip tidak boleh membocorkan judul maupun fotonya lewat
        // metadata — pratinjau berbagi akan menampilkannya bahkan kepada orang
        // yang tidak punya hak membuka halamannya.
        .eq("status", "published");

      // Rute ini menerima UUID maupun listing_code, mengikuti propertyService.
      query = UUID_PATTERN.test(idOrCode)
        ? query.eq("id", idOrCode)
        : query.eq("listing_code", idOrCode);

      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(error.message);

      return (data as PropertyRow | null) ?? null;
    } catch (err) {
      // Metadata yang gagal tidak boleh menjatuhkan halamannya. Pengunjung
      // tetap mendapat listing yang utuh; yang hilang hanya judul spesifik.
      console.error("[properties/[id]] Gagal memuat metadata:", err);
      return null;
    }
  }
);

/** Rupiah utuh tanpa desimal: "Rp 1.250.000.000". */
function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

/** "rumah" -> "Rumah", "ruang_usaha" -> "Ruang Usaha". */
function labelJenis(raw: string | null): string {
  if (!raw) return "Properti";
  return raw
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function hargaProperti(
  price: PriceRow | null,
  listingType: string | null
): number | null {
  if (!price) return null;
  const value =
    listingType === "sewa"
      ? price.rental_price ?? price.selling_price
      : price.selling_price ?? price.rental_price;
  return typeof value === "number" && value > 0 ? value : null;
}

/**
 * Foto utama listing.
 *
 * Tabel `properties` tidak punya kolom gambar sama sekali — semuanya ada di
 * property_media. Embed di atas tidak memakai klausa urutan, jadi media[0]
 * tidak bisa dipercaya; flag is_primary yang menentukan, persis seperti yang
 * dilakukan halaman daftar dan halaman detail.
 */
function fotoUtama(media: MediaRow[] | null): string | null {
  const list = media || [];
  const primary = list.find((m) => m.is_primary) || list[0];
  return primary?.public_url || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const property = await getPublishedProperty(id);

  // Tidak ditemukan, belum terbit, atau kueri gagal. Judulnya sengaja netral:
  // menyebut nama listing yang belum terbit di sini sama saja menerbitkannya.
  if (!property) {
    const judulNetral = "Properti Tidak Ditemukan";
    const pesan =
      "Listing yang Anda cari tidak tersedia atau sudah tidak dipublikasikan.";

    return {
      title: judulNetral,
      description: pesan,
      robots: { index: false, follow: false },
      // Keduanya WAJIB ditulis ulang, bukan dibiarkan kosong. Penggabungan
      // metadata bersifat dangkal ke atas: tanpa baris ini halaman ini mewarisi
      // milik app/(dashboard)/properties/layout.tsx, sehingga listing draf yang
      // dibagikan muncul sebagai kartu "Jelajahi Properti" dan canonical-nya
      // mengarahkan seluruh sinyal ke /properties.
      alternates: { canonical: null },
      openGraph: {
        ...OG_BASE,
        type: "website",
        title: judulNetral,
        description: pesan,
      },
      twitter: {
        card: "summary",
        title: judulNetral,
        description: pesan,
      },
    };
  }

  const address = readAddress(property.address);
  const price = firstOf(property.price);
  const specs = firstOf(property.specifications);
  const land = firstOf(property.land);
  const building = firstOf(property.building);

  const lokasi = formatLocationShort(property.address);
  const jenis = labelJenis(property.property_type);
  const transaksi = property.listing_type === "sewa" ? "disewakan" : "dijual";
  const nominal = hargaProperti(price, property.listing_type);

  const judul = property.title?.trim() || `${jenis} ${transaksi}`;
  const title = lokasi ? `${judul} — ${lokasi}` : judul;

  // Deskripsi asli listing selalu lebih baik daripada kalimat rakitan, tapi
  // banyak listing dibuat tanpa deskripsi. Potongan 155 karakter mengikuti
  // panjang yang lazim ditampilkan mesin pencari sebelum dipotong.
  const deskripsiAsli = property.description?.trim().replace(/\s+/g, " ");
  const description = deskripsiAsli
    ? deskripsiAsli.length > 155
      ? `${deskripsiAsli.slice(0, 152)}...`
      : deskripsiAsli
    : [
        `${jenis} ${transaksi}${lokasi ? ` di ${lokasi}` : ""}.`,
        nominal ? formatRupiah(nominal) + "." : null,
        specs?.bedroom ? `${specs.bedroom} kamar tidur` : null,
        specs?.bathroom ? `${specs.bathroom} kamar mandi` : null,
        land?.land_area ? `luas tanah ${land.land_area} m²` : null,
        building?.building_area
          ? `luas bangunan ${building.building_area} m²`
          : null,
      ]
        .filter(Boolean)
        .join(" ");

  const gambar = fotoUtama(property.media) || `${SITE.url}/logo-inland.png`;

  // Canonical selalu memakai UUID walaupun pengunjung datang lewat
  // listing_code, supaya kedua bentuk URL tidak dihitung sebagai dua halaman
  // berbeda dengan isi yang sama.
  const canonical = `${SITE.url}/properties/${property.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      // Disebar, bukan diandalkan warisannya: begitu berkas ini menulis
      // `openGraph`, objek milik app/layout.tsx dibuang seluruhnya.
      ...OG_BASE,
      type: "article",
      title,
      description,
      url: canonical,
      images: [{ url: gambar, width: 1200, height: 630, alt: judul }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [gambar],
    },
    other: address?.city_name ? { "geo.placename": address.city_name } : {},
  };
}

/**
 * JSON-LD RealEstateListing.
 *
 * Field bernilai kosong dibuang sebelum diserialisasi: schema.org menganggap
 * properti yang ada tapi kosong sebagai cacat, dan Rich Results Test
 * menandainya sebagai peringatan.
 */
function buildJsonLd(property: PropertyRow): string | null {
  const address = readAddress(property.address);
  const price = firstOf(property.price);
  const specs = firstOf(property.specifications);
  const land = firstOf(property.land);
  const building = firstOf(property.building);

  const nominal = hargaProperti(price, property.listing_type);
  const gambar = fotoUtama(property.media);

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title || labelJenis(property.property_type),
    url: `${SITE.url}/properties/${property.id}`,
  };

  if (property.description) node.description = property.description;
  if (gambar) node.image = gambar;

  if (address) {
    const postal: Record<string, unknown> = {
      "@type": "PostalAddress",
      addressCountry: "ID",
    };
    if (address.address) postal.streetAddress = address.address;
    if (address.city_name) postal.addressLocality = address.city_name;
    if (address.province_name) postal.addressRegion = address.province_name;
    if (address.postal_code) postal.postalCode = address.postal_code;
    node.address = postal;

    if (address.latitude && address.longitude) {
      node.geo = {
        "@type": "GeoCoordinates",
        latitude: address.latitude,
        longitude: address.longitude,
      };
    }
  }

  if (nominal) {
    node.offers = {
      "@type": "Offer",
      price: nominal,
      priceCurrency: "IDR",
      availability: "https://schema.org/InStock",
    };
  }

  if (specs?.bedroom) node.numberOfBedrooms = specs.bedroom;
  if (specs?.bathroom) node.numberOfBathroomsTotal = specs.bathroom;

  // land_area dan building_area ada di tabel terpisah, bukan di specifications.
  const luas = building?.building_area || land?.land_area;
  if (luas) {
    node.floorSize = {
      "@type": "QuantitativeValue",
      value: luas,
      unitCode: "MTK", // meter persegi menurut kode satuan UN/CEFACT
    };
  }

  return JSON.stringify(node);
}

export default async function PropertyDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Sudah di-cache bersama generateMetadata: tidak ada kueri kedua.
  const property = await getPublishedProperty(id);
  const jsonLd = property ? buildJsonLd(property) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      {children}
    </>
  );
}
