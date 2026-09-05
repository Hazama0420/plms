// proxy.ts
//
// Menggantikan middleware.ts — pada Next.js 16 konvensi `middleware` sudah
// deprecated dan berganti nama menjadi `proxy` (fungsi ikut berganti nama).
//
// Proxy di sini hanya lapisan PERTAMA (optimistic check) untuk mencegat
// pengunjung sebelum halaman dirender. Penegakan sesungguhnya tetap dilakukan
// di setiap Route Handler lewat lib/api-auth.ts dan oleh RLS di Supabase.

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessRoute, normalizeRole } from "@/lib/permissions";
import { SITE } from "@/lib/site-config";

/**
 * Host "telanjang" (apex) dari origin kanonik — `www.inlandproperty.site`
 * menjadi `inlandproperty.site`. Satu-satunya penyimpangan host yang pernah
 * terjadi nyata adalah pengunjung yang mengetik apex, dan hosting sudah
 * mengalihkannya ke www. Perbandingan dibatasi ke apex saja (bukan "host mana
 * pun yang bukan kanonik") karena URL pratinjau `*.vercel.app` harus tetap
 * bisa dimuat — di sana push memang tidak tersedia, dan UI menjelaskannya.
 */
const CANONICAL_ORIGIN = new URL(SITE.url);
const APEX_HOSTNAME = CANONICAL_ORIGIN.hostname.replace(/^www\./, "");

/** Jangan pernah mengalihkan saat fallback localhost: itu hanya untuk dev. */
const IS_LOCAL_DEV =
  CANONICAL_ORIGIN.hostname === "localhost" ||
  CANONICAL_ORIGIN.hostname === "127.0.0.1" ||
  CANONICAL_ORIGIN.hostname === "0.0.0.0";

/** Halaman yang boleh dibuka tanpa login. */
const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

/**
 * Halaman internal yang wajib login.
 *
 * Ditulis tanpa awalan "/dashboard" karena folder `app/(dashboard)/` adalah
 * route group — tanda kurung membuat segmen itu tidak ikut muncul di URL.
 * Jadi URL nyatanya "/crm", bukan "/dashboard/crm". Inilah sumber celah pada
 * versi sebelumnya: seluruh pencocokan path meleset sehingga tidak ada satu pun
 * halaman internal yang benar-benar terkunci.
 *
 * TIGA RUTE TERBUKA UNTUK TAMU
 * ============================
 * `/dashboard`, `/properties`, dan `/kpr-calculator` terbuka untuk tamu — itu
 * etalase publiknya. Dashboard punya banner "Selamat Datang" beserta tombol
 * Masuk/Daftar khusus tamu (dashboard/page.tsx:441), dan tombol "Jelajahi
 * Dashboard (Mode Tamu)" di halaman login (login/page.tsx:301) mengarah ke
 * sana. Sempat ikut terkunci saat berkas ini menggantikan middleware.ts:
 * tamu terlempar ke /login, menekan tombol itu, dan terlempar kembali.
 *
 * Yang membatasi tamu bukan rutenya melainkan isinya — hubungi agen, ajukan
 * survei, dan seluruh menu CRM tetap menuntut akun.
 *
 * Ketiga rute itu tetap TERDAFTAR di matcher (lihat bawah), tetapi hanya untuk
 * pengalihan host kanonik: pemeriksaan di awal proxy() keluar sebelum klien
 * Supabase dibuat, jadi tamu pada host yang benar hanya menanggung satu
 * perbandingan string — bukan satu panggilan getUser().
 */
const PROTECTED_SECTIONS = [
  "/crm",
  "/admin",
  "/reports",
  "/invoices",
  "/projects",
  "/surveys",
  "/notifications",
  "/settings",
];

function isAuthPage(path: string): boolean {
  return AUTH_PAGES.some((p) => path === p || path.startsWith(`${p}/`));
}

function isProtectedPage(path: string): boolean {
  return PROTECTED_SECTIONS.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
}

