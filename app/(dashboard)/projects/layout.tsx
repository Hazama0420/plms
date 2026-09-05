// app/(dashboard)/projects/layout.tsx
//
// Ketiga halaman di seksi ini (daftar, create, detail) adalah client component,
// jadi metadatanya dipasang lewat layout server ini yang hanya meneruskan
// `children`. Alasan lengkapnya ada di komentar
// app/(dashboard)/properties/[id]/layout.tsx.
//
// Dipasang satu tingkat di sini, bukan per halaman: judulnya sama untuk seluruh
// seksi dan tidak ada yang perlu dibedakan mesin pencari.
//
// `noindex` walaupun /projects/ sudah dilarang di app/robots.ts. Keduanya
// menjawab hal berbeda: robots.txt melarang perayap MASUK, noindex melarang
// URL-nya DITAMPILKAN. URL yang ditemukan lewat tautan dari luar tetap bisa
// muncul di hasil pencarian meski isinya tidak pernah dibaca — dan data proyek
// konstruksi beserta anggarannya tidak boleh sampai ke sana.
//
// `follow: false` juga: tidak ada satu pun tautan dari halaman internal ini
// yang perlu ditelusuri perayap.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proyek Konstruksi",
  description:
    "Pemantauan progres fisik, serapan anggaran, dan tenggat proyek pembangunan.",
  robots: { index: false, follow: false },
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
