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
      className={cn("w-full select-none bg-[#0E2C24]", className)}
    >
      {/* Garis emas tipis — motif yang sama dengan kop invoice */}
      <div className="h-1 w-full bg-[#E2B23B]" />

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        {/* Baris merek + hotline */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight">
              <span className="text-[#E2B23B]">Inland</span>
              <span className="text-white">Property</span>
            </p>
            <p className="text-xs font-medium text-white/60">{SITE.tagline}</p>
          </div>

          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E2B23B]"
            title={`Hubungi Inland Property di WhatsApp ${SITE.whatsapp}`}
          >
            <MessageCircle className="h-4 w-4 text-[#E2B23B]" />
            <span>{SITE.whatsapp}</span>
          </a>
        </div>

        {/* Tautan dokumen legal */}
        <nav
          aria-label="Tautan dokumen legal"
          className="mt-7 flex flex-col gap-y-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2"
        >
          {LEGAL_LINKS.map((link, i) => (
            <span key={link.href} className="flex items-center">
              <Link
                href={link.href}
                className="inline-flex min-h-10 items-center text-xs font-medium text-white/75 transition-colors hover:text-white hover:underline underline-offset-4 sm:min-h-0 sm:py-1"
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
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-xs text-white/55">
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
