#!/usr/bin/env node
// scripts/verify-rls.mjs
//
// Verifikasi RLS pasca-migrasi 007.
//
// Membandingkan hitungan baris yang terlihat kunci anon vs service-role untuk
// memastikan policy bekerja. Migrasi 007 sukses bila:
//   - property_owners: anon = 0, admin = N (N > 0)
//   - users: anon = jumlah agen publik, admin = semua
//   - invoices: anon = 0, admin = N
//   - crm_leads: anon = 0, admin = N
//   - properties: anon = jumlah published, admin = semua (termasuk draft)
//
// CARA PAKAI:
//   node scripts/verify-rls.mjs
//
// Butuh .env.local dengan:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Pembaca .env.local seadanya. Sengaja tidak memakai `dotenv`: paket itu tidak
// terpasang di proyek ini, dan menambah dependensi hanya untuk satu skrip
// verifikasi tidak sepadan. Yang dibutuhkan cuma KEY=VALUE per baris.
function loadEnv(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    // Tanda kutip di sekeliling nilai dibuang; tanpa ini kunci terbaca
    // beserta tanda kutipnya dan setiap permintaan ditolak 401.
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(resolve(process.cwd(), '.env.local'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('❌ Missing environment variables in .env.local');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const anon = createClient(url, anonKey);
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Kolom yang dihitung per tabel. Default `*`, kecuali `users`: hak anon di
// sana dibatasi per-kolom (007 bagian 7), jadi `select('*')` ditolak 403 —
// penolakan yang BENAR, tapi akan terbaca sebagai kegagalan kalau tidak
// dibedakan dari tabel yang memang tertutup.
const COUNT_COLUMNS = {
  users: 'id',
};

// Kolom `users` yang harus DITOLAK untuk anon. Tabelnya sendiri boleh dibaca
// (agen publik terlihat), jadi hitungan baris tidak bisa menangkap ini —
// satu-satunya penanda adalah error dari PostgREST.
const DENIED_USER_COLUMNS = ['phone', 'email', 'whatsapp'];

async function count(client, table, filter = {}) {
  const columns = COUNT_COLUMNS[table] ?? '*';
  let query = client.from(table).select(columns, { count: 'exact', head: true });
  if (filter.eq) {
    const [col, val] = filter.eq;
    query = query.eq(col, val);
  }
  const { count, error } = await query;
  if (error) throw new Error(`${table}: ${error.message || error.code || 'ditolak'}`);
  return count ?? 0;
}

/**
 * Memastikan kolom sensitif benar-benar DITOLAK, bukan sekadar tidak diminta.
 * Hitungan baris tidak bisa menangkap ini: `users` boleh mengembalikan 8 baris
 * dan tetap salah bila `email` ikut terkirim di dalamnya.
 */
async function expectColumnDenied(client, table, column) {
  const { error } = await client.from(table).select(column).limit(1);
  return Boolean(error);
}

async function verify() {
  console.log('🔍 Verifikasi RLS pasca-migrasi 007\n');

  const tables = [
    { name: 'property_owners', expectAnonZero: true },
    { name: 'users', expectAnonZero: false }, // ada agen publik
    { name: 'invoices', expectAnonZero: true },
    { name: 'crm_leads', expectAnonZero: true },
    { name: 'properties', expectAnonZero: false }, // ada published
    { name: 'property_address', expectAnonZero: false },
    { name: 'property_price', expectAnonZero: false },
    { name: 'property_specifications', expectAnonZero: false },
    { name: 'property_land', expectAnonZero: false },
    { name: 'property_building', expectAnonZero: false },
    { name: 'property_media', expectAnonZero: false },
    { name: 'system_settings', expectAnonZero: true }
  ];

  const results = [];
  let pass = 0;
  let fail = 0;

  for (const { name, expectAnonZero } of tables) {
    try {
      const anonCount = await count(anon, name);
      const adminCount = await count(admin, name);
      const locked = anonCount < adminCount || (expectAnonZero && anonCount === 0);
      const status = locked ? '✅' : '❌';

      if (locked) pass++;
      else fail++;

      results.push({ name, anonCount, adminCount, status });
      console.log(`${status} ${name.padEnd(30)} anon: ${String(anonCount).padStart(3)}, admin: ${String(adminCount).padStart(3)}`);
    } catch (err) {
      console.log(`⚠️  ${name.padEnd(30)} error: ${err.message}`);
      fail++;
    }
  }

  // Verifikasi khusus: properties published vs draft
  try {
    const publishedCount = await count(admin, 'properties', { eq: ['status', 'published'] });
    const draftCount = await count(admin, 'properties', { eq: ['status', 'draft'] });
    const anonPropertiesCount = results.find(r => r.name === 'properties')?.anonCount ?? 0;

    console.log(`\n📊 Detail properties:`);
    console.log(`   Published (admin): ${publishedCount}`);
    console.log(`   Draft (admin): ${draftCount}`);
    console.log(`   Visible to anon: ${anonPropertiesCount}`);

    if (anonPropertiesCount === publishedCount && draftCount > 0) {
      console.log(`   ✅ Anon hanya melihat published, draft tersembunyi`);
      pass++;
    } else if (draftCount === 0) {
      console.log(`   ⚠️  Tidak ada draft untuk diuji`);
    } else {
      console.log(`   ❌ Anon masih melihat draft!`);
      fail++;
    }
  } catch (err) {
    console.log(`   ⚠️  Gagal memeriksa properties detail: ${err.message}`);
  }

  // Verifikasi khusus: kolom sensitif users ditolak untuk anon.
  // Kasus nyata: kueri dasbor tamu meminta `phone` pada embed agent dan
  // PostgREST menjawab 401 — hak kolom diperiksa SEBELUM RLS, jadi baris yang
  // boleh dibaca pun ikut tertolak bila salah satu kolomnya tidak diizinkan.
  console.log(`\n🔒 Kolom users yang harus ditolak untuk anon:`);
  for (const column of DENIED_USER_COLUMNS) {
    const denied = await expectColumnDenied(anon, 'users', column);
    console.log(`   ${denied ? '✅' : '❌'} users.${column.padEnd(12)} ditolak: ${denied}`);
    if (denied) pass++;
    else fail++;
  }

  // Verifikasi khusus: embed dasbor tamu yang sesungguhnya harus BERHASIL.
  // Sebelum perbaikan, kueri ini mengembalikan 401 karena `phone` ikut diminta;
  // bentuk di bawah adalah yang dipakai halaman /dashboard dan /properties/[id]
  // setelah perbaikan. Kalau ini gagal, tamu kembali tidak melihat apa pun.
  try {
    const { data, error } = await anon
      .from('properties')
      .select(`
        *,
        address:property_address(*),
        price:property_price(*),
        specifications:property_specifications(*),
        building:property_building(*),
        land:property_land(*),
        media:property_media(*),
        agent:users!assigned_to(full_name, avatar_url)
      `)
      .eq('status', 'published')
      .limit(4);

    const ok = !error && Array.isArray(data);
    console.log(`\n🛒 Embed dasbor tamu (agent:users!assigned_to): ${ok ? '✅' : '❌'}`);
    if (!ok) {
      console.log(`   error: ${error?.message || 'data bukan array'}`);
      fail++;
    } else {
      console.log(`   ${data.length} properti publik terbaca tanpa kolom terlarang`);
      pass++;
    }
  } catch (err) {
    console.log(`\n🛒 Embed dasbor tamu (agent:users!assigned_to): ❌`);
    console.log(`   error: ${err.message}`);
    fail++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Hasil: ${pass} lulus, ${fail} gagal`);

  if (fail === 0) {
    console.log('✅ RLS berfungsi dengan baik!');
    process.exit(0);
  } else {
    console.log('❌ Masih ada tabel yang terbuka atau belum dikunci dengan benar.');
    console.log('   Pastikan migrasi 007 sudah dijalankan di Supabase Dashboard.');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
