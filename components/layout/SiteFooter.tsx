// components/layout/SiteFooter.tsx
//
// Footer permanen yang tampil di seluruh halaman dashboard maupun etalase
// publik. Warnanya sengaja dikunci ke identitas korporat Inland Property —
// hijau hutan #0E2C24 dengan aksen emas #E2B23B, palet yang sama dengan kop
// dan kaki invoice di lib/templates/invoice-template.ts.
//
// Warna ditulis literal, BUKAN lewat var(--primary). Token itu bisa diubah
// pengguna; identitas perusahaan tidak boleh ikut berubah.

import Link from "next/link";
import { LEGAL_LINKS, SITE } from "@/lib/site-config";
import { cn } from "@/lib/utils";

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function IconYouTube({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  const socials = [
    { href: SITE.instagram, label: "Instagram", Icon: IconInstagram, hoverColor: "hover:text-[#E1306C]" },
    { href: SITE.tiktok, label: "TikTok", Icon: IconTikTok, hoverColor: "hover:text-white" },
    { href: SITE.facebook, label: "Facebook", Icon: IconFacebook, hoverColor: "hover:text-[#1877F2]" },
    { href: SITE.youtube, label: "YouTube", Icon: IconYouTube, hoverColor: "hover:text-[#FF0000]" },
  ];

  return (
    <footer
      role="contentinfo"
      className={cn("select-none bg-[#0E2C24] relative overflow-hidden", className)}
    >
      {/* Ornamen diagonal subtle */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
          backgroundSize: "12px 12px",
        }}
      />

      {/* Garis emas tipis — motif yang sama dengan kop invoice */}
      <div className="h-1 w-full bg-[#E2B23B]" />

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-8 sm:py-6">
        {/* Konten utama: center-aligned */}
        <div className="flex flex-col items-center gap-3 text-center">
          {/* Logo brand */}
          <p className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
            <span className="text-[#E2B23B]">Inland</span>
            <span className="text-white">Property</span>
          </p>

          {/* Alamat */}
          <p className="text-[11px] sm:text-xs text-white/60 max-w-xs sm:max-w-sm leading-relaxed">
            {SITE.address}
          </p>

          {/* Email */}
          <a
            href={`mailto:${SITE.email}`}
            className="text-[11px] sm:text-xs text-white/60 hover:text-[#E2B23B] transition-colors"
          >
            {SITE.email}
          </a>

          {/* Social media icons */}
          <div className="flex items-center gap-4 mt-1">
            {socials.map(({ href, label, Icon, hoverColor }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={cn(
                  "text-white/60 transition-all duration-200 hover:scale-110",
                  hoverColor
                )}
              >
                <Icon className="w-6 h-6" />
              </a>
            ))}
          </div>
        </div>

        {/* Tautan dokumen legal */}
        <nav
          aria-label="Tautan dokumen legal"
          className="mt-4 grid grid-cols-2 gap-x-3 sm:mt-5 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-2"
        >
          {LEGAL_LINKS.map((link, i) => (
            <span key={link.href} className="flex items-center">
              <Link
                href={link.href}
                className="inline-flex min-h-9 items-center text-[11px] font-medium leading-tight text-white/75 transition-colors hover:text-white hover:underline underline-offset-4 sm:min-h-0 sm:py-1 sm:text-xs"
              >
                {link.label}
              </Link>
              {i < LEGAL_LINKS.length - 1 && (
                <span aria-hidden="true" className="hidden px-2 text-white/25 sm:inline">
                  &middot;
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* Hak cipta */}
        <div className="mt-4 border-t border-white/10 pt-3 text-center sm:mt-5 sm:pt-4">
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
