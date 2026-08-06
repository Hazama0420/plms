// components/legal/LegalArticle.tsx
//
// Primitif tipografi untuk keempat halaman /legal/*.
//
// Plugin @tailwindcss/typography tidak terpasang di proyek ini, jadi kelas
// `prose` tidak tersedia dan penataan prosa harus ditulis manual. Komponen di
// bawah ini menjaga keempat dokumen tampil seragam tanpa mengulang kelas yang
// sama di ratusan tempat.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LEGAL_LINKS, SITE } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * Palet korporat Inland Property — hijau hutan #0E2C24 dan emas #E2B23B,
 * sama dengan kop invoice dan SiteFooter.
 *
 * Ditulis sebagai kelas arbitrer Tailwind di tempat pemakaian, bukan konstanta
 * yang disuntikkan lewat atribut style, supaya varian dark: tetap bisa
 * mengambil alih. Atribut style selalu menang atas kelas mana pun.
 */

export function LegalArticle({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-4xl pb-4">
      {/* Kepala dokumen */}
      <header className="mb-6">
        <div className="mb-4 h-1 w-16 rounded-full bg-[#E2B23B]" />
        <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Dokumen Legal {SITE.name}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          Terakhir diperbarui: {SITE.lastUpdated}
        </p>
      </header>

      {/* Badan dokumen */}
      <div className="rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 sm:p-8">
        {intro && (
          <div className="mb-8 border-l-2 border-[#E2B23B] pl-4">
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {intro}
            </div>
          </div>
        )}
        <div className="space-y-8">{children}</div>
      </div>

      <LegalCrossLinks currentTitle={title} />
    </article>
  );
}

export function LegalSection({
  num,
  title,
  id,
  children,
}: {
  /** Angka Romawi bab, mis. "I", "II". Boleh dikosongkan untuk bab tanpa nomor. */
  num?: string;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-3 text-sm font-bold tracking-tight uppercase">
        {/*
          Warna ditulis sebagai kelas arbitrer, bukan inline style: style atribut
          selalu mengalahkan kelas, sehingga varian dark: tidak akan pernah
          menang dan judul bab jadi hijau gelap di atas kartu gelap.
        */}
        {num && (
          <span className="mr-2 text-[#E2B23B]" aria-hidden="true">
            {num}
          </span>
        )}
        <span className="text-[#0E2C24] dark:text-emerald-400">{title}</span>
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function LegalList({
  ordered = false,
  className,
  children,
}: {
  ordered?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={cn(
        "space-y-1.5 pl-5 marker:text-muted-foreground/50",
        ordered ? "list-decimal" : "list-disc",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Kotak sorotan untuk peringatan penting — mis. imbauan verifikasi pembayaran
 * pada halaman Pengecualian Tanggung Jawab.
 */
export function LegalCallout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="mb-2 text-sm font-bold text-amber-900 dark:text-amber-300">
        {title}
      </p>
      <div className="space-y-2 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/70">
        {children}
      </div>
    </div>
  );
}

/** Navigasi silang ke tiga dokumen legal lainnya. */
function LegalCrossLinks({ currentTitle }: { currentTitle: string }) {
  const others = LEGAL_LINKS.filter((l) => l.label !== currentTitle);

  return (
    <nav aria-label="Dokumen legal lainnya" className="mt-6">
      <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Dokumen Lainnya
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {others.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:ring-foreground/25"
          >
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
              {link.label}
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {link.description}
            </p>
          </Link>
        ))}
      </div>
    </nav>
  );
}
