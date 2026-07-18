"use client";

import { useState, useEffect, useCallback } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { userService } from "@/services/user.service";
import { notificationService } from "@/services/notification.service";
import { supabase } from "@/lib/supabase/client"; // ✅ tambahkan import supabase
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

// ---------- IKON & BADGE ----------
const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  super_admin: <ShieldAlert className="h-4 w-4 text-red-500" />,
  admin: <ShieldCheck className="h-4 w-4 text-blue-500" />,
  agent: <Shield className="h-4 w-4 text-green-500" />,
  marketing: <ShieldEllipsis className="h-4 w-4 text-yellow-500" />,
  viewer: <Eye className="h-4 w-4 text-gray-500" />,
};

const ROLE_BADGE: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
  super_admin: "destructive",
  admin: "default",
  agent: "secondary",
  marketing: "outline",
  viewer: "secondary",
};

// ---------- KOMPONEN UTAMA ----------
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

  const isSuperAdmin = userRole === "super_admin";
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
      setUsers(data);
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

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

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
      toast.success(`Role ${selectedUser.full_name} berhasil diupdate`);
      setShowEditDialog(false);
      fetchUsers();
    } catch {
      toast.error("Gagal update role");
    } finally {
      setSaving(false);
    }
  };

  // ✅ PERBAIKAN: HANDLE DELETE
  const handleDelete = (user: UserWithRole) => {
    // 1. Jangan izinkan hapus Super Admin
    if (user.role === "super_admin") {
      toast.error("Tidak dapat menghapus Super Admin!");
      return;
    }

    // 2. Jangan izinkan hapus diri sendiri
    if (currentUserId && user.id === currentUserId) {
      toast.error("Anda tidak dapat menghapus akun sendiri!");
      return;
    }

    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  // ✅ PERBAIKAN: KONFIRMASI HAPUS
  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    // Validasi ulang
    if (selectedUser.role === "super_admin") {
      toast.error("Tidak dapat menghapus Super Admin!");
      setShowDeleteDialog(false);
      return;
    }

    if (currentUserId && selectedUser.id === currentUserId) {
      toast.error("Anda tidak dapat menghapus akun sendiri!");
      setShowDeleteDialog(false);
      return;
    }

    setDeleting(true);
    try {
      // ✅ Gunakan supabase langsung (bukan userService)
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success(`User ${selectedUser.full_name} berhasil dihapus`);
      setShowDeleteDialog(false);
      fetchUsers(); // refresh list
    } catch (error: any) {
      console.error("Delete error:", error);
      
      // Jika error karena RLS
      if (error.message?.includes("row-level security policy")) {
        toast.error(
          "Gagal hapus user karena kebijakan keamanan (RLS). " +
          "Hubungi administrator untuk menambahkan policy DELETE di Supabase."
        );
      } else {
        toast.error(error.message || "Gagal menghapus user");
      }
    } finally {
      setDeleting(false);
    }
  };

  // ---------- HANDLE SEND NOTIFICATION ----------
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
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getRoleLabel = (role: UserRole) => USER_ROLES[role]?.label || role;

  // ---------- LOADING & AKSES ----------
  if (roleLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Akses Ditolak</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Halaman ini hanya dapat diakses oleh Super Admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- RENDER ----------
  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Manajemen User
          </h1>
          <p className="text-muted-foreground mt-1">Kelola user dan role akses di PLMS</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="px-3 py-1">Total {users.length} user</Badge>
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSendNotification(true)}
              className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              <Bell className="h-4 w-4 mr-2" />
              Kirim Notifikasi
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar User</CardTitle>
          <CardDescription>Semua user yang terdaftar di PLMS</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada user ditemukan</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    // Cek apakah user ini super_admin (jangan tampilkan tombol hapus)
                    const isSuperAdminUser = user.role === "super_admin";
                    const isCurrentUser = currentUserId === user.id;
                    const canDelete = isSuperAdmin && !isSuperAdminUser && !isCurrentUser;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>{getInitials(user.full_name || user.email)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.full_name || "Tanpa Nama"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={ROLE_BADGE[user.role] || "secondary"} className="gap-1">
                            {ROLE_ICONS[user.role]}
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(user)}>
                                <UserCog className="h-4 w-4 mr-2" /> Edit Role
                              </DropdownMenuItem>
                              {canDelete && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(user)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Hapus User
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

      {/* Dialog Edit Role */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role User</DialogTitle>
            <DialogDescription>Ubah role akses untuk {selectedUser?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role Baru</Label>
              <Select value={editingRole} onValueChange={(v) => setEditingRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(USER_ROLES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {ROLE_ICONS[key as UserRole]}
                        {value.label}
                        <span className="text-xs text-muted-foreground">- {value.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
            <Button onClick={handleSaveRole} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Delete */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus User</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus {selectedUser?.full_name}? Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Kirim Notifikasi */}
      <Dialog open={showSendNotification} onOpenChange={setShowSendNotification}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              Kirim Notifikasi
            </DialogTitle>
            <DialogDescription>
              Kirim pengumuman atau instruksi ke agen atau semua user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Penerima */}
            <div className="space-y-2">
              <Label>Penerima</Label>
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
                <SelectTrigger>
                  <SelectValue placeholder="Pilih penerima" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_agents">Semua Agen</SelectItem>
                  <SelectItem value="all_admins">Semua Admin</SelectItem>
                  <SelectItem value="all_users">Semua User</SelectItem>
                  <SelectItem value="specific">Pilih User Spesifik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pilih User Spesifik */}
            {notificationForm.recipient_type === "specific" && (
              <div className="space-y-2">
                <Label>Pilih User</Label>
                <Select
                  value={notificationForm.user_ids[0] || ""}
                  onValueChange={(val) =>
                    setNotificationForm((prev) => ({
                      ...prev,
                      user_ids: val ? [val] : [],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tipe Notifikasi */}
            <div className="space-y-2">
              <Label>Tipe Notifikasi</Label>
              <Select
                value={notificationForm.type}
                onValueChange={(val) =>
                  setNotificationForm((prev) => ({ ...prev, type: val as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">📢 Pengumuman</SelectItem>
                  <SelectItem value="task">📋 Tugas</SelectItem>
                  <SelectItem value="reminder">⏰ Pengingat</SelectItem>
                  <SelectItem value="assignment">👤 Penugasan</SelectItem>
                  <SelectItem value="property_update">🏠 Update Properti</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Judul */}
            <div className="space-y-2">
              <Label htmlFor="notif-title">Judul <span className="text-rose-500">*</span></Label>
              <Input
                id="notif-title"
                placeholder="Contoh: Meeting Agen Besok"
                value={notificationForm.title}
                onChange={(e) =>
                  setNotificationForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            {/* Pesan */}
            <div className="space-y-2">
              <Label htmlFor="notif-message">Pesan <span className="text-rose-500">*</span></Label>
              <Textarea
                id="notif-message"
                placeholder="Tulis pesan notifikasi..."
                value={notificationForm.message}
                onChange={(e) =>
                  setNotificationForm((prev) => ({ ...prev, message: e.target.value }))
                }
                rows={4}
              />
            </div>

            {/* Link (opsional) */}
            <div className="space-y-2">
              <Label htmlFor="notif-link">Link (opsional)</Label>
              <Input
                id="notif-link"
                placeholder="/properties atau /crm/leads/123"
                value={notificationForm.link}
                onChange={(e) =>
                  setNotificationForm((prev) => ({ ...prev, link: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendNotification(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={sendingNotification || !notificationForm.title || !notificationForm.message}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendingNotification ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Kirim Notifikasi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}