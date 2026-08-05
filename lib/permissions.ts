// lib/permissions.ts
//
// Modul murni: hanya bergantung pada tipe. Tidak boleh mengimpor `next/headers`
// atau klien Supabase, karena file ini juga dipakai dari proxy.ts yang berjalan
// di luar konteks request Server Component.

import { UserRole, Permission, ROLE_PERMISSIONS } from "@/types/user.types";

const VALID_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "agent",
  "marketing",
  "viewer",
];

/**
 * Menyeragamkan penulisan role dari database.
 * Kolom `users.role` di produksi masih memuat variasi "superadmin" & "super_admin".
 * Nilai yang tidak dikenal diturunkan ke "viewer" (role paling tidak berdaya).
 */
export function normalizeRole(raw: unknown): UserRole {
  const value = String(raw ?? "").toLowerCase().trim();
  if (value === "superadmin") return "super_admin";
  return (VALID_ROLES as string[]).includes(value)
    ? (value as UserRole)
    : "viewer";
}

/**
 * Cek apakah user memiliki permission tertentu
 */
export function hasPermission(userRole: UserRole | null | undefined, permission: Permission): boolean {
  if (!userRole) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Cek apakah user memiliki salah satu permission
 */
export function hasAnyPermission(userRole: UserRole | null | undefined, permissions: Permission[]): boolean {
  if (!userRole) return false;
  return permissions.some((p) => hasPermission(userRole, p));
}

/**
 * Cek apakah user memiliki semua permission
 */
export function hasAllPermissions(userRole: UserRole | null | undefined, permissions: Permission[]): boolean {
  if (!userRole) return false;
  return permissions.every((p) => hasPermission(userRole, p));
}

/**
 * Cek apakah user role cukup (minimal level)
 */
export function hasMinRole(userRole: UserRole | null | undefined, minRole: UserRole): boolean {
  if (!userRole) return false;
  const roleLevels: Record<UserRole, number> = {
    super_admin: 100,
    admin: 80,
    agent: 50,
    marketing: 30,
    viewer: 10,
  };
  return (roleLevels[userRole] || 0) >= (roleLevels[minRole] || 0);
}

/**
 * Dapatkan daftar permission untuk role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Cek apakah user bisa mengakses route tertentu.
 *
 * PENTING soal bentuk path:
 * Halaman dashboard berada di dalam route group `app/(dashboard)/`. Tanda kurung
 * membuat segmen tersebut TIDAK muncul di URL, sehingga URL sebenarnya adalah
 * "/crm", "/admin", "/reports" — bukan "/dashboard/crm" dan seterusnya.
 * Satu-satunya pengecualian adalah "/dashboard" yang berasal dari folder
 * `app/(dashboard)/dashboard/`.
 *
 * Prefiks "/dashboard/..." lama tetap dicocokkan agar tautan lama tidak jebol.
 */
function matchesSection(route: string, section: string): boolean {
  // Cocok untuk "/crm", "/crm/leads", dan bentuk lama "/dashboard/crm"
  return (
    route === `/${section}` ||
    route.startsWith(`/${section}/`) ||
    route === `/dashboard/${section}` ||
    route.startsWith(`/dashboard/${section}/`)
  );
}

export function canAccessRoute(userRole: UserRole | null | undefined, route: string): boolean {
  if (!userRole) return false;

  // ✅ Super admin bisa akses semua
  if (userRole === "super_admin") return true;

  // Admin routes (hanya admin, super_admin sudah ditangani di atas)
  if (matchesSection(route, "admin")) {
    return userRole === "admin";
  }

  // Export route
  if (matchesSection(route, "export")) {
    return hasPermission(userRole, "export_data");
  }

  // Reports route
  if (matchesSection(route, "reports")) {
    return hasPermission(userRole, "view_reports");
  }

  // Properties
  if (matchesSection(route, "properties")) {
    return hasAnyPermission(userRole, ["manage_own_properties", "manage_all_properties", "view_all_properties"]);
  }

  // CRM, Leads, Follow-up, Survey — seluruhnya data pelanggan
  if (
    matchesSection(route, "crm") ||
    matchesSection(route, "leads") ||
    matchesSection(route, "surveys")
  ) {
    return hasAnyPermission(userRole, ["manage_own_crm", "manage_all_crm", "view_all_crm", "view_own_crm"]);
  }

  // Invoice & Proyek — data keuangan/operasional internal
  if (matchesSection(route, "invoices") || matchesSection(route, "projects")) {
    return hasAnyPermission(userRole, ["manage_all_properties", "manage_own_properties", "view_all_properties"]);
  }

  // Halaman personal & utilitas — semua user yang sudah login boleh
  if (
    matchesSection(route, "profile") ||
    matchesSection(route, "settings") ||
    matchesSection(route, "notifications") ||
    matchesSection(route, "kpr-calculator") ||
    route === "/dashboard" ||
    route === "/dashboard/dashboard"
  ) {
    return true;
  }

  // ❌ Default TOLAK.
  // Rute baru harus didaftarkan secara sadar di atas, bukan otomatis terbuka.
  return false;
}