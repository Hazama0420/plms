// app/register/agent/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Upload,
  Briefcase,
  Car,
  FileText,
  Clock,
  ShieldCheck,
  Eye,
  EyeOff,
  Share2,
  Building2,
  ArrowLeft,
} from "lucide-react";

const SOCIAL_MEDIA_OPTIONS = ["Instagram", "TikTok", "Facebook", "LinkedIn", "Threads"];

const EXPERIENCE_OPTIONS = [
  { value: "Tidak ada", label: "Tidak Ada" },
  { value: "<1 Tahun", label: "< 1 Tahun" },
  { value: "1-3 Tahun", label: "1 - 3 Tahun" },
  { value: ">3 Tahun", label: "> 3 Tahun" },
];

const VEHICLE_OPTIONS = [
  { value: "Motor", label: "Motor" },
  { value: "Mobil", label: "Mobil" },
  { value: "Keduanya", label: "Keduanya (Motor & Mobil)" },
  { value: "Tidak memiliki kendaraan", label: "Tidak Memiliki Kendaraan" },
];

export default function RegisterAgentPage() {
  const router = useRouter();

  // State Form Khusus Agen
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [address, setAddress] = useState("");
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [selectedSocials, setSelectedSocials] = useState<string[]>([]);
  const [experience, setExperience] = useState("Tidak ada");
  const [vehicle, setVehicle] = useState("Motor");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [agentPendingSubmitted, setAgentPendingSubmitted] = useState(false);

  const handleSocialToggle = (social: string) => {
    setSelectedSocials((prev) =>
      prev.includes(social) ? prev.filter((s) => s !== social) : [...prev, social]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok!");
      return;
    }

    if (password.length < 6) {
      toast.error("Password minimal harus 6 karakter.");
      return;
    }

    if (!ktpFile) {
      toast.error("Mohon unggah foto KTP Anda terlebih dahulu.");
      return;
    }

    setLoading(true);

    try {
      let ktpPublicUrl = "";

      // 1. Upload KTP ke Supabase Storage
      if (ktpFile) {
        const fileExt = ktpFile.name.split(".").pop();
        const fileName = `ktp_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `ktp-uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("property-media")
          .upload(filePath, ktpFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("property-media")
            .getPublicUrl(filePath);
          ktpPublicUrl = urlData.publicUrl;
        }
      }

      // 2. Sign Up di Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: "agent",
            status: "pending",
            is_approved: false,
          },
        },
      });

      if (authError) throw authError;

      // 3. Simpan Profil ke Tabel 'users' Database
      if (authData.user) {
        const userPayload: any = {
          id: authData.user.id,
          email: email,
          full_name: fullName,
          phone: phone,
          role: "agent",
          status: "pending",
          address: address,
          ktp_url: ktpPublicUrl,
          social_media: selectedSocials,
          experience: experience,
          vehicle: vehicle,
          join_reason: reason,
          updated_at: new Date().toISOString(),
        };

        const { error: dbError } = await supabase.from("users").upsert(userPayload);
        if (dbError) {
          console.warn("Detail profil agen tersimpan di Metadata tetapi gagal di tabel users:", dbError.message);
        }
      }

      setAgentPendingSubmitted(true);
      toast.success("Pendaftaran Agen berhasil dikirim! Menunggu konfirmasi Admin.");
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan pendaftaran agen. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // TAMPILAN PENDING KONFIRMASI ADMIN
  if (agentPendingSubmitted) {
    return (
      <div
        className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat select-none"
        style={{
          backgroundImage: "url('/bg-login.webp')",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />

        <Card className="relative z-10 max-w-md w-full border border-white/20 shadow-2xl rounded-3xl bg-slate-900/75 backdrop-blur-xl text-slate-100 overflow-hidden text-center p-6 sm:p-8 space-y-5 my-auto">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-xl font-extrabold text-white">
              Pendaftaran Agen Terkirim!
            </CardTitle>
            <CardDescription className="text-xs text-slate-300 leading-relaxed">
              Terima kasih, <span className="font-bold text-emerald-400">{fullName}</span>. Berkas dan formulir Anda sedang dalam proses tinjauan oleh <span className="font-bold text-white">Tim Administrator Inland Property</span>.
            </CardDescription>
          </div>

          <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-left space-y-2 text-xs text-amber-200 backdrop-blur-md">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> Status Akun: Menunggu Konfirmasi
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Anda akan menerima pemberitahuan via Email atau WhatsApp setelah akun Anda disetujui dan diaktifkan oleh Admin.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              onClick={() => router.push("/login")}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              Kembali ke Halaman Login
            </Button>
            <Button
              variant="outline"
              onClick={() => setAgentPendingSubmitted(false)}
              className="w-full h-9 text-xs font-semibold rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 cursor-pointer"
            >
              Isi Formulir Baru
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat select-none py-10"
      style={{
        backgroundImage: "url('/bg-login.webp')",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />

      <Card className="relative z-10 max-w-xl w-full border border-white/20 shadow-2xl rounded-3xl bg-slate-900/70 backdrop-blur-xl text-slate-100 overflow-hidden my-auto transition-all">
        <div className="h-1.5 w-full bg-emerald-500/90 shadow-sm" />

        <CardHeader className="text-center space-y-3 pt-6 pb-4 px-6 sm:px-8 border-b border-white/10">
          {/* TOMBOL DAFTAR MEMBER DI KIRI ATAS KARTU */}
          <div className="flex items-center justify-start">
            <Link
              href="/register"
              className="text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5 transition-all shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" /> Daftar Member
            </Link>
          </div>

          <div className="mx-auto flex items-center justify-center pt-1">
            <Image
              src="/logo.png"
              alt="Inland Property Logo"
              width={150}
              height={55}
              className="h-11 w-auto object-contain drop-shadow-md"
              priority
            />
          </div>

          <div>
            <CardTitle className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-400" /> Pendaftaran <span className="text-emerald-400">Agen Inland</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-300/80 font-medium mt-0.5">
              Bergabunglah sebagai agen kemitraan resmi Inland Property
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs text-emerald-200 flex items-start gap-2.5 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Verifikasi & Konfirmasi Admin</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Permohonan pendaftaran Anda memerlukan peninjauan oleh Tim Admin sebelum akun diaktifkan.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-200">
                Nama Lengkap sesuai KTP <span className="text-rose-400">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-200">
                  Email <span className="text-rose-400">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-200">
                  Nomor WhatsApp <span className="text-rose-400">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="tel"
                    placeholder="081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-200">
                Alamat Domisili <span className="text-rose-400">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Textarea
                  placeholder="Tuliskan alamat domisili Anda saat ini secara lengkap"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="pl-10 pt-2.5 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400 min-h-[70px]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-200">
                Upload Foto KTP <span className="text-rose-400">*</span>
              </Label>
              <div className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-4 text-center bg-slate-900/40 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setKtpFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  required
                />
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">
                    {ktpFile ? ktpFile.name : "Klik untuk memilih foto KTP"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Format JPG, PNG, atau WEBP (Maksimal 5MB)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-emerald-400" /> Media Sosial Aktif
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-900/60 p-3 rounded-2xl border border-white/10">
                {SOCIAL_MEDIA_OPTIONS.map((social) => (
                  <div key={social} className="flex items-center space-x-2">
                    <Checkbox
                      id={`social-${social}`}
                      checked={selectedSocials.includes(social)}
                      onCheckedChange={() => handleSocialToggle(social)}
                      className="rounded-md border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <label
                      htmlFor={`social-${social}`}
                      className="text-xs text-slate-300 font-medium cursor-pointer"
                    >
                      {social}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> Pengalaman di Bidang Sales atau Properti?
              </Label>
              <RadioGroup value={experience} onValueChange={setExperience} className="grid grid-cols-2 gap-2">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border transition cursor-pointer ${
                      experience === opt.value
                        ? "border-emerald-500 bg-emerald-950/50 text-white font-bold"
                        : "border-white/20 bg-slate-900/40 text-slate-300"
                    }`}
                    onClick={() => setExperience(opt.value)}
                  >
                    <RadioGroupItem value={opt.value} id={`exp-${opt.value}`} />
                    <label htmlFor={`exp-${opt.value}`} className="text-xs cursor-pointer">
                      {opt.label}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-400" /> Punya Kendaraan Pribadi & Bersedia Mobile?
              </Label>
              <RadioGroup value={vehicle} onValueChange={setVehicle} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VEHICLE_OPTIONS.map((vOpt) => (
                  <div
                    key={vOpt.value}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border transition cursor-pointer ${
                      vehicle === vOpt.value
                        ? "border-emerald-500 bg-emerald-950/50 text-white font-bold"
                        : "border-white/20 bg-slate-900/40 text-slate-300"
                    }`}
                    onClick={() => setVehicle(vOpt.value)}
                  >
                    <RadioGroupItem value={vOpt.value} id={`veh-${vOpt.value}`} />
                    <label htmlFor={`veh-${vOpt.value}`} className="text-xs cursor-pointer">
                      {vOpt.label}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" /> Alasan Ingin Bergabung dengan Inland Property
              </Label>
              <Textarea
                placeholder="Tuliskan motivasi singkat Anda bergabung sebagai agen..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400 min-h-[70px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-200">
                  Password <span className="text-rose-400">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-9 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-200">
                  Konfirmasi Password <span className="text-rose-400">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-10 text-xs rounded-xl bg-slate-900/50 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-400"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer gap-2 mt-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengirimkan Permohonan Agen...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" /> Kirim Permohonan Agen ke Admin
                </>
              )}
            </Button>
          </form>

          <div className="text-center pt-2 border-t border-white/10 space-y-1">
            <p className="text-xs text-slate-300">
              Sudah memiliki akun?{" "}
              <Link href="/login" className="text-emerald-400 font-bold hover:underline">
                Masuk di Sini
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}