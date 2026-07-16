// components/admin/protected-content.tsx
"use client";

import { usePermissions } from "@/hooks/use-permissions";
import type { UserRole, Permission } from "@/types/user.types";
import { hasPermission, hasMinRole } from "@/lib/permissions";

interface ProtectedContentProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
}

export function ProtectedContent({
  children,
  requiredRole,
  requiredPermission,
  fallback,
}: ProtectedContentProps) {
  const { userRole, isLoading } = usePermissions();

  if (isLoading) {
    return <div className="animate-pulse h-8 w-8 bg-muted rounded" />;
  }

  if (requiredRole && !hasMinRole(userRole, requiredRole)) {
    return fallback || null;
  }

  if (requiredPermission && !hasPermission(userRole, requiredPermission)) {
    return fallback || null;
  }

  return <>{children}</>;
}