// config/property-fields.ts

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'hidden' | 'checkbox' | 'email'; // ✅ ditambahkan checkbox & email
  required?: boolean;
  options?: string[];
  default?: any;
  readonly?: boolean;
  hidden?: boolean;
  isAreaId?: boolean;
}

export const BASE_FIELDS: FieldConfig[] = [
  // Basic
  { name: 'title', label: 'Judul Iklan', type: 'text', required: true },
  { name: 'listing_code', label: 'Kode Listing', type: 'text' },
  { name: 'property_type', label: 'Tipe Properti', type: 'text', readonly: true, default: 'rumah' },
  { name: 'property_category', label: 'Jenis Properti', type: 'select', options: ['second', 'aset_bank', 'baru'], required: true },
  { name: 'listing_type', label: 'Kategori', type: 'select', options: ['jual', 'sewa'], required: true },
  { name: 'status', label: 'Status', type: 'select', options: ['draft', 'review', 'published'] },
  { name: 'description', label: 'Deskripsi Iklan', type: 'textarea' },
  { name: 'selling_point', label: 'Selling Point', type: 'text' },
  
  // Harga
  { name: 'selling_price', label: 'Harga', type: 'number', required: true },
  { name: 'rental_price', label: 'Harga Sewa', type: 'number' },
  { name: 'rental_period', label: 'Periode Sewa', type: 'select', options: ['per_hari', 'per_minggu', 'per_bulan', 'per_tahun'] },
  { name: 'service_charge', label: 'Service Charge', type: 'number' },
  { name: 'maintenance_fee', label: 'IPL / Maintenance Fee', type: 'number' },
  { name: 'negotiable', label: 'Harga Bisa Nego', type: 'checkbox' }, // ✅ sekarang valid
  
  // Lokasi
  { name: 'country_id', label: 'Negara', type: 'select' },
  { name: 'province_id', label: 'Provinsi', type: 'select' },
  { name: 'city_id', label: 'Kota / Kabupaten', type: 'select' },
  { name: 'district_id', label: 'Kecamatan', type: 'select' },
  { name: 'village_id', label: 'Kelurahan / Desa', type: 'select' },
  { name: 'address', label: 'Alamat Lengkap', type: 'textarea', required: true },
  { name: 'postal_code', label: 'Kode Pos', type: 'text' },
  { name: 'latitude', label: 'Latitude', type: 'text' },
  { name: 'longitude', label: 'Longitude', type: 'text' },
  
  // Spesifikasi
  { name: 'bedroom', label: 'Kamar Tidur', type: 'number' },
  { name: 'bathroom', label: 'Kamar Mandi', type: 'number' },
  { name: 'garage', label: 'Garasi', type: 'number' },
  { name: 'carport', label: 'Carport', type: 'number' },
  { name: 'floor', label: 'Jumlah Lantai', type: 'number' },
  { name: 'electricity', label: 'Daya Listrik (VA)', type: 'number' },
  { name: 'water_source', label: 'Sumber Air', type: 'select', options: ['pdam', 'sumur', 'pdam_sumur', 'air_pegunungan'] },
  { name: 'certificate', label: 'Sertifikat', type: 'select', options: ['SHM', 'HGB', 'SHGB', 'Strata'] },
  { name: 'facing', label: 'Hadap', type: 'select', options: ['utara', 'selatan', 'timur', 'barat', 'timur_laut', 'barat_laut', 'tenggara', 'barat_daya'] },
  { name: 'condition', label: 'Kondisi Properti', type: 'select', options: ['Baru', 'Bagus', 'Sudah Renovasi', 'Butuh Minim Renovasi', 'Butuh Renovasi Total'] },
  { name: 'furnishing', label: 'Kondisi Perabotan', type: 'select', options: ['Unfurnished', 'Semi Furnished', 'Furnished'] },
  { name: 'year_built', label: 'Tahun Bangun', type: 'number' },
  
  // Tanah & Bangunan
  { name: 'land_area', label: 'Luas Tanah', type: 'number' },
  { name: 'land_unit', label: 'Satuan Tanah', type: 'select', options: ['m²', 'are', 'ha'] },
  { name: 'land_width', label: 'Lebar Tanah', type: 'number' },
  { name: 'land_length', label: 'Panjang Tanah', type: 'number' },
  { name: 'building_area', label: 'Luas Bangunan', type: 'number' },
  { name: 'building_width', label: 'Lebar Bangunan', type: 'number' },
  { name: 'building_length', label: 'Panjang Bangunan', type: 'number' },
  { name: 'price_per_unit', label: 'Satuan Harga', type: 'select', options: ['total', '/m2', '/are', '/hektar'] },
  
  // Owner
  { name: 'owner_name', label: 'Nama Pemilik', type: 'text' },
  { name: 'owner_phone', label: 'Nomor Telepon', type: 'text' },
  { name: 'owner_whatsapp', label: 'Nomor WhatsApp', type: 'text' },
  { name: 'owner_email', label: 'Email', type: 'email' }, // ✅ sekarang valid
  { name: 'owner_identity_type', label: 'Jenis Identitas', type: 'select', options: ['KTP', 'SIM', 'PASPOR'] },
  { name: 'owner_identity_number', label: 'Nomor Identitas', type: 'text' },
  { name: 'owner_address', label: 'Alamat Pemilik', type: 'textarea' },
  { name: 'owner_notes', label: 'Catatan Pemilik', type: 'textarea' },
];

// ===== KONFIGURASI PER TIPE PROPERTY (SHEET) =====
export const SHEET_CONFIG: Record<string, { hiddenFields: string[]; extraFields: FieldConfig[] }> = {
  rumah: {
    hiddenFields: [],
    extraFields: [],
  },
  tanah: {
    hiddenFields: [],
    extraFields: [
      { name: 'land_unit', label: 'Satuan Tanah', type: 'select', options: ['m²', 'are', 'hektar'] },
      { name: 'price_per_unit', label: 'Satuan Harga', type: 'select', options: ['total', '/m2', '/are', '/hektar'] },
    ],
  },
  hotel: {
    hiddenFields: ['carport'],
    extraFields: [],
  },
  pabrik: {
    hiddenFields: ['bedroom', 'carport'],
    extraFields: [],
  },
  gudang: {
    hiddenFields: ['bedroom', 'carport'],
    extraFields: [],
  },
  perkantoran: {
    hiddenFields: ['bedroom', 'carport'],
    extraFields: [],
  },
  ruang_usaha: {
    hiddenFields: ['bedroom', 'carport'],
    extraFields: [],
  },
  apartemen: {
    hiddenFields: ['carport'],
    extraFields: [],
  },
  villa: {
    hiddenFields: [],
    extraFields: [],
  },
  ruko: {
    hiddenFields: ['carport'],
    extraFields: [],
  },
  kantor: {
    hiddenFields: ['bedroom', 'carport'],
    extraFields: [],
  },
};

// ===== FUNGSI UNTUK MENDAPATKAN FIELD BERDASARKAN TIPE =====
export function getFieldsForType(propertyType: string): FieldConfig[] {
  const config = SHEET_CONFIG[propertyType] || SHEET_CONFIG.rumah;
  const hiddenFields = config.hiddenFields || [];
  
  // Filter field yang tidak di-hidden
  let fields = BASE_FIELDS.filter(f => !hiddenFields.includes(f.name));
  
  // Tambahkan extra fields
  if (config.extraFields) {
    fields = [...fields, ...config.extraFields];
  }
  
  return fields;
}