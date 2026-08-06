// lib/supabase/public.ts
//
// Klien Supabase untuk membaca data PUBLIK dari sisi server — dipakai
// app/sitemap.ts dan generateMetadata di halaman properti.
//
// Kenapa tidak memakai tiga klien yang sudah ada:
//
//   lib/supabase/client.ts  createBrowserClient dengan sesi di localStorage.
//                           Diinstansiasi di tingkat modul, jadi mengimpornya
//                           dari server component berarti menjalankan kode
//                           peramban di tempat yang tidak punya localStorage.
//                           Ini juga yang membuat propertyService tidak bisa
//                           dipanggil dari generateMetadata.
//
//   lib/supabase/server.ts  Benar untuk halaman yang perlu tahu siapa yang
//                           masuk, tapi menyentuh cookies(). Sitemap tidak
//                           peduli siapa yang memintanya — dan sekali menyentuh
//                           cookies, rutenya jadi dinamis pada setiap permintaan
//                           padahal isinya sama untuk semua orang.
//
//   lib/supabase/admin.ts   Service-role: menembus seluruh aturan RLS. Terlalu
//                           berbahaya untuk jalur yang keluarannya justru
//                           diterbitkan ke publik — satu filter yang lupa
//                           ditulis langsung membocorkan listing draf.
//
// Yang tersisa: kunci anon, tanpa sesi, tanpa cookie. Hak bacanya persis sama
// dengan pengunjung yang belum masuk, sehingga RLS tetap berlaku sebagai
// lapisan kedua di belakang filter `status = "published"` yang eksplisit.
import { createClient } from "@supabase/supabase-js";

export function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Pastikan sudah dipasang di .env.local"
    );
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      // Tidak ada pengguna yang perlu diingat: tanpa ini klien akan mencoba
      // menulis sesi ke penyimpanan yang tidak ada di server.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
