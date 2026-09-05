// components/property-detail/PropertyModals.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert, Users, Trash2 } from "lucide-react";

interface StatusConfigItem {
  label: string;
  color: string;
  bg: string;
}

interface AgentOption {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface PropertyModalsProps {
  // Delete Dialog
  showDeleteDialog: boolean;
  onCloseDeleteDialog: () => void;
  onConfirmDelete: () => Promise<void>;
  deleting: boolean;
  propertyTitle: string;

  // Status Dialog
  showStatusDialog: boolean;
  onCloseStatusDialog: () => void;
  currentStatus: string;
  statusConfig: Record<string, StatusConfigItem>;
  onConfirmUpdateStatus: (newStatus: string) => Promise<void>;
  updatingStatus: boolean;

  // Assign Agent Dialog
  showAssignDialog: boolean;
  onCloseAssignDialog: () => void;
  agents: AgentOption[];
  currentAssignedId?: string | null;
  onConfirmAssign: (agentId: string | null) => Promise<void>;
  assigningAgent: boolean;
}

export function PropertyModals({
  showDeleteDialog,
  onCloseDeleteDialog,
  onConfirmDelete,
  deleting,
  propertyTitle,

  showStatusDialog,
  onCloseStatusDialog,
  currentStatus,
  statusConfig,
  onConfirmUpdateStatus,
  updatingStatus,

  showAssignDialog,
  onCloseAssignDialog,
  agents,
  currentAssignedId,
  onConfirmAssign,
  assigningAgent,
}: PropertyModalsProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAssignedId || "unassigned");

  return (
    <>
      {/* 1. DELETE PROPERTY DIALOG */}
      <Dialog open={showDeleteDialog} onOpenChange={onCloseDeleteDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Hapus Properti Ini?</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Tindakan ini permanen. Seluruh data spesifikasi, harga, dan relasi foto properti <b>"{propertyTitle}"</b> akan dihapus.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCloseDeleteDialog}
              disabled={deleting}
              className="w-full sm:w-auto text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={deleting}
              className="w-full sm:w-auto text-xs rounded-xl font-bold flex items-center justify-center gap-1.5"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>{deleting ? "Menghapus..." : "Ya, Hapus Permanen"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. CHANGE STATUS DIALOG */}
      <Dialog open={showStatusDialog} onOpenChange={onCloseStatusDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Ubah Status Publikasi</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pilih status baru untuk visibilitas listing properti ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Properti</Label>
              <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || "")}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${cfg.color.replace('text-', 'bg-')}`} />
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStatus === "published" && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 leading-relaxed">
                Status <b>Dipublikasikan</b> akan menampilkan properti ke katalog publik dan siap dipasarkan.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCloseStatusDialog}
              disabled={updatingStatus}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => onConfirmUpdateStatus(selectedStatus)}
              disabled={updatingStatus}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
            >
              {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              <span>{updatingStatus ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. ASSIGN AGENT DIALOG (SUPER ADMIN ONLY) */}
      <Dialog open={showAssignDialog} onOpenChange={onCloseAssignDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Atur Agen Penanggung Jawab</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Tugaskan agen untuk melayani calon pembeli listing ini.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih Agen</Label>
              <Select value={selectedAgentId} onValueChange={(val) => setSelectedAgentId(val || "unassigned")}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Pilih agen staf" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="unassigned" className="text-xs text-muted-foreground">
                    (Lepas Penugasan Agen)
                  </SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id} className="text-xs">
                      {agent.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCloseAssignDialog}
              disabled={assigningAgent}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => onConfirmAssign(selectedAgentId === "unassigned" ? null : selectedAgentId)}
              disabled={assigningAgent}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
            >
              {assigningAgent ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              <span>{assigningAgent ? "Menugaskan..." : "Simpan Penugasan"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
