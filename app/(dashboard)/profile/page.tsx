"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, User, Mail, Phone, Building2, Camera, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    email: "",
    phone: "",
    company: "",
    avatar_url: "",
  });

  // ===== FETCH PROFILE (dengan fallback) =====
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        let { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!data && !error) {
          const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || "",
              avatar_url: user.user_metadata?.avatar_url || "",
              role: "viewer",
              phone: "",
              company: "",
            })
            .select()
            .single();

          if (insertError) {
            console.warn("Insert user failed, using fallback:", insertError);
            data = {
              id: user.id,
              full_name: user.user_metadata?.full_name || "",
              email: user.email,
              phone: "",
              company: "",
              avatar_url: user.user_metadata?.avatar_url || "",
            };
          } else {
            data = newUser;
          }
        } else if (error) {
          console.warn("Error fetching user, using fallback:", error);
          data = {
            id: user.id,
            full_name: user.user_metadata?.full_name || "",
            email: user.email,
            phone: "",
            company: "",
            avatar_url: user.user_metadata?.avatar_url || "",
          };
        }

        setProfile({
          id: user.id,
          full_name: data?.full_name || user.user_metadata?.full_name || "",
          email: user.email || "",
          phone: data?.phone || "",
          company: data?.company || "",
          avatar_url: data?.avatar_url || "",
        });
      } catch (error: any) {
        console.error("Error fetching profile:", error);
        toast.error("Gagal memuat profil", { description: error.message || "Coba refresh halaman" });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ===== HANDLE CHANGE =====
  const handleChange = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  // ===== HANDLE AVATAR UPLOAD =====
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
      toast.success("Foto profil berhasil diupdate!");
      router.refresh();
    } catch (error: any) {
      toast.error("Gagal upload foto", { description: error.message });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ===== HANDLE UPDATE PROFILE =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Cek apakah user punya row di users, jika tidak insert dulu
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            email: user.email,
            full_name: profile.full_name,
            phone: profile.phone || null,
            company: profile.company || null,
            avatar_url: profile.avatar_url || null,
            role: "viewer",
          });
        if (insertError) throw insertError;
      } else {
        const { error } = await supabase
          .from("users")
          .update({
            full_name: profile.full_name,
            phone: profile.phone || null,
            company: profile.company || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        if (error) throw error;
      }

      toast.success("Profil berhasil diperbarui!");
      router.refresh();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Gagal update profil", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 text-white hover:bg-white/20"
            >
              <ArrowLeft size={22} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">👤 Profil Saya</h1>
              <p className="text-sm text-white/80">Kelola informasi akun Anda</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {profile.email}
          </Badge>
        </div>
      </div>

      {/* CONTENT */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT - Avatar */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <User size={18} className="text-blue-500" />
                  Foto Profil
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.full_name || "Avatar"}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-5xl text-white font-bold">
                        {profile.full_name?.charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-lg transition"
                  >
                    <Camera size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-3 text-center">
                  Klik ikon kamera untuk upload foto<br />
                  (max 2MB)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT - Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <Sparkles size={18} className="text-yellow-500" />
                  Informasi Akun
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-2">
                    <Mail size={16} className="text-slate-400" />
                    Email
                  </Label>
                  <Input
                    value={profile.email}
                    disabled
                    className="bg-slate-50 border-slate-200"
                  />
                  <p className="text-xs text-slate-400">Email tidak dapat diubah</p>
                </div>

                {/* Nama Lengkap */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="font-medium">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="Nama lengkap Anda"
                    value={profile.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    className="border-blue-200 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Telepon */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-medium flex items-center gap-2">
                    <Phone size={16} className="text-slate-400" />
                    Nomor Telepon
                  </Label>
                  <Input
                    id="phone"
                    placeholder="08123456789"
                    value={profile.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="border-emerald-200 focus:ring-emerald-500"
                  />
                </div>

                {/* Perusahaan */}
                <div className="space-y-2">
                  <Label htmlFor="company" className="font-medium flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" />
                    Perusahaan
                  </Label>
                  <Input
                    id="company"
                    placeholder="Nama perusahaan Anda"
                    value={profile.company}
                    onChange={(e) => handleChange("company", e.target.value)}
                    className="border-purple-200 focus:ring-purple-500"
                  />
                </div>

                {/* Submit */}
                <div className="pt-4 flex gap-3">
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save size={18} className="mr-2" />
                        Simpan Perubahan
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}