/**
 * Membuat respons redirect yang tetap membawa cookie hasil refresh sesi.
 * Tanpa ini, token yang baru diperbarui Supabase akan hilang dan user bisa
 * terlempar ke login berulang kali.
 */
function redirectWithCookies(
  to: string,
  req: NextRequest,
  res: NextResponse
): NextResponse {
  const redirect = NextResponse.redirect(new URL(to, req.url));
  for (const cookie of res.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  // 0. Satukan host ke origin kanonik SEBELUM apa pun — klien Supabase belum
  //    dibuat, jadi tamu pada host yang benar tidak menanggung biaya apa pun.
  //    Tanpa ini SDK OneSignal menolak init saat origin menyimpang (mis. apex
  //    vs www), dan inisialisasi yang gagal membuat seluruh push tidak pernah
  //    terdaftar tanpa satu pun galat di sisi server.
  if (!IS_LOCAL_DEV && req.nextUrl.hostname === APEX_HOSTNAME) {
    const canonical = new URL(path + req.nextUrl.search, CANONICAL_ORIGIN);
    return NextResponse.redirect(canonical, 308);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set({ name, value, ...options });
          }
        },
      },
    }
  );

  // getUser() memverifikasi token ke server Auth Supabase.
  // getSession() hanya membaca cookie mentah tanpa verifikasi sehingga bisa
  // dipalsukan — tidak boleh dipakai untuk keputusan otorisasi.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Tamu (tidak ada user) — hanya boleh mengakses halaman publik & auth.
  // ─────────────────────────────────────────────────────────────────────────
  if (!user) {
    // Halaman /pending-approval juga dilindungi: tanpa login tidak mungkin
    // tahu statusnya. Jadi perlakukan seperti protected page.
    if (isProtectedPage(path) || path === "/pending-approval") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirectTo", path + req.nextUrl.search);
      const redirect = NextResponse.redirect(loginUrl);
      for (const cookie of res.cookies.getAll()) redirect.cookies.set(cookie);
      return redirect;
    }
    // Tamu di halaman auth / publik — lanjutkan.
    return res;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. User sudah login — ambil status + role untuk keputusan lebih lanjut.
  // ─────────────────────────────────────────────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[proxy] Gagal membaca data user:", profileError.message);
    return path === "/dashboard" ? res : redirectWithCookies("/dashboard", req, res);
  }

  const role = normalizeRole(profile?.role ?? user.user_metadata?.role);
  const status = (profile?.status ?? "active").toLowerCase().trim();

  // ─────────────────────────────────────────────────────────────────────────
  // 2a. Status PENDING — hanya boleh mengakses /pending-approval
  // ─────────────────────────────────────────────────────────────────────────
  if (status === "pending") {
    if (path === "/pending-approval") {
      return res; // biarkan halaman ini tampil
    }
    return redirectWithCookies("/pending-approval", req, res);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2b. Status SUSPENDED — tendang ke login dengan alasan
  // ─────────────────────────────────────────────────────────────────────────
  if (status === "suspended") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("reason", "suspended");
    return redirectWithCookies(loginUrl.toString(), req, res);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2c. User AKTIF — aturan standar: jangan biarkan di halaman auth,
  //     periksa akses rute.
  // ─────────────────────────────────────────────────────────────────────────
  if (isAuthPage(path)) {
    return redirectWithCookies("/dashboard", req, res);
  }

  if (isProtectedPage(path) && !canAccessRoute(role, path)) {
    return redirectWithCookies("/dashboard", req, res);
  }

  return res;
}

export const config = {
  matcher: [
    // Halaman autentikasi
    "/login",
    "/register/:path*",
    "/forgot-password",
    // Halaman menunggu persetujuan
    "/pending-approval",
    // Halaman internal yang wajib login
    "/crm/:path*",
    "/admin/:path*",
    "/reports/:path*",
    "/invoices/:path*",
    "/projects/:path*",
    "/surveys/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/settings/:path*",
    // Rute tamu (etalase publik) — hanya lewat pemeriksaan host, lalu lulus.
    "/dashboard",
    "/properties/:path*",
    "/kpr-calculator",
  ],
};