"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { userService } from "@/services/user.service";
import { notificationService } from "@/services/notification.service";
import { supabase } from "@/lib/supabase/client";
import { USER_ROLES, type UserRole, type UserWithRole } from "@/types/user.types";
import { toast } from "sonner";
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  Search,
  Loader2,
  MoreHorizontal,
  UserCog,
  Trash2,
  Eye,
  Bell,
  UserCheck,
  UserPlus,
  RefreshCw,
  Building2,
  Sparkles,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------- IKON & BADGE CONFIG ----------
const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  super_admin: <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />,
  admin: <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />,
  agent: <Shield className="h-3.5 w-3.5 text-emerald-500" />,
  marketing: <ShieldEllipsis className="h-3.5 w-3.5 text-amber-500" />,
  viewer: <Eye className="h-3.5 w-3.5 text-slate-400" />,
};

const ROLE_BADGE_STYLE: Record<UserRole, string> = {
  super_admin: "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-400",
  admin: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-400",
  agent: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400",
  marketing: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400",
  viewer: "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:bg-slate-800 dark:text-slate-400",
};

export default function AdminUsersPage() {
  const { userRole, isLoading: roleLoading } = usePermissions();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole>("viewer");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Notification states
  const [showSendNotification, setShowSendNotification] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    recipient_type: "all_agents" as "specific" | "all_agents" | "all_admins" | "all_users",
    user_ids: [] as string[],
    type: "announcement" as "task" | "reminder" | "announcement" | "assignment" | "property_update",
    title: "",
    message: "",
    link: "",
  });
  const [sendingNotification, setSendingNotification] = useState(false);

  const isSuperAdmin = userRole === "super_admin"
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Ambil current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id || null);
    };
    getCurrentUser();
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getAllUsers();
      setUsers(data || []);
    } catch (error) {
      toast.error("Gagal memuat daftar user");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchUsers();
    }
  }, [userRole, fetchUsers]);

  // Metric Stats
  const metrics = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((u) => u.role === "super_admin" || (u.role as any) === "superadmin").length;
    const admins = users.filter((u) => u.role === "admin").length;
    const agents = users.filter((u) => u.role === "agent").length;
    const viewers = users.filter((u) => u.role === "viewer").length;
    return { total, superAdmins, admins, agents, viewers };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.role?.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  const handleEdit = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditingRole(user.role);
    setShowEditDialog(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await userService.updateUserRole(selectedUser.id, editingRole);
      toast.success(`Role ${selectedUser.full_name || selectedUser.email} berhasil diperbarui`);
      setShowEditDialog(false);
      fetchUsers();
    } catch {
      toast.error("Gagal memperbarui role");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user: UserWithRole) => {
    if (user.role === "super_admin" || (user.role as any) === "superadmin") {
      toast.error("Tidak dapat menghapus akun Super Admin!");
      return;
    }

    if (currentUserId && user.id === currentUserId) {
      toast.error("Anda tidak dapat menghapus akun sendiri!");
      return;
    }

    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  // 🚀 KONFIRMASI HAPUS TOTAL VIA API SERVER
  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: selectedUser.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        // Tampilkan error dari API secara halus tanpa melempar (throw) Exception
        toast.error("Gagal Menghapus User", {
          description: json.error || "Terjadi kesalahan pada server.",
        });
        return;
      }

      toast.success(`User ${selectedUser.full_name || selectedUser.email} telah dihapus permanen!`);
      setShowDeleteDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Gagal terhubung ke server");
    } finally {
      setDeleting(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      toast.error("Judul dan pesan wajib diisi");
      return;
    }

    setSendingNotification(true);
    try {
      await notificationService.sendNotification({
        recipient_type: notificationForm.recipient_type,
        user_ids: notificationForm.recipient_type === "specific" ? notificationForm.user_ids : undefined,
        type: notificationForm.type,
        title: notificationForm.title,
        message: notificationForm.message,
        link: notificationForm.link || undefined,
      });
      toast.success("Notifikasi berhasil dikirim!");
      setShowSendNotification(false);
      setNotificationForm({
        recipient_type: "all_agents",
        user_ids: [],
        type: "announcement",
        title: "",
        message: "",
        link: "",
      });
    } catch (error: any) {
      toast.error("Gagal mengirim notifikasi", { description: error.message });
    } finally {
      setSendingNotification(false);
    }
  };

  const getInitials = (name: string) =>
    (name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getRoleLabel = (role: UserRole) => USER_ROLES[role]?.label || role.replace("_", " ");

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
            <h3 className="text-base font-bold text-foreground">Akses Terbatas</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Modul Manajemen User dan Kontrol Hak Akses Sistem ini hanya dapat diakses oleh Super Admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 sm:px-6 pb-12 text-xs sm:text-sm">
      
      {/* 🔴 HEADER BARIS RINGKAS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card/85 backdrop-blur-md border border-border/70 p-4 rounded-2xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <UserCog className="h-5 w-5 text-emerald-600" /> Manajemen User & Akses
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600">
              {users.length} Akun
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Atur hierarki otorisasi role, kirim broadcast pesan, dan kelola akun pengguna PLMS.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            className="h-8 text-xs rounded-xl gap-1.5 border-border/80 cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", loading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowSendNotification(true)}
            className="h-8 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-2xs cursor-pointer"
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Kirim Notifikasi</span>
          </Button>
        </div>
      </div>

      {/* 🟢 METRIC BENTO GRID (4 KOLOM RINGKAS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border shadow-2xs rounded-xl bg-card p-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">Total Pengguna</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold font-mono text-foreground mt-1">{metrics.total}</p>
        </Card>

        <Card className="border shadow-2xs rounded-xl bg-card p-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">Tim Agen</span>
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{metrics.agents}</p>
        </Card>

        <Card className="border shadow-2xs rounded-xl bg-card p-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">Admin / Super Admin</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
            {metrics.admins + metrics.superAdmins}
          </p>
        </Card>

        <Card className="border shadow-2xs rounded-xl bg-card p-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">Klien / Viewer</span>
            <Eye className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-lg font-bold font-mono text-slate-600 dark:text-slate-300 mt-1">{metrics.viewers}</p>
        </Card>
      </div>

      {/* 🟢 TOOLBAR SEARCH & DIRECTORY TABLE */}
      <Card className="border shadow-2xs rounded-2xl bg-card overflow-hidden">
        <CardHeader className="p-3.5 border-b bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2 text-foreground">
              <Users className="w-4 h-4 text-emerald-600" /> Direktori Pengguna Sistem
            </CardTitle>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, atau role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-xl bg-background border-border/80"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <span className="text-xs font-medium">Memuat data pengguna...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground space-y-1">
              <Users className="h-8 w-8 mx-auto opacity-30 text-slate-400" />
              <p className="text-xs font-semibold">Tidak ada user ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border/60">
                    <TableHead className="text-[11px] font-bold py-2.5">User Profile</TableHead>
                    <TableHead className="text-[11px] font-bold py-2.5">Email</TableHead>
                    <TableHead className="text-[11px] font-bold py-2.5">Role Akses</TableHead>
                    <TableHead className="text-[11px] font-bold py-2.5">Tanggal Registrasi</TableHead>
                    <TableHead className="text-[11px] font-bold py-2.5 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40 text-xs">
                  {filteredUsers.map((user) => {
                    const isSuperAdminUser = user.role === "super_admin" 
                    const isCurrentUser = currentUserId === user.id;
                    const canDelete = isSuperAdmin && !isSuperAdminUser && !isCurrentUser;

                    return (
                      <TableRow key={user.id} className="hover:bg-muted/30 transition">
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 border border-border/80">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold">
                                {getInitials(user.full_name || user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground line-clamp-1">
                                {user.full_name || "Tanpa Nama"}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[9px] font-bold text-emerald-600 font-mono">(Akun Anda)</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 font-mono text-[11px] text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs capitalize",
                              ROLE_BADGE_STYLE[user.role] || ROLE_BADGE_STYLE.viewer
                            )}
                          >
                            {ROLE_ICONS[user.role] || ROLE_ICONS.viewer}
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 font-mono text-[11px] text-muted-foreground">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground h-7 w-7 transition cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36 rounded-xl text-xs">
                              <DropdownMenuItem onClick={() => handleEdit(user)} className="gap-2 cursor-pointer">
                                <UserCog className="h-3.5 w-3.5 text-purple-600" /> Edit Role
                              </DropdownMenuItem>
                              {canDelete && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(user)}
                                  className="gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Hapus User
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* 🟢 DIALOG EDIT ROLE */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-sm rounded-2xl p-5 text-xs">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <UserCog className="w-4 h-4 text-purple-600" /> Edit Role User
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah hak akses otorisasi untuk <strong className="text-foreground">{selectedUser?.full_name || selectedUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih Role Akses Baru</Label>
              <Select value={editingRole} onValueChange={(v) => setEditingRole(v as UserRole)}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {Object.entries(USER_ROLES).map(([key, value]) => (
                    <SelectItem key={key} value={key} className="text-xs cursor-pointer">
                      <div className="flex items-center gap-2">
                        {ROLE_ICONS[key as UserRole]}
                        <span className="font-bold">{value.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(false)} className="h-8 text-xs rounded-xl">
              Batal
            </Button>
            <Button onClick={handleSaveRole} disabled={saving} size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔴 DIALOG KONFIRMASI HAPUS (PERMANEN API SERVER) */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm rounded-2xl p-5 text-xs">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Hapus User Permanen
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Yakin ingin menghapus <strong className="text-foreground">{selectedUser?.full_name || selectedUser?.email}</strong>? User akan dihapus secara permanen dari Supabase Auth dan tidak akan pernah bisa login lagi.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)} className="h-8 text-xs rounded-xl">
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold gap-1.5 cursor-pointer"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Hapus Permanen</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔵 DIALOG KIRIM NOTIFIKASI BROADCAST */}
      <Dialog open={showSendNotification} onOpenChange={setShowSendNotification}>
        <DialogContent className="max-w-md rounded-2xl p-5 text-xs">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" /> Broadcast Notifikasi Tim
            </DialogTitle>
            <DialogDescription className="text-xs">
              Kirim instruksi, pengumuman, atau pengingat tugas ke akun pengguna.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Penerima Pesan</Label>
                <Select
                  value={notificationForm.recipient_type}
                  onValueChange={(val) =>
                    setNotificationForm((prev) => ({
                      ...prev,
                      recipient_type: val as any,
                      user_ids: [],
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="all_agents">Semua Agen</SelectItem>
                    <SelectItem value="all_admins">Semua Admin</SelectItem>
                    <SelectItem value="all_users">Semua User</SelectItem>
                    <SelectItem value="specific">Pilih User Spesifik</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Tipe Notifikasi</Label>
                <Select
                  value={notificationForm.type}
                  onValueChange={(val) =>
                    setNotificationForm((prev) => ({ ...prev, type: val as any }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="announcement">📢 Pengumuman</SelectItem>
                    <SelectItem value="task">📋 Tugas</SelectItem>
                    <SelectItem value="reminder">⏰ Pengingat</SelectItem>
                    <SelectItem value="assignment">👤 Penugasan</SelectItem>
                    <SelectItem value="property_update">🏠 Update Properti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {notificationForm.recipient_type === "specific" && (
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Pilih User Spesifik</Label>
                <Select
                  value={notificationForm.user_ids[0] || ""}
                  onValueChange={(val) =>
                    setNotificationForm((prev) => ({
                      ...prev,
                      user_ids: val ? [val] : [],
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue placeholder="Pilih user" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Judul Notifikasi <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Contoh: Meeting Evaluasi Agen"
                value={notificationForm.title}
                onChange={(e) => setNotificationForm((prev) => ({ ...prev, title: e.target.value }))}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Isi Pesan <span className="text-rose-500">*</span></Label>
              <Textarea
                placeholder="Tulis pesan notifikasi..."
                value={notificationForm.message}
                onChange={(e) => setNotificationForm((prev) => ({ ...prev, message: e.target.value }))}
                rows={3}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowSendNotification(false)} className="h-8 text-xs rounded-xl">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSendNotification}
              disabled={sendingNotification || !notificationForm.title || !notificationForm.message}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold gap-1.5"
            >
              {sendingNotification ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>Kirim Notifikasi</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}