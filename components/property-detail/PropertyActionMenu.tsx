// components/property-detail/PropertyActionMenu.tsx
"use client";

import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Pencil,
  Copy,
  Share2,
  Trash2,
  Users,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PropertyActionMenuProps {
  propertyId: string;
  canEdit: boolean;
  isSuperAdmin: boolean;
  onOpenStatusDialog: () => void;
  onOpenAssignDialog: () => void;
  onOpenDeleteDialog: () => void;
  onDuplicate: () => void;
  onShare: () => void;
}

export function PropertyActionMenu({
  propertyId,
  canEdit,
  isSuperAdmin,
  onOpenStatusDialog,
  onOpenAssignDialog,
  onOpenDeleteDialog,
  onDuplicate,
  onShare,
}: PropertyActionMenuProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onShare}
        className="h-9 px-3 rounded-xl border-border/80 text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>Bagikan</span>
      </Button>

      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-xl border border-border/80 p-2 hover:bg-accent focus:outline-none h-9 w-9 cursor-pointer">
            <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-lg border-border/80">
            <DropdownMenuItem
              onClick={() => router.push(`/properties/${propertyId}/edit`)}
              className="text-xs font-medium cursor-pointer rounded-lg py-2"
            >
              <Pencil className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <span>Edit Properti</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={onOpenStatusDialog}
              className="text-xs font-medium cursor-pointer rounded-lg py-2"
            >
              <Clock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <span>Ubah Status Publikasi</span>
            </DropdownMenuItem>

            {isSuperAdmin && (
              <DropdownMenuItem
                onClick={onOpenAssignDialog}
                className="text-xs font-medium cursor-pointer rounded-lg py-2"
              >
                <Users className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <span>Atur Agen Penanggung Jawab</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={onDuplicate}
              className="text-xs font-medium cursor-pointer rounded-lg py-2"
            >
              <Copy className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <span>Duplikasi Properti</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={onOpenDeleteDialog}
              className="text-xs font-medium cursor-pointer rounded-lg py-2 text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-500/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              <span>Hapus Permanen</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
