// components/create-property/steps/StepContact.tsx
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { Users, UserCheck, CreditCard, Lock } from "lucide-react";

interface StepContactProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepContact({ formData, updateFormData, nextStep, prevStep }: StepContactProps) {
  const [agents, setAgents] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function initUserAndAgents() {
      try {
        setLoadingUser(true);
        // 1. Dapatkan user yang sedang login
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setCurrentUser(user);

          // Cek role user dari database
          const { data: userData } = await supabase
            .from("users")
            .select("id, full_name, role, email")
            .eq("id", user.id)
            .maybeSingle();

          const role = (userData?.role || user.user_metadata?.role || "agent").toLowerCase();
          const adminRole = role === "admin" || role === "super_admin" || role === "superadmin";
          setIsAdmin(adminRole);

          // Jika bukan admin (misal Agent), kunci otomatis assigned_to ke user.id
          if (!formData.assigned_to) {
            updateFormData({ assigned_to: user.id });
          }

          // 2. Ambil daftar agen untuk opsi pilihan Admin
          if (adminRole) {
            const { data: agentList } = await supabase
              .from("users")
              .select("id, full_name, email")
              .order("full_name");
            if (agentList) setAgents(agentList);
          }
        }
      } catch (err) {
        console.error("Gagal memuat data user/agen:", err);
      } finally {
        setLoadingUser(false);
      }
    }

    initUserAndAgents();
  }, []);

  const handleChange = (field: string, value: any) => {
    if (field === "owner_identity_type" && value === "TIDAK_ADA") {
      updateFormData({
        owner_identity_type: "TIDAK_ADA",
        owner_identity_number: "",
      });
      return;
    }
    updateFormData({ [field]: value });
  };

  // Nama Agen Aktif untuk Tampilan Terkunci
  const currentAgentName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.email ||
    "Agen Logged-In";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-emerald-600" />
          Kontak Pemilik & Penanggung Jawab
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Lengkapi data identitas pemilik aset dan penanggung jawab listing
        </p>
      </div>

      {/* 📌 SEKSI 1: PENUGASAN AGEN (TERKUNCI UNTUK ROLE AGENT) */}
      <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="assigned_to" className="text-xs font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
            <Users className="w-4 h-4 text-emerald-600" /> Penanggung Jawab Properti (Agen)
          </Label>
          {!isAdmin && (
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 border border-emerald-300/50">
              <Lock className="w-3 h-3" /> Otomatis Terikat ke Akun Anda
            </span>
          )}
        </div>

        {isAdmin ? (
          <Select
            value={formData.assigned_to || currentUser?.id || ""}
            onValueChange={(val) => handleChange("assigned_to", val)}
          >
            <SelectTrigger className="bg-background text-xs h-9">
              <SelectValue placeholder="Pilih agen penanggung jawab..." />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id} className="text-xs">
                  {agent.full_name || agent.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center justify-between bg-background border px-3 py-2 rounded-xl text-xs font-semibold text-foreground shadow-2xs">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {loadingUser ? "Memuat data agen..." : currentAgentName}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              (ID Terkunci)
            </span>
          </div>
        )}
      </div>

      {/* 📌 SEKSI 2: INFORMASI UTAMA PEMILIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="owner_name" className="text-xs font-semibold">Nama Lengkap Pemilik</Label>
          <Input
            id="owner_name"
            placeholder="Contoh: Budi Santoso"
            value={formData.owner_name || ""}
            onChange={(e) => handleChange("owner_name", e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="owner_phone" className="text-xs font-semibold">Nomor Telepon Pemilik</Label>
          <Input
            id="owner_phone"
            placeholder="081234567890"
            value={formData.owner_phone || ""}
            onChange={(e) => handleChange("owner_phone", e.target.value)}
            className="h-9 text-xs font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="owner_whatsapp" className="text-xs font-semibold">Nomor WhatsApp Pemilik</Label>
          <Input
            id="owner_whatsapp"
            placeholder="081234567890"
            value={formData.owner_whatsapp || ""}
            onChange={(e) => handleChange("owner_whatsapp", e.target.value)}
            className="h-9 text-xs font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="owner_email" className="text-xs font-semibold">Email Pemilik (Opsional)</Label>
          <Input
            id="owner_email"
            type="email"
            placeholder="budi@gmail.com"
            value={formData.owner_email || ""}
            onChange={(e) => handleChange("owner_email", e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* 📌 SEKSI 3: IDENTITAS RESMI (KTP / SIM / PASPOR / TIDAK ADA) */}
      <div className="p-4 bg-muted/40 border rounded-2xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <CreditCard className="w-4 h-4 text-blue-600" />
          Dokumen Identitas Pemilik
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="owner_identity_type" className="text-xs">Jenis Identitas</Label>
            <Select
              value={formData.owner_identity_type || "KTP"}
              onValueChange={(val) => handleChange("owner_identity_type", val)}
            >
              <SelectTrigger className="bg-background h-9 text-xs">
                <SelectValue placeholder="Pilih jenis identitas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KTP" className="text-xs">Kartu Tanda Penduduk (KTP)</SelectItem>
                <SelectItem value="SIM" className="text-xs">Surat Izin Mengemudi (SIM)</SelectItem>
                <SelectItem value="PASPOR" className="text-xs">Paspor Republik Indonesia</SelectItem>
                <SelectItem value="TIDAK_ADA" className="text-xs text-amber-600 font-semibold">
                  🚫 Tidak Ada / Belum Ada
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="owner_identity_number" className="text-xs">
              Nomor Identitas{" "}
              {formData.owner_identity_type === "TIDAK_ADA"
                ? "(Tidak Dipilih)"
                : `(${formData.owner_identity_type || "KTP"})`}
            </Label>
            <Input
              id="owner_identity_number"
              disabled={formData.owner_identity_type === "TIDAK_ADA"}
              placeholder={
                formData.owner_identity_type === "TIDAK_ADA"
                  ? "Identitas tidak dilampirkan"
                  : formData.owner_identity_type === "PASPOR"
                  ? "Contoh: A1234567"
                  : "Contoh: 3175020101900001"
              }
              value={
                formData.owner_identity_type === "TIDAK_ADA"
                  ? ""
                  : formData.owner_identity_number || ""
              }
              onChange={(e) => handleChange("owner_identity_number", e.target.value)}
              className="h-9 text-xs font-mono disabled:bg-muted/80 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* 📌 SEKSI 4: ALAMAT & CATATAN PEMILIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="owner_address" className="text-xs font-semibold">Alamat Lengkap Pemilik</Label>
          <Textarea
            id="owner_address"
            placeholder="Jl. Raya Utama No. 123, Jakarta Selatan"
            value={formData.owner_address || ""}
            onChange={(e) => handleChange("owner_address", e.target.value)}
            rows={2}
            className="text-xs leading-relaxed"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="owner_notes" className="text-xs font-semibold">Catatan Khusus Pemilik</Label>
          <Textarea
            id="owner_notes"
            placeholder="Catatan tambahan seperti jam survei lokasi atau harga nett..."
            value={formData.owner_notes || ""}
            onChange={(e) => handleChange("owner_notes", e.target.value)}
            rows={2}
            className="text-xs leading-relaxed"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={prevStep} className="text-xs h-9">
          ← Kembali
        </Button>
        <Button
          onClick={nextStep}
          className="gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
        >
          Preview & Publish →
        </Button>
      </div>
    </div>
  );
}