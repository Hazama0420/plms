// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Fungsi pengecekan hak akses rute untuk user yang sudah login
function canAccessRoute(role: string | null | undefined, path: string): boolean {
  const safeRole = (role || "viewer").toLowerCase();

  if (safeRole === "super_admin" || safeRole === "superadmin") return true;

  if (path.startsWith("/dashboard/admin")) {
    return safeRole === "admin" || safeRole === "super_admin" || safeRole === "superadmin";
  }
  if (path.startsWith("/dashboard/reports")) {
    return ["super_admin", "superadmin", "admin", "agent", "marketing"].includes(safeRole);
  }
  if (path.startsWith("/dashboard/properties") || path.startsWith("/properties")) {
    return ["super_admin", "superadmin", "admin", "agent", "marketing", "viewer"].includes(safeRole);
  }
  if (path.startsWith("/dashboard/crm")) {
    return ["super_admin", "superadmin", "admin", "agent", "marketing"].includes(safeRole);
  }
  if (path.startsWith("/dashboard/profile") || path.startsWith("/dashboard/settings")) {
    return true;
  }
  if (path === "/dashboard" || path === "/dashboard/dashboard") {
    return true;
  }
  return true;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return req.cookies.get(name)?.value; },
        set(name, value, options) { res.cookies.set({ name, value, ...options }); },
        remove(name, options) { res.cookies.set({ name, value: "", ...options }); },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const path = req.nextUrl.pathname;

  const isAuthPage = path === "/" || path === "/register";
  
  // 🟢 HANYA HALAMAN PRIVAT TERTENTU YANG DIKUNCI UNTUK TAMU
  // /dashboard (utama) dan /properties dibebaskan agar bisa dilihat tamu.
  const isProtectedPage =
    path.startsWith("/dashboard/crm") ||
    path.startsWith("/dashboard/reports") ||
    path.startsWith("/dashboard/admin") ||
    path.startsWith("/profile") ||
    path.startsWith("/settings");

  // 1. Jika Tamu (Belum Login) mencoba buka halaman privat (CRM, Settings, Profile, dll) -> Lempar ke login (/)
  if (!session && isProtectedPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 2. Jika Sudah Login tapi buka halaman login (/) -> Lempar ke /dashboard
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 3. Validasi Role untuk user yang sudah login jika mengakses halaman privat
  if (session && isProtectedPage) {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      
      const userRole = userData?.role || "viewer";
      
      if (!canAccessRoute(userRole, path)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } catch (error) {
      // Abaikan jika error koneksi database
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/register",
    "/dashboard/:path*",
    "/properties/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/api/admin/:path*",
  ],
};