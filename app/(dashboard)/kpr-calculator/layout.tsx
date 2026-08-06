// app/(dashboard)/kpr-calculator/layout.tsx
//
// Metadata untuk page.tsx client di folder yang sama. Lihat komentar di
// app/(dashboard)/properties/[id]/layout.tsx untuk alasannya.
import type { Metadata } from "next";
import { SITE, OG_BASE } from "@/lib/site-config";

const title = "Kalkulator KPR";
const description =
  "Hitung angsuran KPR rumah Anda. Simulasi lengkap dengan berbagai tenor, " +
  "tingkat bunga, dan uang muka untuk merencanakan pembelian properti dengan " +
  "lebih matang.";
const url = `${SITE.url}/kpr-calculator`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { ...OG_BASE, type: "website", title, description, url },
  twitter: { card: "summary_large_image", title, description },
};

export default function KPRCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
