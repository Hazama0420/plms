#!/usr/bin/env node
// scripts/verify-rls.mjs
//
// Verifikasi RLS pasca-migrasi 007, 012 (PHASE 1A) dan 013 (PHASE 1B).
//
// Skrip ini punya tiga lapis, dari yang paling murah ke yang paling mahal:
//
//   1. HITUNGAN BARIS anon vs service-role untuk tabel non-CRM. Migrasi 007
//      sukses bila property_owners/invoices/system_settings = 0 untuk anon,
//      users = jumlah agen publik, properties = jumlah published saja.
//
//   2. HAK TABEL anon pada kelima tabel CRM. Hitungan baris TIDAK bisa
//      menangkap ini: anon melihat 0 baris karena RLS, baik haknya ada maupun
//      tidak. Yang membedakan hanya balasan PostgREST terhadap percobaan akses.
//      Sejak migrasi 013 seluruh hak anon dicabut, termasuk SELECT — jadi
//      assertion-nya BERBALIK: error 42501 adalah lulus, `200` dengan 0 baris
//      adalah gagal.
//
//   3. KEPEMILIKAN antar-agent (PHASE 1B). Ini satu-satunya bagian yang butuh
//      sesi sungguhan, karena seluruh policy CRM terikat role `authenticated`
//      dan tidak ada yang bisa disimpulkan dari kunci anon maupun service role.
//      Bagian ini OPSIONAL: tanpa kredensial akun uji di .env.local ia
//      melaporkan SKIP dan tidak dihitung gagal.
//
// Yang TIDAK bisa dibuktikan skrip ini: bentuk policy itu sendiri. pg_policies,
// pg_catalog dan information_schema tidak terjangkau lewat PostgREST
// (404 PGRST205). Kueri manualnya ada di komentar bagian 9 migrasi 013 dan
// harus dijalankan di SQL Editor.
//
// CARA PAKAI:
//   node scripts/verify-rls.mjs
//
// Butuh .env.local dengan:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY
//
// Opsional, untuk lapis ke-3 (isi sendiri di Supabase Auth — skrip ini tidak
// pernah membuat akun):
//   VERIFY_AGENT_EMAIL        / VERIFY_AGENT_PASSWORD          (role agent)
//   VERIFY_AGENT2_EMAIL       / VERIFY_AGENT2_PASSWORD         (role agent, lain orang)
//   VERIFY_MARKETING_EMAIL    / VERIFY_MARKETING_PASSWORD      (role marketing)
//   VERIFY_COMMISSIONER_EMAIL / VERIFY_COMMISSIONER_PASSWORD   (role commissioner)

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

// Kelima tabel CRM. Sejak migrasi 013 anon tidak memegang hak apa pun di sini:
// insert/update/delete/truncate dicabut 012, select dicabut 013.
const CRM_TABLES = [
  'crm_leads',
  'crm_contacts',
  'crm_interests',
  'crm_followups',
  'crm_activities'
];

// UUID yang tidak mungkin dimiliki baris mana pun. Dipakai sebagai filter agar
// percobaan tulis di bawah tidak dapat menyentuh data sungguhan: bila haknya
// ternyata masih ada, pernyataannya berjalan atas nol baris.
const IMPOSSIBLE_ID = '00000000-0000-0000-0000-000000000000';

// Penanda baris sintetis lapis ke-3. Dipakai untuk membuat DAN membersihkan,
// jadi tidak boleh bertabrakan dengan nilai `source` mana pun yang sungguhan.
const PROBE_SOURCE = 'RLS-PROBE';

// Ketiga fungsi pembantu yang dibuat migrasi 013 dan dicabut dari anon oleh
// migrasi 014 (M-19). PostgREST mengekspos setiap fungsi skema public sebagai
// endpoint RPC, jadi hak EXECUTE-nya bisa diuji dari luar database.
//
// Argumen probe memakai IMPOSSIBLE_ID: yang diuji hak memanggilnya, bukan
// nilai yang dikembalikan, dan uuid ini tidak dimiliki baris mana pun.
const CRM_HELPERS = [
  { fn: 'is_crm_reader', args: {} },
  { fn: 'crm_lead_visible', args: { p_lead_id: IMPOSSIBLE_ID } },
  { fn: 'crm_contact_visible', args: { p_contact_id: IMPOSSIBLE_ID } }
];

