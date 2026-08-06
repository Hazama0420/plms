// app/(dashboard)/legal/pengecualian-tanggung-jawab/page.tsx
import type { Metadata } from "next";
import { SITE, WHATSAPP_HREF } from "@/lib/site-config";
import {
  LegalArticle,
  LegalCallout,
  LegalList,
  LegalSection,
} from "@/components/legal/LegalArticle";

export const metadata: Metadata = {
  title: `Pengecualian Tanggung Jawab | ${SITE.name}`,
  description:
    "Batasan tanggung jawab Inland Property atas informasi listing properti, simulasi KPR, dan peringatan keamanan pembayaran.",
};

export default function PengecualianTanggungJawabPage() {
  return (
    <LegalArticle
      title="Pengecualian Tanggung Jawab"
      intro={
        <>
          <p>
            Dokumen ini menjelaskan batas-batas tanggung jawab {SITE.name}{" "}
            sehubungan dengan informasi yang ditayangkan dan layanan yang
            disediakan pada platform. Mohon dibaca dengan saksama sebelum Anda
            mengambil keputusan yang berkaitan dengan properti.
          </p>
          <p>
            Ketentuan di sini melengkapi dan merupakan bagian tidak terpisahkan
            dari Syarat dan Ketentuan {SITE.name}.
          </p>
        </>
      }
    >
      <LegalSection num="I" title="Sifat Informasi pada Platform" id="sifat-informasi">
        <p>
          Seluruh informasi properti yang ditayangkan di platform ini — meliputi
          foto, denah, luas tanah dan bangunan, spesifikasi, status sertifikat,
          harga penawaran, serta ketersediaan — bersifat{" "}
          <strong className="font-semibold text-foreground">
            informatif dan indikatif
          </strong>
          , bukan merupakan penawaran yang mengikat secara hukum.
        </p>
        <p>
          Informasi tersebut bersumber dari pemilik properti, agen pemasaran, dan
          pengembang. {SITE.name} melakukan upaya yang wajar untuk menjaga
          kemutakhiran data, namun tidak dapat menjamin bahwa setiap informasi
          selalu akurat, lengkap, dan terkini pada setiap saat. Harga dan
          ketersediaan dapat berubah sewaktu-waktu tanpa pemberitahuan terlebih
          dahulu.
        </p>
        <p>
          Sebelum mengambil keputusan, Anda sangat dianjurkan melakukan
          pemeriksaan mandiri (<em>due diligence</em>), meliputi peninjauan fisik
          properti, pemeriksaan keaslian dan keabsahan dokumen kepemilikan pada
          instansi berwenang, serta konsultasi dengan notaris atau penasihat
          hukum.
        </p>
      </LegalSection>

      <LegalSection num="II" title="Simulasi Kalkulator KPR" id="kalkulator-kpr">
        <p>
          Fitur Kalkulator KPR pada platform ini merupakan{" "}
          <strong className="font-semibold text-foreground">
            alat bantu simulasi
          </strong>{" "}
          yang menghitung perkiraan angsuran berdasarkan angka yang Anda
          masukkan sendiri.
        </p>
        <p>Hasil perhitungan tersebut:</p>
        <LegalList>
          <li>
            Bukan merupakan penawaran, persetujuan, atau jaminan pemberian
            fasilitas kredit dari lembaga keuangan mana pun.
          </li>
          <li>
            Belum memperhitungkan biaya provisi, administrasi, asuransi jiwa dan
            kebakaran, biaya notaris, pajak, serta biaya lain yang lazim
            dibebankan.
          </li>
          <li>
            Menggunakan asumsi suku bunga tetap, sedangkan suku bunga sebenarnya
            dapat bersifat mengambang dan berubah mengikuti kebijakan bank serta
            kondisi pasar.
          </li>
          <li>
            Tidak memperhitungkan penilaian kelayakan kredit yang menjadi
            kewenangan penuh masing-masing bank.
          </li>
        </LegalList>
        <p>
          Angka angsuran yang sesungguhnya ditetapkan oleh bank pemberi kredit
          melalui proses pengajuan resmi. {SITE.name} tidak bertanggung jawab
          atas selisih antara hasil simulasi dengan ketetapan bank.
        </p>
      </LegalSection>

      <LegalSection num="III" title="Peringatan Keamanan Transaksi" id="keamanan-transaksi">
        <p>
          Demi melindungi Anda dari penipuan yang mengatasnamakan perusahaan,
          mohon perhatikan ketentuan berikut dengan sungguh-sungguh.
        </p>

        <LegalCallout title="Kami tidak pernah menerima pembayaran ke rekening pribadi">
          <p>
            {SITE.name} <strong>tidak pernah</strong> memberikan izin kepada agen
            atau pihak mana pun untuk menerima pembayaran secara tunai maupun
            transfer ke rekening atas nama pribadi.
          </p>
          <p>
            Seluruh pembayaran yang berkaitan dengan layanan {SITE.name} hanya
            sah apabila ditujukan ke rekening resmi{" "}
            <strong>atas nama badan hukum perusahaan</strong>, bukan atas nama
            perorangan.
          </p>
          <p>
            Sebelum melakukan pembayaran dalam bentuk apa pun, lakukan verifikasi
            keabsahan agen dan nomor rekening melalui WhatsApp resmi kami di{" "}
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline underline-offset-2"
            >
              {SITE.whatsapp}
            </a>
            .
          </p>
        </LegalCallout>

        <p>Langkah verifikasi yang kami anjurkan sebelum bertransaksi:</p>
        <LegalList ordered>
          <li>
            Pastikan agen yang menghubungi Anda benar terdaftar sebagai agen{" "}
            {SITE.name} dengan menanyakan langsung ke nomor resmi di atas.
          </li>
          <li>
            Cocokkan nama pemilik rekening tujuan — pembayaran ke rekening
            pribadi wajib Anda tolak.
          </li>
          <li>
            Mintalah bukti tagihan resmi yang diterbitkan melalui sistem{" "}
            {SITE.name}.
          </li>
          <li>
            Waspadai desakan untuk membayar cepat, penawaran harga yang jauh di
            bawah pasaran, dan permintaan komunikasi melalui nomor yang tidak
            resmi.
          </li>
        </LegalList>
        <p>
          Apabila Anda tetap melakukan pembayaran tanpa menempuh verifikasi di
          atas, segala kerugian yang timbul berada di luar tanggung jawab{" "}
          {SITE.name}.
        </p>
      </LegalSection>

      <LegalSection num="IV" title="Hubungan dengan Agen dan Pihak Ketiga" id="hubungan-agen">
        <p>
          Agen {SITE.name} bertindak dalam batas kewenangan yang diberikan
          perusahaan dan wajib tunduk pada prosedur operasional serta kebijakan
          kerahasiaan yang berlaku.
        </p>
        <p>
          Perbuatan agen yang dilakukan di luar kewenangan tersebut — termasuk
          janji lisan yang tidak tertuang dalam dokumen resmi, penerimaan
          pembayaran pribadi, dan penyalahgunaan data pelanggan — merupakan
          tanggung jawab pribadi agen yang bersangkutan.
        </p>
        <p>
          Atas setiap dugaan pelanggaran, {SITE.name} berkomitmen melakukan
          pemeriksaan internal, mengambil tindakan korektif termasuk pencabutan
          akses agen, serta bekerja sama sepenuhnya dengan pihak berwenang.
          Laporkan dugaan pelanggaran melalui kanal resmi kami.
        </p>
      </LegalSection>

      <LegalSection num="V" title="Ketersediaan Layanan Teknis" id="ketersediaan">
        <p>
          Platform disediakan sebagaimana adanya (<em>as is</em>) dan sebagaimana
          tersedia (<em>as available</em>). {SITE.name} tidak menjamin bahwa
          platform akan bebas dari gangguan, kesalahan, jeda, maupun kehilangan
          data akibat keadaan di luar kendali yang wajar.
        </p>
        <p>
          Kami tidak bertanggung jawab atas ketidaktersediaan layanan yang
          disebabkan oleh gangguan jaringan internet Anda, kegagalan perangkat,
          gangguan pada penyedia layanan pihak ketiga, pemeliharaan sistem, atau
          keadaan memaksa (<em>force majeure</em>) seperti bencana alam,
          kebakaran, kerusuhan, dan kebijakan pemerintah.
        </p>
      </LegalSection>

      <LegalSection num="VI" title="Batasan Tanggung Jawab" id="batasan">
        <p>
          Sepanjang diizinkan oleh peraturan perundang-undangan yang berlaku,{" "}
          {SITE.name} beserta pengurus, karyawan, dan mitra resminya tidak
          bertanggung jawab atas kerugian yang timbul sehubungan dengan:
        </p>
        <LegalList>
          <li>
            Ketidakakuratan, kekeliruan, atau kekurangan informasi properti yang
            bersumber dari pemilik, agen, maupun pengembang.
          </li>
          <li>
            Keputusan pembelian, penjualan, penyewaan, atau investasi yang Anda
            ambil berdasarkan informasi di platform.
          </li>
          <li>
            Kehilangan keuntungan, pendapatan, peluang usaha, maupun kerugian
            tidak langsung dan konsekuensial lainnya.
          </li>
          <li>
            Penipuan, penggelapan, wanprestasi, atau perbuatan melawan hukum yang
            dilakukan pengguna lain, agen di luar kewenangannya, atau pihak
            ketiga.
          </li>
          <li>
            Penyalahgunaan akun yang terjadi akibat kelalaian Anda dalam menjaga
            kerahasiaan kata sandi.
          </li>
          <li>
            Kerugian akibat pengaksesan tautan, aplikasi, atau layanan milik
            pihak ketiga.
          </li>
        </LegalList>
        <p>
          Pembatasan pada bagian ini tidak menghapus tanggung jawab {SITE.name}{" "}
          yang menurut peraturan perundang-undangan yang berlaku tidak dapat
          dikecualikan, termasuk tanggung jawab sebagai pengendali data pribadi
          sebagaimana diuraikan dalam Kebijakan Privasi.
        </p>
      </LegalSection>

      <LegalSection num="VII" title="Pelaporan dan Kontak" id="pelaporan">
        <p>
          Apabila Anda menemukan informasi yang keliru, dugaan penipuan, atau
          perbuatan yang mengatasnamakan {SITE.name}, mohon segera laporkan
          kepada kami melalui WhatsApp resmi{" "}
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-600 dark:text-emerald-400"
          >
            {SITE.whatsapp}
          </a>
          .
        </p>
        <p>
          Sertakan keterangan sejelas mungkin — kode properti, nama pihak yang
          dilaporkan, tangkapan layar percakapan, dan bukti pembayaran bila ada —
          agar penanganan dapat kami lakukan dengan cepat dan tepat.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
