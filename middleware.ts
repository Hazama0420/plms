// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Fungsi sederhana untuk cek akses
function canAccessRoute(role: string | null | undefined, path: string): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  if (path.startsWith("/dashboard/admin")) {
    return role === "admin" || role === "super_admin";
  }
  if (path.startsWith("/dashboard/reports")) {
    return ["super_admin", "admin", "agent", "marketing"].includes(role);
  }
  if (path.startsWith("/dashboard/properties")) {
    return ["super_admin", "admin", "agent", "marketing", "viewer"].includes(role);
  }
  if (path.startsWith("/dashboard/crm")) {
    return ["super_admin", "admin", "agent", "marketing"].includes(role);
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
  const isProtectedPage =
    path.startsWith("/dashboard") ||
    path.startsWith("/properties") ||
    path.startsWith("/profile") ||
    path.startsWith("/settings");

  if (!session && isProtectedPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

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
      // jika error, biarkan akses
    }
  }

  if (path.startsWith("/api/admin")) {
    if (!session) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      const userRole = userData?.role || "viewer";
      if (!["super_admin", "admin"].includes(userRole)) {
        return new NextResponse(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
    } catch {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
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