/**
 * Memastikan anon tidak bisa MEMANGGIL fungsi pembantu CRM (migrasi 014, M-19).
 *
 * Diuji berpasangan dengan service_role dengan sengaja. Anon yang ditolak saja
 * tidak membuktikan apa-apa — fungsi yang salah nama juga ditolak — jadi
 * assertion-nya baru bermakna bila pemanggilan yang sama berhasil untuk role
 * yang memang berhak.
 *
 * Kode penolakan tidak dipatok. Setelah hak EXECUTE dicabut, PostgREST bisa
 * menjawab 42501 (permission denied for function) atau menghilangkan fungsinya
 * dari schema cache untuk role itu dan menjawab PGRST202. Keduanya berarti anon
 * tidak bisa memanggilnya; yang dicatat adalah kodenya, bukan diasumsikan.
 *
 * `authenticated` TIDAK bisa diperiksa di sini: ia butuh sesi sungguhan, dan
 * skrip ini tidak pernah membuat akun. Hak EXECUTE-nya wajib ada — tanpa itu
 * seluruh 20 policy CRM gagal saat dievaluasi — dan dibuktikan lewat kueri A
 * di bagian 2 migrasi 014.
 */
async function expectExecuteDenied(fn, args) {
  const a = await anon.rpc(fn, args);
  const s = await admin.rpc(fn, args);

  return {
    anonDenied: Boolean(a.error),
    anonCode: a.error?.code ?? '',
    serviceOk: !s.error,
    serviceDetail: s.error ? `${s.error.code ?? '?'} ${s.error.message}` : ''
  };
}

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

