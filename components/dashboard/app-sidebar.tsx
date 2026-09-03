// components/dashboard/app-sidebar.tsx
"use client";

import { ERPSidebar, type ERPSidebarProps } from "@/components/layout/ERPSidebar";

export interface AppSidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

/**
 * @deprecated Gunakan `ERPSidebar` dari `@/components/layout/ERPSidebar`.
 * Wrapper ini dipertahankan untuk kompatibilitas ke belakang dan delegasi ke ERPSidebar V2.
 */
export function AppSidebar({ onClose, isCollapsed, onToggleCollapse, className }: AppSidebarProps) {
  return (
    <ERPSidebar
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onCloseMobile={onClose}
      className={className}
    />
  );
}