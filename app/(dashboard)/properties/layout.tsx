// app/(dashboard)/properties/layout.tsx
//
// page.tsx di folder ini client component, jadi metadatanya dipasang lewat
// layout server ini yang hanya meneruskan `children`. Alasan lengkapnya ada di
// komentar app/(dashboard)/properties/[id]/layout.tsx.
import type { Metadata } from "next";
import { SITE, OG_BASE } from "@/lib/site-config";

const title = "Jelajahi Properti";
const description =
  "Temukan rumah, apartemen, tanah, ruko, dan properti komersial untuk dijual " +
  "atau disewa. Listing terverifikasi dengan foto, harga, dan lokasi lengkap " +
  "di seluruh Indonesia.";
const url = `${SITE.url}/properties`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  // openGraph ditulis ulang, bukan diwarisi: bila dibiarkan kosong, kartu
  // berbagi halaman ini akan memakai judul merek dari app/layout.tsx. Penyebaran
  // OG_BASE diperlukan karena penggabungan metadata bersifat dangkal.
  openGraph: { ...OG_BASE, type: "website", title, description, url },
  twitter: { card: "summary_large_image", title, description },
};

export default function PropertiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
