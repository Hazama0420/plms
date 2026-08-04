"use client";

import { useState } from "react";
import {
  Globe,
  Award,
  FileText,
  ExternalLink,
  Copy,
  Save,
  Loader2,
  Sparkles,
  MapPin,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BrandingTabProps {
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  savingBranding: boolean;
  handleBrandingSubmit: (e: React.FormEvent) => void;
  publicProfileUrl: string;
  handleCopy: (value: string, label: string) => void;
}

export function BrandingTab({
  profile,
  setProfile,
  savingBranding,
  handleBrandingSubmit,
  publicProfileUrl,
  handleCopy,
}: BrandingTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT SIDE: PREVIEW PROFIL PUBLIK */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="border border-emerald-200 dark:border-emerald-900/60 shadow-xs bg-gradient-to-b from-emerald-50/40 to-background dark:from-emerald-950/20">
          <CardHeader className="p-4 pb-2 border-b border-emerald-100 dark:border-emerald-900/40">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Share2 size={16} className="text-emerald-600" />
              Tautan Profil Publik Saya
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <p className="text-[11px] text-muted-foreground">
              Bagikan tautan kartu nama digital Anda ke calon klien atau media sosial.
            </p>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-foreground">URL Halaman Publik</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  value={publicProfileUrl || "https://inlandproperty.id/agent/..."}
                  readOnly
                  className="h-8 text-[11px] font-mono bg-background text-muted-foreground truncate"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 cursor-pointer"
                  onClick={() => handleCopy(publicProfileUrl, "Tautan Profil Publik")}
                >
                  <Copy size={13} />
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(publicProfileUrl, "_blank")}
              disabled={!publicProfileUrl}
              className="w-full text-xs h-8 border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 gap-1.5 cursor-pointer font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Lihat Tampilan Profil Publik
            </Button>
          </CardContent>
        </Card>

        {/* TIP CARD */}
        <Card className="border shadow-xs bg-muted/20">
          <CardHeader className="p-4 pb-2 border-b">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Mengapa Branding Penting?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-[11px] text-muted-foreground leading-relaxed">
            <p>
              Agen dengan profil lengkap dan sertifikasi memiliki tingkat kepercayaan **3x lebih tinggi** dari pembeli properti.
            </p>
            <p>
              Pastikan Anda mencantumkan area spesialisasi serta akun media sosial aktif agar mudah dihubungi oleh calon pembeli.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT SIDE: FORM BRANDING */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border shadow-xs">
          <CardHeader className="p-4 border-b bg-muted/20">
            <CardTitle className="text-xs font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Bio, Spesialisasi & Sertifikasi
            </CardTitle>
            <CardDescription className="text-[11px]">
              Tampilkan pengalaman kerja dan kredibilitas profesional Anda kepada calon pembeli.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleBrandingSubmit} className="space-y-4 text-xs">
              {/* BIO / DESKRIPSI SINGKAT */}
              <div className="space-y-1.5">
                <Label htmlFor="bio" className="font-semibold text-xs flex items-center gap-1.5">
                  <FileText size={14} className="text-muted-foreground" />
                  Bio / Deskripsi Singkat Profil
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Contoh: Konsultan properti profesional berpengalaman lebih dari 5 tahun di wilayah Bogor dan Tangerang Selatan. Siap membantu transaksi jual/sewa hunian aman & transparan."
                  value={profile.bio || ""}
                  onChange={(e) => setProfile((prev: any) => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Akan muncul di bagian paling atas halaman profil publik agen Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AREA SPESIALISASI */}
                <div className="space-y-1.5">
                  <Label htmlFor="specialization" className="font-semibold text-xs flex items-center gap-1.5">
                    <MapPin size={14} className="text-muted-foreground" />
                    Area Fokus / Spesialisasi
                  </Label>
                  <Input
                    id="specialization"
                    placeholder="Contoh: Bogor, Parung, BSD City, Depok"
                    value={profile.specialization || ""}
                    onChange={(e) => setProfile((prev: any) => ({ ...prev, specialization: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                {/* NOMOR KTA AREBI / LISENSI */}
                <div className="space-y-1.5">
                  <Label htmlFor="arebi_number" className="font-semibold text-xs flex items-center gap-1.5">
                    <Award size={14} className="text-muted-foreground" />
                    No. KTA AREBI / Sertifikasi Broker
                  </Label>
                  <Input
                    id="arebi_number"
                    placeholder="Contoh: AREBI-2024-889123"
                    value={profile.arebi_number || ""}
                    onChange={(e) => setProfile((prev: any) => ({ ...prev, arebi_number: e.target.value }))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* MEDIA SOSIAL */}
              <div className="pt-2 border-t space-y-3">
                <Label className="font-bold text-xs text-foreground block">
                  Tautan Media Sosial Publik
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* INSTAGRAM */}
                  <div className="space-y-1">
                    <Label htmlFor="instagram" className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span>Instagram Username / URL</span>
                    </Label>
                    <Input
                      id="instagram"
                      placeholder="https://instagram.com/username"
                      value={profile.instagram_url || ""}
                      onChange={(e) => setProfile((prev: any) => ({ ...prev, instagram_url: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* TIKTOK */}
                  <div className="space-y-1">
                    <Label htmlFor="tiktok" className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span>TikTok Username / URL</span>
                    </Label>
                    <Input
                      id="tiktok"
                      placeholder="https://tiktok.com/@username"
                      value={profile.tiktok_url || ""}
                      onChange={(e) => setProfile((prev: any) => ({ ...prev, tiktok_url: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* FACEBOOK */}
                  <div className="space-y-1">
                    <Label htmlFor="facebook" className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span>Facebook Profile / Page URL</span>
                    </Label>
                    <Input
                      id="facebook"
                      placeholder="https://facebook.com/username"
                      value={profile.facebook_url || ""}
                      onChange={(e) => setProfile((prev: any) => ({ ...prev, facebook_url: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* LINKEDIN */}
                  <div className="space-y-1">
                    <Label htmlFor="linkedin" className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span>LinkedIn Profile URL</span>
                    </Label>
                    <Input
                      id="linkedin"
                      placeholder="https://linkedin.com/in/username"
                      value={profile.linkedin_url || ""}
                      onChange={(e) => setProfile((prev: any) => ({ ...prev, linkedin_url: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* BUTTON SIMPAN */}
              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={savingBranding}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs gap-1.5 cursor-pointer shadow-xs"
                >
                  {savingBranding ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Simpan Branding & Profil Publik
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}