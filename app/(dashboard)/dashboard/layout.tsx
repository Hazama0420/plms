// app/(dashboard)/dashboard/layout.tsx
//
// Metadata untuk page.tsx client di folder yang sama. Lihat komentar di
// app/(dashboard)/properties/[id]/layout.tsx untuk alasannya.
//
// Rute ini praktis menjadi halaman depan situs: `/` hanya melempar ke sini
// (app/(dashboard)/page.tsx), jadi judul dan deskripsinya ditulis untuk tamu
// yang baru datang, bukan untuk pengguna yang sudah masuk.
import type { Metadata } from "next";
import { SITE, OG_BASE } from "@/lib/site-config";

const title = "Beranda";
const description =
  "Jelajahi properti pilihan hari ini: rumah, apartemen, tanah, dan properti " +
  "komersial yang baru ditambahkan. Listing terverifikasi dengan foto, harga, " +
  "dan lokasi lengkap.";
const url = `${SITE.url}/dashboard`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { ...OG_BASE, type: "website", title, description, url },
  twitter: { card: "summary_large_image", title, description },
};

export default function DashboardHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
