// types/user.types.ts

export type UserRole = "super_admin" | "admin" | "agent" | "marketing" | "viewer";

export const USER_ROLES: Record<UserRole, { label: string; description: string; level: number }> = {
  super_admin: {
    label: "Super Admin",
    description: "Akses penuh ke seluruh sistem",
    level: 100,
  },
  admin: {
    label: "Admin",
    description: "Kelola semua data, kecuali user & role",
    level: 80,
  },
  agent: {
    label: "Agent",
    description: "Kelola properti dan CRM sendiri",
    level: 50,
  },
  marketing: {
    label: "Marketing",
    description: "View properti, kelola CRM (tidak edit/delete)",
    level: 30,
  },
  viewer: {
    label: "Viewer",
    description: "Hanya baca semua data",
    level: 10,
  },
};

export type Permission =
  | "manage_users"
  | "manage_roles"
  | "manage_all_properties"
  | "manage_own_properties"
  | "view_all_properties"
  | "view_own_properties"
  | "manage_all_crm"
  | "manage_own_crm"
  | "view_all_crm"
  | "view_own_crm"
  | "manage_media"
  | "export_data"
  | "view_reports";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    "manage_users",
    "manage_roles",
    "manage_all_properties",
    "manage_all_crm",
    "manage_media",
    "export_data",
    "view_reports",
  ],
  admin: [
    "manage_all_properties",
    "manage_all_crm",
    "manage_media",
    "export_data",
    "view_reports",
  ],
  agent: [
    "manage_own_properties",
    "manage_own_crm",
    "manage_media",
    "view_reports",
  ],
  marketing: [
    "view_all_properties",
    "manage_own_crm",
    "view_reports",
  ],
  viewer: [
    "view_all_properties",
    "view_own_crm",
  ],
};

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}