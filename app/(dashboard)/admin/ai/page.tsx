"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { userService } from "@/services/user.service";
import { toast } from "sonner";
import {
  ShieldAlert,
  Bot,
  Loader2,
  RefreshCw,
  Power,
  Settings2,
  Calendar,
  Lock,
  Unlock,
  Key,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { UserWithRole } from "@/types/user.types";

interface AIFeature {
  key: string;
  displayName: string;
  description: string;
  category: string;
  enabled: boolean;
  supportsUserOverride: boolean;
  status?: string;
  roleQuotas: Record<string, string | number>;
}

interface AIRental {
  id?: string;
  user_identifier: string;
  feature: string;
  quota_mode: string;
  quota_limit: number | null;
  starts_at: string | null;
  expires_at: string | null;
  enabled: boolean;
}

export default function AdminAIPage() {
  const { userRole, isLoading: roleLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [masterSwitch, setMasterSwitch] = useState<boolean>(true);
  const [features, setFeatures] = useState<AIFeature[]>([]);
  const [rentals, setRentals] = useState<AIRental[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);

  // Dialogs
  const [showMasterDialog, setShowMasterDialog] = useState(false);
  const [showFeatureDialog, setShowFeatureDialog] = useState<AIFeature | null>(null);
  const [showRentalDialog, setShowRentalDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState<AIRental | null>(null);

  // Rental Form
  const [rentalForm, setRentalForm] = useState({
    userId: "",
    featureKey: "",
    quota_mode: "unlimited" as "unlimited" | "limited" | "disabled",
    quota_limit: 10,
    starts_at: "",
    expires_at: "",
    permanent: true,
    reason: "",
  });

  const isSuperAdmin = userRole === "super_admin" || (userRole as string) === "superadmin";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch users for rental mapping
      const usersData = await userService.getAllUsers();
      setUsers(usersData);

      // Fetch AI Settings
      const res = await fetch("/api/admin/ai/settings");
      if (!res.ok) {
         if (res.status === 403) throw new Error("Akses ditolak.");
         throw new Error("Gagal memuat pengaturan AI.");
      }
      const data = await res.json();
      setMasterSwitch(data.masterSwitch);
      setFeatures(data.features || []);
      setRentals(data.rentals || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin, loadData]);

  // Mutations
  const handleToggleMaster = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "master_switch", enabled: !masterSwitch }),
      });
      if (!res.ok) throw new Error("Gagal mengubah Master Switch.");
      
      toast.success(`AI Master Switch telah di${!masterSwitch ? 'aktifkan' : 'matikan'}.`);
      setMasterSwitch(!masterSwitch);
      setShowMasterDialog(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeature = async (featureKey: string, enabled: boolean) => {
    try {
      const res = await fetch("/api/admin/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feature_toggle", featureKey, enabled }),
      });
      if (!res.ok) throw new Error("Gagal mengubah fitur AI.");
      
      toast.success("Pengaturan fitur berhasil disimpan.");
      setFeatures(features.map(f => f.key === featureKey ? { ...f, enabled } : f));
      setShowFeatureDialog(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateRental = async () => {
    if (!rentalForm.userId || !rentalForm.featureKey) {
      toast.error("User dan Fitur wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "user_rental",
          userId: rentalForm.userId,
          featureKey: rentalForm.featureKey,
          quota_mode: rentalForm.quota_mode,
          quota_limit: rentalForm.quota_mode === "limited" ? Number(rentalForm.quota_limit) : null,
          starts_at: rentalForm.permanent ? null : rentalForm.starts_at || null,
          expires_at: rentalForm.permanent ? null : rentalForm.expires_at || null,
          reason: rentalForm.reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat rental.");

      toast.success("Override / Rental berhasil ditambahkan.");
      setShowRentalDialog(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeRental = async () => {
    if (!showRevokeDialog) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "user_rental",
          userId: showRevokeDialog.user_identifier,
          featureKey: showRevokeDialog.feature,
          revoke: true,
          reason: "Revoked by Super Admin",
        }),
      });
      if (!res.ok) throw new Error("Gagal mencabut rental.");

      toast.success("Rental berhasil dicabut.");
      setShowRevokeDialog(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-4">
        <Card className="max-w-md text-center border-rose-500/30 rounded-2xl shadow-xs">
          <CardContent className="pt-6 space-y-3">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Akses Ditolak</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Halaman Control Center AI ini eksklusif untuk Super Admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeUsersCount = new Set(rentals.filter(r => r.enabled).map(r => r.user_identifier)).size;
  const expiringRentalsCount = rentals.filter(r => r.enabled && r.expires_at && new Date(r.expires_at as string) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pb-12 text-xs sm:text-sm">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 text-white p-5 rounded-2xl shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
              <BrainCircuit className="h-6 w-6 text-emerald-400" /> AI Control Center
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/50 text-emerald-300 bg-emerald-900/30">
              Super Admin
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi tersentralisasi, manajemen kuota runtime, dan akses fitur.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-9 text-xs rounded-xl bg-slate-900 border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border shadow-sm rounded-xl overflow-hidden relative">
          <div className={cn("absolute inset-0 opacity-10", masterSwitch ? "bg-emerald-500" : "bg-rose-500")} />
          <CardContent className="p-4 relative z-10 flex flex-col items-start">
            <div className="flex justify-between w-full items-center mb-2">
              <span className="text-xs font-semibold text-muted-foreground">Master Status</span>
              <Power className={cn("w-4 h-4", masterSwitch ? "text-emerald-500" : "text-rose-500")} />
            </div>
            <div className="flex items-center justify-between w-full">
              <span className={cn("text-xl font-bold", masterSwitch ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {masterSwitch ? "ONLINE" : "OFFLINE"}
              </span>
              <Switch 
                checked={masterSwitch} 
                onCheckedChange={() => setShowMasterDialog(true)}
                className="scale-90"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">Active AI Users</span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{activeUsersCount}</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">Total Rentals</span>
              <Key className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{rentals.filter(r => r.enabled).length}</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">Expiring Rentals (7d)</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{expiringRentalsCount}</p>
          </CardContent>
        </Card>
      </div>

      {loading && !features.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mb-2" />
          <span className="text-xs">Memuat konfigurasi...</span>
        </div>
      ) : (
        <>
          {/* FEATURES GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-600" /> AI Features Registry
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature) => (
                <Card key={feature.key} className={cn("border shadow-sm rounded-xl overflow-hidden transition-all", !feature.enabled && "opacity-70 grayscale")}>
                  <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold">{feature.displayName}</CardTitle>
                        <CardDescription className="text-[10px] font-mono mt-0.5">{feature.key}</CardDescription>
                      </div>
                      <Switch 
                        checked={feature.enabled} 
                        onCheckedChange={(checked) => {
                          if (!checked) setShowFeatureDialog(feature);
                          else handleToggleFeature(feature.key, true);
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                      {feature.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Status</p>
                        <Badge variant="outline" className={cn(
                          "text-[10px] font-semibold border-transparent",
                          feature.status === "active" ? "bg-emerald-500/15 text-emerald-700" :
                          feature.status === "disabled" ? "bg-rose-500/15 text-rose-700" :
                          "bg-amber-500/15 text-amber-700"
                        )}>
                          {String(feature.status || "Unknown").toUpperCase()}
                        </Badge>
                      </div>
                      <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Category</p>
                        <span className="text-xs font-medium capitalize">{feature.category}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground font-bold">Role Quotas (Daily)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(feature.roleQuotas).map(([role, limit]) => (
                          <div key={role} className="flex items-center gap-1.5 text-[10px] bg-background border px-2 py-1 rounded-md shadow-2xs">
                            <span className="font-semibold capitalize">{role.replace("_", " ")}</span>
                            <span className={cn("font-mono", limit === "disabled" ? "text-rose-500" : limit === "unlimited" ? "text-emerald-500" : "text-blue-500")}>
                              {String(limit)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* RENTALS TABLE */}
          <Card className="border shadow-sm rounded-2xl overflow-hidden mt-6">
            <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-600" /> AI User Overrides & Rentals
                </CardTitle>
                <CardDescription className="text-xs mt-1">Kelola akses AI khusus dan batas limit tambahan per individu.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowRentalDialog(true)} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm">
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Rental
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {rentals.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Key className="h-8 w-8 mx-auto opacity-20 mb-2" />
                  <p className="text-xs font-semibold">Belum ada rental AI aktif</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-[11px] font-bold py-3">Pengguna</TableHead>
                        <TableHead className="text-[11px] font-bold py-3">Fitur AI</TableHead>
                        <TableHead className="text-[11px] font-bold py-3">Kuota Tambahan</TableHead>
                        <TableHead className="text-[11px] font-bold py-3">Masa Berlaku</TableHead>
                        <TableHead className="text-[11px] font-bold py-3">Status</TableHead>
                        <TableHead className="text-[11px] font-bold py-3 text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {rentals.map((rental) => {
                        const user = users.find(u => u.id === rental.user_identifier);
                        
                        let validity = "Permanen";
                        if (rental.starts_at || rental.expires_at) {
                           const start = rental.starts_at ? new Date(rental.starts_at).toLocaleDateString("id") : "Sekarang";
                           const end = rental.expires_at ? new Date(rental.expires_at).toLocaleDateString("id") : "Selamanya";
                           validity = `${start} - ${end}`;
                        }

                        const isExpired = rental.expires_at && new Date(rental.expires_at) < new Date();
                        const isActive = rental.enabled && !isExpired;

                        return (
                          <TableRow key={rental.id} className="hover:bg-muted/30">
                            <TableCell className="py-3 font-medium">
                              {user?.full_name || rental.user_identifier}
                              <div className="text-[10px] text-muted-foreground font-mono">{user?.email || "Unknown"}</div>
                            </TableCell>
                            <TableCell className="py-3 font-mono text-[10px]">{rental.feature}</TableCell>
                            <TableCell className="py-3 capitalize">
                              {rental.quota_mode === "limited" ? `${rental.quota_limit} / Hari` : rental.quota_mode}
                            </TableCell>
                            <TableCell className="py-3 text-[10px] text-muted-foreground">{validity}</TableCell>
                            <TableCell className="py-3">
                              <Badge variant="outline" className={cn(
                                "text-[10px] font-bold",
                                isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              )}>
                                {isActive ? "Aktif" : (isExpired ? "Kadaluarsa" : "Dicabut")}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              {isActive && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setShowRevokeDialog(rental)}
                                  className="h-7 px-2 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Cabut
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* MASTER SWITCH CONFIRMATION DIALOG */}
      <Dialog open={showMasterDialog} onOpenChange={setShowMasterDialog}>
        <DialogContent className="max-w-sm rounded-2xl p-5 border-rose-500/30 shadow-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Peringatan Kritis
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground mt-2 font-medium">
              Anda akan mematikan AI Master Switch.
              <br/><br/>
              Ini akan seketika <strong>memutus semua akses AI</strong> di seluruh sistem untuk semua agent dan pengguna, apa pun peran dan kuota rental mereka.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setShowMasterDialog(false)} className="h-8 rounded-xl text-xs">
              Batal
            </Button>
            <Button variant="destructive" size="sm" onClick={handleToggleMaster} disabled={saving} className="h-8 rounded-xl text-xs bg-rose-600 hover:bg-rose-700 font-bold">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Power className="w-3.5 h-3.5 mr-1" />}
              Ya, Matikan Total
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FEATURE DISABLE DIALOG */}
      <Dialog open={!!showFeatureDialog} onOpenChange={(open) => !open && setShowFeatureDialog(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-5">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-bold text-amber-600 flex items-center gap-2">
              <Power className="w-4 h-4" /> Matikan Fitur AI
            </DialogTitle>
            <DialogDescription className="text-xs mt-2">
              Mematikan <strong className="text-foreground">{showFeatureDialog?.displayName}</strong> akan menolak semua permintaan generasi AI ke endpoint terkait untuk semua pengguna.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowFeatureDialog(null)} className="h-8 rounded-xl text-xs">Batal</Button>
            <Button variant="destructive" size="sm" onClick={() => handleToggleFeature(String(showFeatureDialog?.key), false)} className="h-8 rounded-xl text-xs">Matikan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REVOKE RENTAL DIALOG */}
      <Dialog open={!!showRevokeDialog} onOpenChange={(open) => !open && setShowRevokeDialog(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-5">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Cabut Rental AI
            </DialogTitle>
            <DialogDescription className="text-xs mt-2">
              Cabut rental <strong className="text-foreground font-mono">{showRevokeDialog?.feature}</strong> secara permanen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowRevokeDialog(null)} className="h-8 rounded-xl text-xs">Batal</Button>
            <Button variant="destructive" size="sm" onClick={handleRevokeRental} disabled={saving} className="h-8 rounded-xl text-xs">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Cabut Akses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE RENTAL DIALOG */}
      <Dialog open={showRentalDialog} onOpenChange={(open) => {
        if (!open) setShowRentalDialog(false);
      }}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogHeader className="pb-2 border-b border-border/50">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" /> Berikan Rental AI
            </DialogTitle>
            <DialogDescription className="text-xs">Berikan izin ekstra atau bypass kuota untuk individu tertentu.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih Pengguna</Label>
              <Select value={rentalForm.userId || ""} onValueChange={v => setRentalForm({...rentalForm, userId: v as string})}>
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent className="max-h-56">
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.full_name || u.email} <span className="text-muted-foreground">({u.role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih Fitur AI</Label>
              <Select value={rentalForm.featureKey || ""} onValueChange={v => setRentalForm({...rentalForm, featureKey: v as string})}>
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {features.filter(f => f.supportsUserOverride).map(f => (
                    <SelectItem key={f.key} value={f.key} className="text-xs font-mono">
                      {f.displayName} ({f.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mode Kuota</Label>
                <Select value={rentalForm.quota_mode} onValueChange={(v: any) => setRentalForm({...rentalForm, quota_mode: v})}>
                  <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited" className="text-xs">Unlimited</SelectItem>
                    <SelectItem value="limited" className="text-xs">Limited Daily</SelectItem>
                    <SelectItem value="disabled" className="text-xs">Blokir Akses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {rentalForm.quota_mode === "limited" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Limit Per Hari</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    value={rentalForm.quota_limit} 
                    onChange={e => setRentalForm({...rentalForm, quota_limit: Number(e.target.value)})}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 p-3 bg-muted/40 rounded-xl border border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Akses Permanen</Label>
                <Switch checked={rentalForm.permanent} onCheckedChange={c => setRentalForm({...rentalForm, permanent: c})} />
              </div>
              
              {!rentalForm.permanent && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">Aktif Sejak (Opsional)</Label>
                    <Input type="date" value={rentalForm.starts_at || ""} onChange={e => setRentalForm({...rentalForm, starts_at: e.target.value})} className="h-8 text-xs rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">Berakhir Pada</Label>
                    <Input type="date" value={rentalForm.expires_at || ""} onChange={e => setRentalForm({...rentalForm, expires_at: e.target.value})} className="h-8 text-xs rounded-lg" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan Internal / Alasan</Label>
              <Textarea 
                placeholder="Contoh: Insentif performa top sales bulan Agustus"
                value={rentalForm.reason}
                onChange={e => setRentalForm({...rentalForm, reason: e.target.value})}
                className="text-xs min-h-[60px] rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={() => setShowRentalDialog(false)} className="h-8 rounded-xl text-xs">Batal</Button>
            <Button size="sm" onClick={handleCreateRental} disabled={saving} className="h-8 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Berikan Rental
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