/** Seperti count(), tetapi mengembalikan error alih-alih melemparnya. */
async function safeCount(client, table) {
  try {
    return { count: await count(client, table), error: null };
  } catch (err) {
    return { count: null, error: err.message };
  }
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

/**
 * Membedakan penolakan hak tabel dari penolakan RLS.
 *
 * PostgreSQL memakai SQLSTATE 42501 untuk KEDUANYA — "permission denied for
 * table X" dan "new row violates row-level security policy for table X" —
 * sehingga kodenya saja tidak cukup. Yang membedakan hanya pesannya.
 *
 * Perbedaannya menentukan: hak tabel yang hilang menutup jalan sebelum policy
 * mana pun dipertimbangkan, sedangkan penolakan RLS berarti haknya masih ada
 * dan yang menahan hanya satu policy yang bisa saja ditulis ulang keliru besok.
 */
function classifyDenial(error) {
  if (!error) return 'diterima';
  const code = error.code ?? '';
  const message = String(error.message ?? '');

  if (code === '42501' && /permission denied/i.test(message)) return 'tanpa-hak';
  if (code === '42501') return 'ditolak-rls';
  if (code === '23502') return 'constraint';   // NOT NULL — haknya lolos
  if (code === '23503') return 'constraint';   // foreign key — haknya lolos
  return `lain:${code || 'tanpa-kode'}`;
}

/**
 * Memastikan anon tidak bisa MEMBACA tabel CRM sama sekali (migrasi 013).
 *
 * Sengaja tanpa `head: true`: permintaan HEAD tidak membawa badan balasan,
 * sehingga kode error PostgREST tidak sampai ke pemanggil dan setiap penolakan
 * terbaca sama saja. `limit(1)` cukup murah dan membawa kodenya.
 *
 * Yang dibedakan:
 *   - tanpa-hak  → hak SELECT sudah tercabut. Ini keadaan yang diinginkan.
 *   - diterima   → hak SELECT MASIH ADA; anon melihat 0 baris hanya karena RLS.
 */
async function expectSelectDenied(client, table) {
  const { error } = await client.from(table).select('id').limit(1);
  return { verdict: classifyDenial(error), code: error?.code ?? '' };
}

/**
 * Memastikan hak tulis anon pada sebuah tabel benar-benar tercabut.
 *
 * Ketiganya non-destruktif, dengan alasan yang berbeda-beda:
 *
 *   INSERT — payload hanya berisi `id`. Kelima tabel punya sedikitnya satu
 *            kolom NOT NULL di luar PK (baseline §1: contact_id, full_name,
 *            lead_id, activity_type), jadi tidak ada jalur di mana baris
 *            benar-benar terbentuk. Kalau haknya ternyata masih ada,
 *            balasannya 23502, bukan baris baru.
 *   UPDATE — difilter IMPOSSIBLE_ID, tidak ada baris yang bisa cocok.
 *   DELETE — sama.
 *
 * INSERT ditambahkan di PHASE 1B karena UPDATE dan DELETE tidak mewakilinya:
 * ketiganya adalah hak yang terpisah, dan 007 pernah mencabut sebagian saja.
 */
async function expectWriteDenied(client, table) {
  const insert = await client.from(table).insert({ id: IMPOSSIBLE_ID });
  const update = await client.from(table).update({ id: IMPOSSIBLE_ID }).eq('id', IMPOSSIBLE_ID);
  const remove = await client.from(table).delete().eq('id', IMPOSSIBLE_ID);

  return {
    insert: classifyDenial(insert.error),
    update: classifyDenial(update.error),
    delete: classifyDenial(remove.error)
  };
}

/**
 * Masuk sebagai satu akun uji dan kembalikan klien ber-sesi.
 *
 * Mengembalikan null bila kredensialnya tidak ada di .env.local — itu keadaan
 * normal, bukan kegagalan. Skrip ini tidak pernah membuat akun.
 *
 * `persistSession: false` supaya tidak ada token yang tertinggal di disk; sesi
 * hanya hidup di memori proses dan dicabut lewat signOut() di akhir.
 */
async function signInAs(label, emailVar, passwordVar) {
  const email = process.env[emailVar];
  const password = process.env[passwordVar];
  if (!email || !password) return { label, client: null, reason: `${emailVar} tidak diisi` };

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    return { label, client: null, reason: `gagal masuk: ${error?.message ?? 'tanpa user'}` };
  }

  // Role dibaca dengan service role, bukan dari sesi: policy `users` bisa saja
  // menyembunyikan barisnya sendiri, dan assertion di bawah tidak berarti apa
  // pun kalau akunnya ternyata bukan role yang diharapkan.
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  return {
    label,
    client,
    userId: data.user.id,
    role: String(profile?.role ?? '').toLowerCase(),
    reason: null
  };
}

/**
 * Data sintetis untuk membuktikan pemisahan antar-agent.
 *
 * Assertion "agent-1 tidak bisa mengubah data agent-2" tidak dapat dibuktikan
 * di atas data sungguhan tanpa mempertaruhkannya. Karena itu dibuat dua kontak
 * dan dua lead bertanda PROBE_SOURCE — satu untuk tiap agent — dan seluruh
 * percobaan tulis lintas-pemilik dijalankan HANYA atas baris ini.
 *
 * `created_by` sengaja tidak diisi: kalau terisi, cabang created_by pada policy
 * akan ikut membuka lead-nya dan uji kepemilikan jadi tidak membuktikan apa-apa.
 */
async function createProbeFixture(agent1Id, agent2Id) {
  const stamp = Date.now();
  const made = { contactIds: [], leadIds: [] };

  for (const [index, ownerId] of [agent1Id, agent2Id].entries()) {
    const { data: contact, error: contactErr } = await admin
      .from('crm_contacts')
      .insert({
        contact_code: `${PROBE_SOURCE}-${stamp}-${index + 1}`,
        full_name: `${PROBE_SOURCE} kontak uji ${index + 1}`,
        source: PROBE_SOURCE
      })
      .select('id')
      .single();
    if (contactErr) throw new Error(`gagal membuat kontak probe: ${contactErr.message}`);
    made.contactIds.push(contact.id);

    const { data: lead, error: leadErr } = await admin
      .from('crm_leads')
      .insert({
        contact_id: contact.id,
        assigned_to: ownerId,
        source: PROBE_SOURCE,
        status: 'new'
      })
      .select('id')
      .single();
    if (leadErr) throw new Error(`gagal membuat lead probe: ${leadErr.message}`);
    made.leadIds.push(lead.id);
  }

  return made;
}

