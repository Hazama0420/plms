// hooks/use-lead-capture.ts
//
// Satu titik keputusan untuk seluruh tombol "Hubungi via WhatsApp" di aplikasi.
//
// ATURANNYA
// =========
// - TAMU (belum login)  → form wajib diisi dulu. Tanpa itu, klik WA tidak
//   meninggalkan jejak apa pun di CRM, dan itulah keluhan yang diperbaiki.
// - CLIENT (role viewer, sudah login) → TIDAK ada form. Nama dan nomor diambil
//   server dari akun yang bersangkutan, aktivitasnya langsung tercatat di log
//   CRM, lalu WhatsApp dibuka.
// - STAF INTERNAL (agen/admin/komisioner) → tidak ada lead yang dibuat; menekan
//   tombol WA di katalog berarti menghubungi rekan pemegang listing, bukan
//   mengajukan diri sebagai calon pembeli. Server hanya mengembalikan nomornya.
//
// Keputusan tamu-atau-bukan diambil dari `isLoggedIn` yang dikirim pemanggil,
// BUKAN dari `supabase.auth.getUser()` di dalam hook ini. Alasannya bukan
// sekadar menghemat satu query: pemeriksaan sesi bersifat async, sedangkan
// `window.open` harus dipanggil dalam gerakan klik yang sama agar tidak
// diblokir pemblokir popup. Karena itu tab dibuka kosong lebih dulu, lalu
// alamatnya diisi setelah API menjawab.
//
// Server tetap menjadi penentu akhir: `isLoggedIn` yang salah paling banter
// membuat tab kosong terbuka lalu ditutup dan form muncul (respons 422), bukan
// membuat aktivitas tercatat atas nama orang lain.

"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

export interface LeadCaptureProperty {
  id: string;
  title: string;
  listing_code?: string | null;
}

export interface UseLeadCaptureOptions {
  /** Apakah pengunjung sudah login. Menentukan form ditampilkan atau tidak. */
  isLoggedIn: boolean;
  /** Label sumber lead yang disimpan di CRM. */
  source?: string;
  /**
   * Nomor WA cadangan bila server tidak menemukan nomor agen. Diisi halaman
   * detail properti, yang memang sudah memuat data agen penanggung jawab.
   */
  fallbackWhatsapp?: string | null;
}

export function useLeadCapture({
  isLoggedIn,
  source,
  fallbackWhatsapp = null,
}: UseLeadCaptureOptions) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<LeadCaptureProperty | null>(null);
  const [prefill, setPrefill] = useState<{ name?: string; phone?: string }>({});

  /** Susun pesan WhatsApp yang seragam di semua halaman. */
  const buildMessage = (property: LeadCaptureProperty, senderName?: string) => {
    const kode = property.listing_code ? ` (${property.listing_code})` : "";
    const pembuka = senderName ? `Halo, saya *${senderName}*` : "Halo, saya";
    return encodeURIComponent(
      `${pembuka} tertarik dengan properti *${property.title}*${kode}. Apakah masih tersedia?`
    );
  };

  /**
   * Jalur otomatis untuk pengguna yang sudah login. `pendingWindow` adalah tab
   * kosong yang sudah dibuka saat klik; alamatnya diisi di sini.
   */
  const submitAsAccount = useCallback(
    async (property: LeadCaptureProperty, pendingWindow: Window | null) => {
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Nama dan nomor sengaja TIDAK dikirim: server membacanya dari
            // tabel users memakai sesi. Mengirimnya dari sini berarti siapa pun
            // yang login bisa mencatat aktivitas atas nama orang lain.
            property_id: property.id,
            source: source || "Klik WA Client",
            notes: `Menekan tombol WhatsApp untuk properti: ${property.title}${
              property.listing_code ? ` (${property.listing_code})` : ""
            }`,
          }),
        });

        const json = await res.json().catch(() => ({}));

        // Profil belum lengkap (atau sesi ternyata sudah kedaluwarsa) — buka
        // form, isi sebagian bila server mengirimkannya.
        if (res.status === 422 && json.needsForm) {
          pendingWindow?.close();
          setPrefill({ name: json.prefill?.name, phone: json.prefill?.phone });
          setTarget(property);
          setOpen(true);
          return;
        }

        if (!res.ok) throw new Error(json.error || "Gagal memproses permintaan.");

        const agentWa: string | null = json.agent?.whatsapp ?? fallbackWhatsapp ?? null;

        if (!agentWa) {
          pendingWindow?.close();
          toast.error("Nomor WhatsApp agen belum tersedia", {
            description: "Silakan hubungi admin untuk properti ini.",
          });
          return;
        }

        // Staf internal tidak menghasilkan lead, jadi tidak ada yang perlu
        // dikabarkan; client mendapat konfirmasi bahwa aktivitasnya tercatat.
        if (json.mode === "account") {
          toast.success("Membuka WhatsApp...", {
            description: "Aktivitas Anda tercatat di log CRM.",
          });
        }

        const text = buildMessage(property, json.inquirer?.name);
        const url = `https://wa.me/${agentWa}?text=${text}`;

        if (pendingWindow && !pendingWindow.closed) {
          pendingWindow.location.href = url;
        } else {
          window.open(url, "_blank");
        }
      } catch (err: any) {
        pendingWindow?.close();
        console.error("Gagal memproses klik WhatsApp:", err);
        toast.error("Gagal membuka WhatsApp", {
          description: err?.message || "Terjadi kesalahan. Coba lagi.",
        });
      }
    },
    [source, fallbackWhatsapp]
  );

  /** Handler tombol WA. Pasang langsung di `onClick`. */
  const requestContact = useCallback(
    (property: LeadCaptureProperty, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      if (!isLoggedIn) {
        setPrefill({});
        setTarget(property);
        setOpen(true);
        return;
      }

      // Dibuka sinkron di dalam gerakan klik supaya tidak diblokir; alamatnya
      // diisi setelah API menjawab.
      const pendingWindow = window.open("", "_blank");
      void submitAsAccount(property, pendingWindow);
    },
    [isLoggedIn, submitAsAccount]
  );

  return {
    /** Pasang di onClick tombol WhatsApp. */
    requestContact,
    /** Sebar ke <LeadCaptureModal {...modalProps} />. */
    modalProps: {
      open,
      onOpenChange: setOpen,
      propertyId: target?.id ?? null,
      propertyTitle: target?.title ?? "Properti Pilihan",
      listingCode: target?.listing_code ?? null,
      source,
      prefillName: prefill.name,
      prefillPhone: prefill.phone,
      fallbackWhatsapp,
    },
  };
}
