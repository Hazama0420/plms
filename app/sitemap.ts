// app/sitemap.ts
//
// Sitemap dinamis. Google memakai berkas ini untuk menemukan setiap listing
// tanpa harus menelusuri halaman daftar yang isinya dirakit JavaScript.
//
// Yang boleh masuk ke sini hanyalah halaman yang benar-benar bisa dibuka tamu.
// Daftar rute publik itu ditetapkan di proxy.ts: `/dashboard`, `/properties`,
// dan `/kpr-calculator` sengaja tidak terdaftar sebagai seksi terlindungi,
// ditambah `/legal/*` yang bahkan tidak masuk matcher.
import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { SITE, LEGAL_LINKS } from "@/lib/site-config";

/**
 * Segarkan paling sering sekali per jam.
 *
 * Tanpa baris ini sitemap.xml diprerender sekali saat build dan tidak pernah
 * berubah lagi — dokumen Next menyebut berkas metadata seperti ini "cached by
 * default". Akibatnya listing yang terbit setelah deploy tidak akan pernah
 * masuk sitemap sampai ada build berikutnya, dan itu justru menggagalkan
 * seluruh tujuan berkas ini.
 *
 * Angkanya ditulis sebagai literal, bukan `60 * 60`: nilainya harus bisa
 * dianalisis secara statis oleh kompiler.
 */
export const revalidate = 3600;

/**
 * Halaman tetap.
 *
 * `/` tidak ada di sini dengan sengaja — app/(dashboard)/page.tsx hanya
 * melempar pengunjung ke `/dashboard`. Mendaftarkan URL yang selalu membalas
 * redirect membuat Search Console menandainya sebagai galat perayapan.
 */
function staticEntries(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${SITE.url}/properties`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE.url}/dashboard`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE.url}/kpr-calculator`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Diiterasi dari sumber yang sama dengan footer dan halaman legal, supaya
    // menambah dokumen legal baru tidak menuntut penyuntingan berkas ini.
    ...LEGAL_LINKS.map((link) => ({
      url: `${SITE.url}${link.href}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = staticEntries();

  try {
    const supabase = createPublicClient();

    // Dua filter ini menirukan syarat yang dipakai halaman properti untuk
    // menentukan apa yang boleh dilihat tamu:
    //
    //   status = "published"     listing draf, dalam tinjauan, terjual, atau
    //                            terarsip tidak boleh bocor lewat sitemap.
    //   assigned_to IS NOT NULL  tanpa agen penanggung jawab, listing tidak
    //                            layak terbit — aturan yang sama yang membuat
    //                            pelepasan penugasan mengembalikannya ke draf.
    const { data, error } = await supabase
      .from("properties")
      .select("id, slug, updated_at")
      .eq("status", "published")
      .not("assigned_to", "is", null)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    const properties: MetadataRoute.Sitemap = (data || []).map((row) => ({
      url: `${SITE.url}/properties/${(row as any).slug || row.id}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...statics, ...properties];
  } catch (err) {
    // Sitemap yang melempar akan menggagalkan build dan, di produksi, membalas
    // 500 kepada perayap. Halaman tetapnya masih benar dan berguna, jadi lebih
    // baik menerbitkan sitemap yang tidak lengkap daripada tidak sama sekali.
    console.error("[sitemap] Gagal memuat daftar properti:", err);
    return statics;
  }
}
