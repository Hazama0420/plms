// app/(dashboard)/legal/pemberitahuan-hak-cipta/page.tsx
import type { Metadata } from "next";
import { SITE, WHATSAPP_HREF } from "@/lib/site-config";
import {
  LegalArticle,
  LegalList,
  LegalSection,
} from "@/components/legal/LegalArticle";

export const metadata: Metadata = {
  title: `Pemberitahuan Hak Cipta | ${SITE.name}`,
  description:
    "Kepemilikan konten, merek dagang, batas penggunaan yang diizinkan, dan prosedur pengaduan pelanggaran hak cipta di Inland Property.",
};

export default function PemberitahuanHakCiptaPage() {
  return (
    <LegalArticle
      title="Pemberitahuan Hak Cipta"
      intro={
        <>
          <p>
            Seluruh materi yang ditampilkan pada platform {SITE.name} dilindungi
            hak cipta dan hak kekayaan intelektual lainnya berdasarkan
            Undang-Undang Nomor 28 Tahun 2014 tentang Hak Cipta serta peraturan
            perundang-undangan terkait yang berlaku di Republik Indonesia.
          </p>
          <p>
            Dokumen ini menjelaskan kepemilikan materi tersebut, batas
            penggunaan yang kami izinkan, dan cara menyampaikan pengaduan apabila
            Anda menemukan dugaan pelanggaran.
          </p>
        </>
      }
    >
      <LegalSection num="I" title="Kepemilikan Materi" id="kepemilikan">
        <p>
          Kecuali dinyatakan lain, seluruh materi pada platform ini merupakan
          milik {SITE.name} atau digunakan atas dasar lisensi yang sah dari
          pemegang haknya. Materi tersebut meliputi:
        </p>
        <LegalList>
          <li>
            Foto, video, denah, dan gambar properti, termasuk yang telah dibubuhi
            tanda air (<em>watermark</em>) {SITE.name}.
          </li>
          <li>
            Naskah keterangan properti, judul iklan, artikel, dan seluruh teks
            pada antarmuka.
          </li>
          <li>
            Logo, wordmark, palet warna khas, ikon, dan elemen identitas visual{" "}
            {SITE.name}.
          </li>
          <li>
            Rancangan tata letak, susunan halaman, alur navigasi, dan tampilan
            antarmuka.
          </li>
          <li>
            Kode sumber, basis data, susunan data, serta perangkat lunak yang
            menjalankan platform.
          </li>
          <li>
            Rancangan dokumen keluaran sistem, termasuk format tagihan dan
            laporan.
          </li>
        </LegalList>
        <p>
          Materi yang diunggah pengguna tetap menjadi milik pengguna yang
          bersangkutan, dengan pemberian izin penayangan kepada {SITE.name}{" "}
          sebagaimana diatur dalam Syarat dan Ketentuan.
        </p>
      </LegalSection>

      <LegalSection num="II" title="Merek Dagang" id="merek-dagang">
        <p>
          Nama, logo, dan wordmark {SITE.name} merupakan merek dagang yang
          dilindungi menurut hukum Republik Indonesia.
        </p>
        <p>
          Penggunaan merek dagang {SITE.name} oleh pihak lain — termasuk pada
          nama usaha, nama domain, akun media sosial, materi promosi, dan kemasan
          produk — wajib memperoleh persetujuan tertulis terlebih dahulu dari
          kami. Penggunaan tanpa izin, termasuk penggunaan yang menimbulkan kesan
          adanya hubungan kerja sama atau afiliasi yang sesungguhnya tidak ada,
          dilarang dan dapat kami tindak secara hukum.
        </p>
      </LegalSection>

      <LegalSection num="III" title="Lisensi Penggunaan yang Diizinkan" id="lisensi">
        <p>
          {SITE.name} memberikan Anda lisensi terbatas, non-eksklusif, tidak
          dapat dialihkan, dan dapat dicabut sewaktu-waktu untuk mengakses serta
          melihat materi pada platform ini semata-mata untuk keperluan pribadi
          dan non-komersial dalam rangka mencari atau memasarkan properti.
        </p>
        <p>Dalam lingkup lisensi tersebut, Anda diperkenankan:</p>
        <LegalList>
          <li>
            Melihat, mencetak, atau menyimpan satu salinan halaman properti untuk
            keperluan pertimbangan pribadi.
          </li>
          <li>
            Membagikan tautan menuju halaman properti kepada pihak lain tanpa
            mengubah isinya.
          </li>
        </LegalList>
        <p>
          Lisensi ini tidak mengalihkan kepemilikan apa pun kepada Anda dan
          berakhir dengan sendirinya apabila Anda melanggar ketentuan dalam
          dokumen ini.
        </p>
      </LegalSection>

      <LegalSection num="IV" title="Perbuatan yang Dilarang" id="larangan">
        <p>
          Tanpa persetujuan tertulis terlebih dahulu dari {SITE.name}, Anda
          dilarang:
        </p>
        <LegalList>
          <li>
            Menggandakan, menerbitkan ulang, mendistribusikan, atau
            memperjualbelikan materi dari platform ini, baik sebagian maupun
            seluruhnya.
          </li>
          <li>
            Menghapus, menutupi, memotong, atau mengubah tanda air, logo, dan
            keterangan sumber pada foto properti.
          </li>
          <li>
            Menggunakan foto atau keterangan properti kami pada situs, aplikasi,
            marketplace, atau akun media sosial lain seolah-olah merupakan
            listing milik Anda.
          </li>
          <li>
            Mengambil data secara massal dan otomatis dengan{" "}
            <em>scraping</em>, <em>crawling</em>, atau perkakas serupa, serta
            menyusun basis data turunan dari materi kami.
          </li>
          <li>
            Menampilkan platform ini di dalam bingkai situs lain (
            <em>framing</em>) atau menyisipkan kontennya (<em>hotlinking</em>)
            sehingga menimbulkan kesan sebagai milik pihak lain.
          </li>
          <li>
            Membongkar, merekayasa balik, atau berupaya memperoleh kode sumber
            perangkat lunak platform.
          </li>
          <li>
            Menggunakan materi kami untuk melatih model kecerdasan buatan atau
            menyusun produk turunan yang bersifat komersial.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection num="V" title="Pengaduan Dugaan Pelanggaran" id="pengaduan">
        <p>
          Apabila Anda adalah pemegang hak cipta atau kuasanya dan meyakini
          terdapat materi pada platform kami yang melanggar hak Anda, silakan
          sampaikan pengaduan melalui WhatsApp resmi{" "}
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
        <p>Agar dapat kami tindak lanjuti, pengaduan sekurang-kurangnya memuat:</p>
        <LegalList ordered>
          <li>Nama lengkap, alamat, dan kontak Anda yang dapat dihubungi.</li>
          <li>
            Uraian ciptaan yang Anda klaim beserta bukti kepemilikan hak, misalnya
            surat pencatatan ciptaan atau berkas asli.
          </li>
          <li>
            Tautan atau kode properti yang menunjukkan letak materi yang
            dipersoalkan.
          </li>
          <li>
            Surat kuasa, apabila pengaduan disampaikan oleh kuasa pemegang hak.
          </li>
          <li>
            Pernyataan bahwa keterangan yang Anda sampaikan benar dan Anda
            bersedia bertanggung jawab atas kebenarannya.
          </li>
        </LegalList>
        <p>
          Kami akan menelaah pengaduan yang lengkap dalam waktu paling lambat 7
          (tujuh) hari kerja. Selama penelaahan berlangsung, materi yang
          dipersoalkan dapat kami nonaktifkan sementara. Pengunggah materi akan
          kami beri kesempatan menyampaikan sanggahan disertai bukti tandingan.
        </p>
      </LegalSection>

      <LegalSection num="VI" title="Tindakan dan Sanksi" id="sanksi">
        <p>
          Terhadap pelanggaran yang terbukti, {SITE.name} dapat menempuh tindakan
          berupa penghapusan materi, penangguhan atau penutupan akun, pencabutan
          akses agen, serta pengajuan gugatan perdata maupun pengaduan pidana
          sesuai peraturan perundang-undangan yang berlaku.
        </p>
        <p>
          Penempuhan salah satu tindakan tidak menghapus hak {SITE.name} untuk
          menempuh tindakan lainnya, dan tidak menghapus kewajiban pihak yang
          melanggar untuk mengganti kerugian yang timbul.
        </p>
      </LegalSection>

      <LegalSection num="VII" title="Permohonan Izin Penggunaan" id="izin">
        <p>
          Untuk keperluan pemberitaan, penelitian, kerja sama pemasaran, atau
          penggunaan lain yang berada di luar lingkup lisensi pada bagian III,
          silakan ajukan permohonan izin tertulis kepada kami melalui kanal resmi
          di atas.
        </p>
        <p>
          Cantumkan identitas pemohon, materi yang hendak digunakan, tujuan
          penggunaan, media penayangan, dan jangka waktunya. Setiap izin yang
          kami berikan berlaku terbatas sesuai lingkup yang disetujui dan tidak
          dapat dialihkan kepada pihak lain.
        </p>
      </LegalSection>

      <LegalSection num="VIII" title="Hukum yang Berlaku" id="hukum">
        <p>
          Pemberitahuan Hak Cipta ini tunduk pada hukum Negara Republik
          Indonesia. Setiap perselisihan yang timbul akan diselesaikan sesuai
          mekanisme yang diatur dalam Syarat dan Ketentuan {SITE.name}.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
