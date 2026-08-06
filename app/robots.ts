// app/robots.ts
//
// Aturan perayapan. Daftar larangannya mencerminkan PROTECTED_SECTIONS di
// proxy.ts — sembilan seksi yang menuntut login. Keduanya harus tetap sejalan:
// proxy yang menegakkan, berkas ini yang mengumumkan.
//
// Halaman autentikasi TIDAK dilarang di sini, melainkan diberi `noindex` lewat
// metadata di layout masing-masing. Melarang perayapan justru kontraproduktif:
// Google tetap boleh menampilkan URL yang ditemukannya dari tautan lain, tapi
// karena dilarang membuka halamannya ia tidak pernah membaca tag noindex di
// dalamnya. Supaya sebuah halaman benar-benar hilang dari hasil pencarian,
// perayap harus diizinkan masuk dan menemukan larangan itu sendiri.
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/crm/",
          "/admin/",
          "/reports/",
          "/invoices/",
          "/projects/",
          "/surveys/",
          "/notifications/",
          "/profile/",
          "/settings/",
          // Route handler tidak punya nilai untuk hasil pencarian, dan
          // sebagian di antaranya memang menolak permintaan tanpa sesi.
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