/**
 * Hapus seluruh baris probe. Dijalankan di `finally`, jadi tetap berjalan
 * meski ada assertion yang melempar di tengah jalan.
 *
 * Lead dihapus lebih dulu supaya sisa anaknya (interests/followups/activities)
 * ikut terbawa CASCADE, baru kontaknya. Menghapus kontak saja sebenarnya sudah
 * cukup karena rantainya berlapis, tetapi urutan eksplisit membuat kegagalan
 * parsial lebih mudah dibaca.
 */
async function cleanupProbeFixture(made) {
  const problems = [];
  if (made?.leadIds?.length) {
    const { error } = await admin.from('crm_leads').delete().in('id', made.leadIds);
    if (error) problems.push(`crm_leads: ${error.message}`);
  }
  if (made?.contactIds?.length) {
    const { error } = await admin.from('crm_contacts').delete().in('id', made.contactIds);
    if (error) problems.push(`crm_contacts: ${error.message}`);
  }
  return problems;
}

async function verify() {
  console.log('🔍 Verifikasi RLS — migrasi 007, 012, 013\n');

  const tables = [
    { name: 'property_owners', expectAnonZero: true },
    { name: 'users', expectAnonZero: false }, // ada agen publik
    { name: 'invoices', expectAnonZero: true },
    // Kelima tabel CRM TIDAK ada di daftar ini sejak migrasi 013. Hak SELECT
    // anon-nya sudah dicabut, jadi count() akan melempar — dan justru itulah
    // hasil yang benar. Pengujiannya pindah ke blok "SELECT anon" di bawah,
    // dengan assertion yang berbalik arah.
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
  let skip = 0;

  const record = (ok, line) => {
    console.log(`   ${ok ? '✅' : '❌'} ${line}`);
    if (ok) pass++;
    else fail++;
  };
  const skipped = (line) => {
    console.log(`   ⏭️  ${line}`);
    skip++;
  };

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
    record(denied, `users.${column.padEnd(12)} ditolak: ${denied}`);
  }

  // Verifikasi khusus: hak SELECT anon pada tabel CRM harus tercabut
  // (migrasi 013). Arah assertion-nya kebalikan dari blok hitungan di atas —
  // di sini keberhasilan membaca ADALAH kegagalan.
  //
  // Sebelum 013, kelima tabel menjawab 200 dengan 0 baris: haknya ada, yang
  // menahan hanya RLS. Sesudahnya, ditolak sebelum RLS ikut dipertimbangkan.
  console.log(`\n👁️  Hak SELECT anon pada tabel CRM (harus tercabut, migrasi 013):`);
  for (const table of CRM_TABLES) {
    const { verdict, code } = await expectSelectDenied(anon, table);
    const ok = verdict === 'tanpa-hak';
    const detail = verdict === 'diterima'
      ? 'DITERIMA — hak SELECT masih ada, hanya RLS yang menahan'
      : `${verdict}${code ? ` (${code})` : ''}`;
    record(ok, `${table.padEnd(16)} ${detail}`);
  }

  // Verifikasi khusus: hak tulis anon pada tabel CRM harus tercabut
  // (migrasi 012). Hitungan baris tidak dapat menangkap ini — anon sudah
  // melihat 0 baris karena RLS, dengan atau tanpa hak tulis. Ketiga percobaan
  // di bawah tidak dapat menyentuh satu baris pun; lihat expectWriteDenied().
  console.log(`\n✍️  Hak tulis anon pada tabel CRM (harus tercabut, migrasi 012):`);
  for (const table of CRM_TABLES) {
    const v = await expectWriteDenied(anon, table);
    const ok = v.insert === 'tanpa-hak' && v.update === 'tanpa-hak' && v.delete === 'tanpa-hak';
    record(ok, `${table.padEnd(16)} insert ${v.insert}, update ${v.update}, delete ${v.delete}`);
  }

  // Verifikasi khusus: hak EXECUTE anon pada ketiga fungsi pembantu CRM
  // (migrasi 014, temuan M-19). Migrasi 013 mencabutnya dari PUBLIC, tetapi
  // instance ini memberikan EXECUTE langsung kepada anon lewat default
  // privileges skema public — hak langsung tidak tersentuh pencabutan atas
  // PUBLIC, jadi pencabutan itu tidak berpengaruh.
  //
  // Bukan lubang terbuka: ketiganya dijaga `auth.uid() is not null` dan selalu
  // mengembalikan false untuk pemanggil tanpa sesi. Yang diuji di sini lapis
  // keduanya — permukaan yang seharusnya tidak terjangkau sama sekali.
  console.log(`\n🔑 EXECUTE helper CRM untuk anon (harus tercabut, migrasi 014):`);
  for (const { fn, args } of CRM_HELPERS) {
    const v = await expectExecuteDenied(fn, args);
    const ok = v.anonDenied && v.serviceOk;
    const detail = v.anonDenied
      ? `anon ditolak (${v.anonCode || 'tanpa-kode'})`
      : 'anon BERHASIL — hak EXECUTE masih ada';
    const svc = v.serviceOk ? 'service_role berhasil' : `service_role GAGAL ${v.serviceDetail}`;
    record(ok, `${fn.padEnd(20)} ${detail}, ${svc}`);
  }
  console.log(`   ℹ️  authenticated tidak diperiksa di sini — butuh sesi. Pakai kueri A di bagian 2 migrasi 014.`);

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
    console.log(`\n🛒 Embed dasbor tamu (agent:users!assigned_to):`);
    if (!ok) {
      record(false, `error: ${error?.message || 'data bukan array'}`);
    } else {
      record(true, `${data.length} properti publik terbaca tanpa kolom terlarang`);
    }
  } catch (err) {
    console.log(`\n🛒 Embed dasbor tamu (agent:users!assigned_to):`);
    record(false, `error: ${err.message}`);
  }

  // ==========================================================================
  // Lapis 3 — kepemilikan antar-role (PHASE 1B)
  // ==========================================================================
  console.log(`\n🧍 Kepemilikan CRM per role (migrasi 013):`);

  const sessions = {
    agent1: await signInAs('agent-1', 'VERIFY_AGENT_EMAIL', 'VERIFY_AGENT_PASSWORD'),
    agent2: await signInAs('agent-2', 'VERIFY_AGENT2_EMAIL', 'VERIFY_AGENT2_PASSWORD'),
    marketing: await signInAs('marketing', 'VERIFY_MARKETING_EMAIL', 'VERIFY_MARKETING_PASSWORD'),
    commissioner: await signInAs('commissioner', 'VERIFY_COMMISSIONER_EMAIL', 'VERIFY_COMMISSIONER_PASSWORD')
  };

  // Role yang tidak sesuai harapan membuat assertion-nya tidak bermakna —
  // dilaporkan sebagai SKIP, bukan gagal, supaya kesalahan penyiapan akun tidak
  // terbaca sebagai kebocoran RLS.
  const EXPECTED_ROLE = { agent1: 'agent', agent2: 'agent', marketing: 'marketing', commissioner: 'commissioner' };
  for (const [key, session] of Object.entries(sessions)) {
    if (!session.client) continue;
    if (session.role !== EXPECTED_ROLE[key]) {
      skipped(`${session.label.padEnd(13)} role di database '${session.role || 'kosong'}', diharapkan '${EXPECTED_ROLE[key]}' — dilewati`);
      await session.client.auth.signOut().catch(() => {});
      session.client = null;
      session.reason = 'role tidak sesuai';
    }
  }

  let fixture = null;
  try {
    const { agent1, agent2, marketing, commissioner } = sessions;

    if (!agent1.client || !agent2.client) {
      skipped(`pemisahan antar-agent — ${!agent1.client ? agent1.reason : agent2.reason}`);
    } else {
      fixture = await createProbeFixture(agent1.userId, agent2.userId);
      const [contact1Id, contact2Id] = fixture.contactIds;
      const [lead1Id, lead2Id] = fixture.leadIds;

      // 3. agent-1 melihat lead probe miliknya
      {
        const { data, error } = await agent1.client.from('crm_leads').select('id').eq('id', lead1Id);
        record(!error && data?.length === 1, `agent-1 melihat lead probe miliknya${error ? ` — error ${error.message}` : ''}`);
      }

      // 4. agent-1 TIDAK melihat lead probe agent-2
      {
        const { data, error } = await agent1.client.from('crm_leads').select('id').eq('id', lead2Id);
        record(!error && data?.length === 0, `agent-1 tidak melihat lead agent-2 (${data?.length ?? '?'} baris)`);
      }

      // 5. agent-1 tidak melihat kontak yang hanya terpaut lead agent-2.
      //    Kontaknya bukan yatim — ia punya lead — jadi cabang "kontak yatim"
      //    pada crm_contact_visible() tidak menolongnya.
      {
        const mine = await agent1.client.from('crm_contacts').select('id').eq('id', contact1Id);
        const theirs = await agent1.client.from('crm_contacts').select('id').eq('id', contact2Id);
        record(!mine.error && mine.data?.length === 1, `agent-1 melihat kontak lead miliknya`);
        record(!theirs.error && theirs.data?.length === 0, `agent-1 tidak melihat kontak lead agent-2 (${theirs.data?.length ?? '?'} baris)`);
      }

      // 6. agent-1 UPDATE lead agent-2 → nol baris terpengaruh.
      //    Tidak ada error yang diharapkan: untuk UPDATE, policy yang tidak
      //    cocok menyaring baris alih-alih menolak pernyataannya.
      {
        const { data, error } = await agent1.client
          .from('crm_leads').update({ status: 'contacted' }).eq('id', lead2Id).select('id');
        record(Boolean(error) || data?.length === 0, `agent-1 UPDATE lead agent-2 → ${error ? `ditolak (${error.code})` : `${data?.length} baris`}`);
      }

      // 7. agent-1 DELETE lead probe MILIKNYA SENDIRI → nol baris.
      //    crm_leads_delete diperketat jadi is_staff() saja: lead adalah induk
      //    CASCADE dari interests/followups/activities, jadi satu penghapusan
      //    menghilangkan seluruh riwayatnya.
      {
        const { data, error } = await agent1.client
          .from('crm_leads').delete().eq('id', lead1Id).select('id');
        record(Boolean(error) || data?.length === 0, `agent-1 DELETE lead sendiri → ${error ? `ditolak (${error.code})` : `${data?.length} baris`}`);
      }

      // 8. agent-1 INSERT crm_activities pada lead agent-2 → ditolak RLS.
      //    Di sini 42501 yang diharapkan adalah penolakan RLS, bukan hak tabel:
      //    `authenticated` memang punya hak INSERT, dan yang menutup adalah
      //    WITH CHECK pada crm_activities_insert.
      {
        const { error } = await agent1.client.from('crm_activities').insert({
          lead_id: lead2Id, user_id: agent1.userId, activity_type: PROBE_SOURCE
        });
        record(classifyDenial(error) === 'ditolak-rls', `agent-1 INSERT aktivitas pada lead agent-2 → ${classifyDenial(error)}`);
      }

      // 9. agent-1 INSERT crm_activities pada lead sendiri → berhasil.
      //    Barisnya ikut terhapus CASCADE saat lead probe dibersihkan.
      {
        const { error } = await agent1.client.from('crm_activities').insert({
          lead_id: lead1Id, user_id: agent1.userId, activity_type: PROBE_SOURCE
        });
        record(!error, `agent-1 INSERT aktivitas pada lead sendiri → ${error ? `ditolak ${error.code} ${error.message}` : 'berhasil'}`);
      }

      // 14 + 15. Konsistensi lead ↔ kontak — pembuktian langsung keputusan
      //    no.6. Embed PostgREST adalah LEFT JOIN, jadi kontak yang tidak
      //    terlihat muncul sebagai `null`, bukan error. Itulah yang membuat
      //    getLeadById() (crm.service.ts:228-239) melempar "Contact not found".
      //    Setiap lead yang terlihat agent-1 HARUS membawa kontaknya.
      {
        const { data, error } = await agent1.client
          .from('crm_leads').select('id, contact:crm_contacts(id)').limit(100);
        if (error) {
          record(false, `agent-1 embed lead+kontak → error ${error.message}`);
        } else {
          const orphaned = data.filter(row => !row.contact);
          record(orphaned.length === 0, `agent-1: ${data.length} lead terlihat, ${orphaned.length} tanpa kontak (harus 0)`);
        }
      }
    }

    // 10-13. marketing dan commissioner: baca penuh, tulis nol.
    const adminLeadCount = (await safeCount(admin, 'crm_leads')).count;

    for (const session of [sessions.marketing, sessions.commissioner]) {
      if (!session.client) {
        skipped(`${session.label.padEnd(13)} ${session.reason}`);
        continue;
      }

      const seen = await safeCount(session.client, 'crm_leads');
      record(
        seen.error === null && seen.count === adminLeadCount,
        `${session.label.padEnd(13)} melihat ${seen.error ? `error ${seen.error}` : seen.count} lead, service-role ${adminLeadCount}`
      );

      if (!fixture) {
        skipped(`${session.label.padEnd(13)} uji tulis dilewati — tidak ada baris probe`);
        continue;
      }

      const { data, error } = await session.client
        .from('crm_leads').update({ status: 'contacted' }).eq('id', fixture.leadIds[0]).select('id');
      record(
        Boolean(error) || data?.length === 0,
        `${session.label.padEnd(13)} UPDATE lead → ${error ? `ditolak (${error.code})` : `${data?.length} baris`}`
      );
    }
  } catch (err) {
    record(false, `lapis kepemilikan gagal: ${err.message}`);
  } finally {
    if (fixture) {
      const problems = await cleanupProbeFixture(fixture);
      if (problems.length) {
        console.log(`   ⚠️  Sisa baris probe gagal dihapus: ${problems.join('; ')}`);
        console.log(`      Hapus manual: crm_leads/crm_contacts dengan source = '${PROBE_SOURCE}'`);
      } else {
        console.log(`   🧹 ${fixture.leadIds.length} lead + ${fixture.contactIds.length} kontak probe dibersihkan`);
      }

      // Membuat lead ber-assigned_to memicu on_lead_created_notify, yang
      // menulis ke `notifications`. Kolom penghubungnya ke lead berstatus
      // NOT VERIFIED di baseline §7, jadi skrip ini TIDAK menebak nama kolom
      // untuk membersihkannya — ia hanya melaporkan agar bisa dihapus manual.
      console.log(`   ℹ️  ${fixture.leadIds.length} notifikasi "lead baru" mungkin tersisa dari trigger. Bersihkan manual bila mengganggu.`);
    }

    for (const session of Object.values(sessions)) {
      if (session.client) await session.client.auth.signOut().catch(() => {});
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Hasil: ${pass} lulus, ${fail} gagal, ${skip} dilewati`);
  if (skip > 0) {
    console.log(`\nBagian yang dilewati butuh akun uji di .env.local:`);
    console.log(`  VERIFY_AGENT_EMAIL / VERIFY_AGENT_PASSWORD              (role agent)`);
    console.log(`  VERIFY_AGENT2_EMAIL / VERIFY_AGENT2_PASSWORD            (role agent, lain orang)`);
    console.log(`  VERIFY_MARKETING_EMAIL / VERIFY_MARKETING_PASSWORD      (role marketing)`);
    console.log(`  VERIFY_COMMISSIONER_EMAIL / VERIFY_COMMISSIONER_PASSWORD (role commissioner)`);
    console.log(`Tanpa itu kepemilikan antar-agent tidak terbukti — hanya belum diuji.`);
  }

  if (fail === 0) {
    console.log('✅ RLS berfungsi dengan baik!');
    process.exit(0);
  } else {
    console.log('❌ Masih ada tabel yang terbuka atau belum dikunci dengan benar.');
    console.log('   Pastikan migrasi 007, 012 dan 013 sudah dijalankan di Supabase Dashboard.');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
