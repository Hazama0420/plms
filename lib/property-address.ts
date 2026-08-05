// lib/property-address.ts
//
// Satu sumber kebenaran untuk membentuk baris `property_address`.
//
// Sebelumnya tiga tempat menyusun payload alamat dengan cara berbeda-beda
// (StepReview, POST /api/properties, PUT /api/properties/[id]) dan ketiganya
// memakai kolom id uuid yang mengacu ke tabel provinces/cities/districts yang
// sudah tidak dipakai. Wilayah sekarang berasal dari tabel `regions` yang datar
// dan berbasis nama, jadi pembentukan payloadnya dikumpulkan di sini.

/** Bentuk wilayah hasil pemilihan dari tabel `regions`. */
export interface RegionSelection {
  region_id?: number | string | null;
  province_name?: string | null;
  city_name?: string | null;
  district_name?: string | null;
  village_name?: string | null;
}

export const NO_REGION_MESSAGE =
  "Pilih wilayah properti dari kotak pencarian terlebih dahulu.";

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";
  return trimmed;
}

/**
 * `region_id` di basis data bertipe integer. Nilai kosong, "null", atau bukan
 * angka dikembalikan sebagai null agar tidak memicu 22P02 seperti sebelumnya.
 */
export function toRegionId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

function toDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
}

/**
 * Wilayah dari pencarian `regions` adalah bagian yang wajib; nama jalan
 * opsional. Cukup salah satu dari kota atau kecamatan terisi — sebagian entri
 * `regions` hanya punya tingkat kota.
 */
export function hasRegion(source: RegionSelection | null | undefined): boolean {
  if (!source) return false;
  return Boolean(
    clean(source.city_name) ||
      clean(source.district_name) ||
      clean(source.province_name)
  );
}

/**
 * Merangkai alamat yang terbaca manusia: "Jl. X No. 1, Kecamatan, Kota, Provinsi".
 *
 * Bagian yang sama persis dibuang, sehingga entri `regions` yang nama areanya
 * sama dengan nama kotanya tidak menghasilkan "Cikarang, Cikarang".
 */
export function composeFullAddress(
  street: string | null | undefined,
  source: RegionSelection | null | undefined
): string {
  const parts = [
    clean(street),
    clean(source?.village_name),
    clean(source?.district_name),
    clean(source?.city_name),
    clean(source?.province_name),
  ].filter(Boolean);

  const unique: string[] = [];
  for (const part of parts) {
    const isDuplicate = unique.some(
      (existing) => existing.toLowerCase() === part.toLowerCase()
    );
    if (!isDuplicate) unique.push(part);
  }

  return unique.join(", ");
}

/**
 * Membentuk payload untuk upsert ke `property_address`.
 *
 * Kolom `country_id`/`province_id`/`city_id`/`district_id`/`village_id` sengaja
 * TIDAK disertakan: FK-nya mengacu ke tabel yang sudah ditinggalkan, dan mengisi
 * kolom uuid itu dengan `area_id` bertipe bigint adalah penyebab alamat gagal
 * tersimpan selama ini.
 *
 * `address` menyimpan nama jalan saja (boleh kosong). Nama wilayah tersimpan di
 * kolomnya masing-masing agar bisa dibaca dan disaring tanpa join.
 */
export function buildAddressPayload(source: Record<string, any>) {
  const street = clean(
    typeof source.address === "string" ? source.address : source.address?.address
  );

  return {
    region_id: toRegionId(source.region_id),
    province_name: clean(source.province_name) || null,
    city_name: clean(source.city_name) || null,
    district_name: clean(source.district_name) || null,
    village_name: clean(source.village_name) || null,
    address: street,
    postal_code: clean(source.postal_code) || null,
    latitude: toDecimal(source.latitude),
    longitude: toDecimal(source.longitude),
  };
}

/**
 * Membaca alamat dari hasil query. PostgREST bisa mengembalikan relasi sebagai
 * objek maupun larik, jadi keduanya diterima.
 */
export function readAddress(raw: any): Record<string, any> | null {
  if (!raw) return null;
  const addr = Array.isArray(raw) ? raw[0] : raw;
  return addr && typeof addr === "object" ? addr : null;
}

/**
 * Teks lokasi ringkas untuk kartu katalog: "Kecamatan, Kota".
 * Dipakai halaman properti, dashboard, dan kartu properti unggulan agar
 * ketiganya menampilkan hal yang sama.
 */
export function formatLocationShort(raw: any): string {
  const addr = readAddress(raw);
  if (!addr) return "";

  const parts = [
    clean(addr.district_name),
    clean(addr.city_name) || clean(addr.province_name),
  ].filter(Boolean);

  const unique = parts.filter(
    (part, index) => parts.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === index
  );

  if (unique.length > 0) return unique.join(", ");
  return clean(addr.address);
}
