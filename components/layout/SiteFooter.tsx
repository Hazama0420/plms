// components/layout/SiteFooter.tsx
//
// Footer permanen yang tampil di seluruh halaman dashboard maupun etalase
// publik. Warnanya sengaja dikunci ke identitas korporat Inland Property —
// hijau hutan #0E2C24 dengan aksen emas #E2B23B, palet yang sama dengan kop
// dan kaki invoice di lib/templates/invoice-template.ts.
//
// Warna ditulis literal, BUKAN lewat var(--primary). Token itu bisa diubah
// pengguna menjadi biru atau ungu lewat Pengaturan; identitas perusahaan tidak
// boleh ikut berubah. Konsekuensinya footer tampil sama persis di light maupun
// dark mode, dan itu memang disengaja.

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { LEGAL_LINKS, SITE, WHATSAPP_HREF } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * Palet korporat ditulis sebagai kelas arbitrer Tailwind. Tidak ada varian
 * dark: di sini karena footer memang disengaja tampil identik di kedua mode.
 */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      role="contentinfo"
      // TANPA w-full. Pemanggil membatalkan padding <main> lewat -mx-4, dan
      // margin negatif hanya melebarkan boks yang lebarnya auto — pada w-full
      // ia cuma menggeser boksnya ke kiri, menyisakan celah selebar padding di
      // kanan. <footer> sudah display:block, jadi lebar penuh tetap didapat.
      className={cn("select-none bg-[#0E2C24]", className)}
    >
      {/* Garis emas tipis — motif yang sama dengan kop invoice */}
      <div className="h-1 w-full bg-[#E2B23B]" />

      {/* px-4 di mobile menyamai p-4 milik <main> supaya teks footer lurus
          dengan konten di atasnya, bukan menjorok 4px seperti sebelumnya. */}
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-10">
        {/* Baris merek + hotline */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
          <div className="space-y-0.5 sm:space-y-1.5">
            <p className="flex items-center gap-1.5 text-base font-extrabold tracking-tight sm:text-lg">
              <span className="text-[#E2B23B]">Inland</span>
              <span className="text-white">Property</span>
            </p>
            <p className="text-[11px] font-medium text-white/60 sm:text-xs">
              {SITE.tagline}
            </p>
          </div>

          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E2B23B] sm:rounded-xl sm:px-3.5 sm:py-2.5"
            title={`Hubungi Inland Property di WhatsApp ${SITE.whatsapp}`}
          >
            <MessageCircle className="h-4 w-4 text-[#E2B23B]" />
            <span>{SITE.whatsapp}</span>
          </a>
        </div>

        {/* Tautan dokumen legal */}
        {/*
          Dua kolom di mobile, satu baris menyamping dari sm ke atas. Empat
          tautan bertumpuk vertikal menghabiskan 160px sendirian — digridkan
          jadi 2x2 tingginya kira-kira separuh, dan tiap sel tetap punya area
          sentuh sendiri. Sengaja bukan flex-wrap dengan pemisah titik: tautan
          11px yang berdampingan hanya dipisah 8px terlalu mudah salah sentuh.
        */}
        <nav
          aria-label="Tautan dokumen legal"
          className="mt-4 grid grid-cols-2 gap-x-3 sm:mt-7 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2"
        >
          {LEGAL_LINKS.map((link, i) => (
            <span key={link.href} className="flex items-center">
              <Link
                href={link.href}
                className="inline-flex min-h-9 items-center text-[11px] font-medium leading-tight text-white/75 transition-colors hover:text-white hover:underline underline-offset-4 sm:min-h-0 sm:py-1 sm:text-xs"
              >
                {link.label}
              </Link>
              {/* Pemisah titik hanya relevan saat tautan berbaris menyamping */}
              {i < LEGAL_LINKS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hidden px-2 text-white/25 sm:inline"
                >
                  &middot;
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* Hak cipta */}
        <div className="mt-4 border-t border-white/10 pt-3 sm:mt-6 sm:pt-5">
          <p className="text-[11px] text-white/55 sm:text-xs">
            &copy; {SITE.copyrightYear} {SITE.name}. Hak cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Varian ringkas untuk halaman autentikasi.
 *
 * Halaman login/register memakai kartu glassmorphism di atas foto kota; footer
 * penuh akan menabrak komposisi itu. Baris ini menyelipkan tautan legal yang
 * sama ke dalam kartu, jadi kewajiban "ada di setiap halaman" tetap terpenuhi
 * tanpa merusak tampilan.
 */
export function LegalLinksInline({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Tautan dokumen legal"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center",
        className
      )}
    >
      {LEGAL_LINKS.map((link, i) => (
        <span key={link.href} className="flex items-center gap-x-1.5">
          <Link
            href={link.href}
            className="text-[10px] font-medium text-slate-300/70 transition-colors hover:text-emerald-300 hover:underline underline-offset-2"
          >
            {link.label}
          </Link>
          {i < LEGAL_LINKS.length - 1 && (
            <span aria-hidden="true" className="text-[10px] text-slate-400/40">
              &middot;
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
