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
 */
const PROTECTED_SECTIONS = [
  "/dashboard",
  "/crm",
  "/admin",
  "/reports",
  "/invoices",
  "/projects",
  "/surveys",
  "/notifications",
  "/profile",
  "/settings",
  "/kpr-calculator",
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

  // 1. Tamu membuka halaman internal -> lempar ke login, simpan tujuan asalnya.
  if (!user && isProtectedPage(path)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", path + req.nextUrl.search);
    const redirect = NextResponse.redirect(loginUrl);
    for (const cookie of res.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  // 2. Sudah login tapi membuka halaman login/register -> lempar ke dashboard.
  if (user && isAuthPage(path)) {
    return redirectWithCookies("/dashboard", req, res);
  }

  // 3. Sudah login: cek apakah role-nya berhak atas halaman ini.
  if (user && isProtectedPage(path)) {
    const { data: profile, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      // Gagal membaca role = tidak bisa memastikan hak akses.
      // Versi lama menelan error ini dan meloloskan request (fail-open).
      // Sekarang fail-closed: alihkan ke dashboard yang aman untuk semua role.
      console.error("[proxy] Gagal membaca role user:", error.message);
      return path === "/dashboard"
        ? res
        : redirectWithCookies("/dashboard", req, res);
    }

    const role = normalizeRole(profile?.role ?? user.user_metadata?.role);

    if (!canAccessRoute(role, path)) {
      return redirectWithCookies("/dashboard", req, res);
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Halaman autentikasi
    "/login",
    "/register/:path*",
    "/forgot-password",
    // Seluruh halaman internal (URL tanpa awalan /dashboard karena route group)
    "/dashboard/:path*",
    "/crm/:path*",
    "/admin/:path*",
    "/reports/:path*",
    "/invoices/:path*",
    "/projects/:path*",
    "/surveys/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/kpr-calculator/:path*",
  ],
};
