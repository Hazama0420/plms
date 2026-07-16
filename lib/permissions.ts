// lib/permissions.ts

import { UserRole, Permission, ROLE_PERMISSIONS } from "@/types/user.types";

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
 * Cek apakah user bisa mengakses route tertentu
 */
export function canAccessRoute(userRole: UserRole | null | undefined, route: string): boolean {
  if (!userRole) return false;

  // ✅ Super admin bisa akses semua
  if (userRole === "super_admin") return true;

  // Admin routes (hanya admin, super_admin sudah ditangani di atas)
  if (route.startsWith("/dashboard/admin")) {
    return userRole === "admin";
  }

  // Export route
  if (route.startsWith("/dashboard/export")) {
    return hasPermission(userRole, "export_data");
  }

  // Reports route
  if (route.startsWith("/dashboard/reports")) {
    return hasPermission(userRole, "view_reports");
  }

  // Profile & Settings - semua bisa
  if (route.startsWith("/dashboard/profile") || route.startsWith("/dashboard/settings")) {
    return true;
  }

  // Properties
  if (route.startsWith("/dashboard/properties")) {
    return hasAnyPermission(userRole, ["manage_own_properties", "manage_all_properties", "view_all_properties"]);
  }

  // CRM
  if (route.startsWith("/dashboard/crm")) {
    return hasAnyPermission(userRole, ["manage_own_crm", "manage_all_crm", "view_all_crm"]);
  }

  // Dashboard utama - semua bisa
  if (route === "/dashboard" || route === "/dashboard/dashboard") {
    return true;
  }

  return true;
}