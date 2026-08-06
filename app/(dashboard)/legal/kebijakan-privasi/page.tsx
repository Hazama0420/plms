// app/(dashboard)/legal/kebijakan-privasi/page.tsx
import type { Metadata } from "next";
import { SITE, WHATSAPP_HREF } from "@/lib/site-config";
import {
  LegalArticle,
  LegalList,
  LegalSection,
} from "@/components/legal/LegalArticle";

export const metadata: Metadata = {
  title: `Kebijakan Privasi | ${SITE.name}`,
  description:
    "Cara Inland Property mengumpulkan, menggunakan, melindungi, dan menghapus data pribadi pengguna sesuai UU Perlindungan Data Pribadi.",
};

export default function KebijakanPrivasiPage() {
  return (
    <LegalArticle
      title="Kebijakan Privasi"
      intro={
        <>
          <p>
            {SITE.name} menghargai kepercayaan Anda dan berkomitmen melindungi
            data pribadi yang Anda serahkan melalui platform ini. Kebijakan
            Privasi ini menjelaskan jenis data yang kami kumpulkan, alasan dan
            cara kami menggunakannya, pihak yang dapat mengaksesnya, serta hak
            yang Anda miliki atas data tersebut.
          </p>
          <p>
            Kebijakan ini disusun dengan mengacu pada Undang-Undang Nomor 27
            Tahun 2022 tentang Perlindungan Data Pribadi beserta peraturan
            pelaksanaannya.
          </p>
        </>
      }
    >
      <LegalSection num="I" title="Kedudukan Para Pihak" id="kedudukan">
        <p>
          Dalam pengelolaan data pribadi pada platform ini, {SITE.name}{" "}
          berkedudukan sebagai{" "}
          <strong className="font-semibold text-foreground">
            Pengendali Data Pribadi
          </strong>
          , yaitu pihak yang menentukan tujuan dan mengendalikan pemrosesan data.
        </p>
        <p>
          Agen dan staf {SITE.name} yang memperoleh akses terhadap data pengguna
          bertindak sebagai{" "}
          <strong className="font-semibold text-foreground">
            Pemroses Data Pribadi
          </strong>{" "}
          yang wajib memproses data semata-mata sesuai instruksi, prosedur
          operasional, dan kebijakan kerahasiaan perusahaan.
        </p>
        <p>
          Anda sebagai pengguna berkedudukan sebagai Subjek Data Pribadi dengan
          hak-hak sebagaimana diuraikan pada bagian VII dokumen ini.
        </p>
      </LegalSection>

      <LegalSection num="II" title="Data yang Kami Kumpulkan" id="data-dikumpulkan">
        <p>
          Kami mengumpulkan data pribadi dalam kelompok berikut, sesuai
          keperluan layanan yang Anda gunakan:
        </p>
        <LegalList>
          <li>
            <strong className="font-semibold text-foreground">
              Data identitas dan kontak
            </strong>{" "}
            — nama, alamat surel, nomor telepon atau WhatsApp, dan foto profil
            bila Anda mengunggahnya.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              Data akun
            </strong>{" "}
            — nama pengguna, kata sandi dalam bentuk terenkripsi, peran atau hak
            akses, serta riwayat masuk.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              Data minat dan prospek
            </strong>{" "}
            — properti yang Anda lihat atau tanyakan, anggaran, preferensi
            lokasi, catatan komunikasi dengan agen, riwayat percakapan WhatsApp
            yang dicatat sistem, dan jadwal survei yang Anda ajukan.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              Data properti
            </strong>{" "}
            — informasi objek yang Anda titipkan untuk dijual atau disewakan,
            termasuk foto dan dokumen pendukung.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              Data transaksi
            </strong>{" "}
            — dokumen tagihan dan catatan pembayaran bagi pengguna terdaftar yang
            menggunakan fitur terkait.
          </li>
          <li>
            <strong className="font-semibold text-foreground">
              Data teknis
            </strong>{" "}
            — alamat IP, jenis peramban dan perangkat, sistem operasi, waktu
            akses, halaman yang dikunjungi, serta pengenal notifikasi dorong bila
            Anda mengizinkannya.
          </li>
        </LegalList>
        <p>
          Kami tidak dengan sengaja mengumpulkan data pribadi bersifat spesifik
          seperti data kesehatan, biometrik, catatan kejahatan, pandangan
          politik, maupun keyakinan beragama. Mohon tidak mengirimkan data
          semacam itu kepada kami.
        </p>
      </LegalSection>

      <LegalSection num="III" title="Dasar dan Tujuan Pemrosesan" id="tujuan">
        <p>Kami memproses data pribadi Anda untuk tujuan berikut:</p>
        <LegalList>
          <li>
            Menyediakan dan mengoperasikan layanan, termasuk pembuatan akun,
            penayangan properti, dan penjadwalan survei.
          </li>
          <li>
            Menghubungkan Anda dengan agen yang menangani properti yang Anda
            minati serta menindaklanjuti pertanyaan Anda.
          </li>
          <li>
            Menerbitkan dokumen transaksi dan memenuhi kewajiban administratif
            serta perpajakan.
          </li>
          <li>
            Mengirimkan pemberitahuan operasional dan, dengan persetujuan Anda,
            informasi pemasaran.
          </li>
          <li>
            Menjaga keamanan platform, mencegah penipuan, dan menyelidiki dugaan
            penyalahgunaan.
          </li>
          <li>
            Menganalisis penggunaan layanan secara agregat guna meningkatkan mutu
            fitur.
          </li>
          <li>Memenuhi kewajiban hukum dan menanggapi permintaan yang sah dari otoritas berwenang.</li>
        </LegalList>
        <p>
          Dasar pemrosesan yang kami gunakan adalah persetujuan Anda, pelaksanaan
          perjanjian layanan, pemenuhan kewajiban hukum, serta kepentingan sah
          yang seimbang dengan hak Anda.
        </p>
      </LegalSection>

      <LegalSection num="IV" title="Pembagian dan Akses Data" id="pembagian">
        <p>
          {SITE.name}{" "}
          <strong className="font-semibold text-foreground">
            tidak memperjualbelikan data pribadi Anda
          </strong>{" "}
          dan tidak membagikannya kepada pihak di luar perusahaan untuk tujuan
          pemasaran mereka.
        </p>
        <p>Data Anda dapat diakses secara terbatas oleh:</p>
        <LegalList>
          <li>
            Agen resmi {SITE.name} yang menangani permintaan Anda, sebatas data
            yang diperlukan untuk melayani permintaan tersebut.
          </li>
          <li>
            Staf internal untuk keperluan operasional, dukungan pengguna, dan
            penyelesaian keluhan.
          </li>
          <li>
            Penyedia layanan teknologi yang kami tunjuk — antara lain penyedia
            layanan basis data, penyimpanan berkas, pengiriman pesan, dan
            notifikasi — yang terikat perjanjian kerahasiaan dan hanya memproses
            data sesuai instruksi kami.
          </li>
          <li>
            Instansi berwenang, apabila diwajibkan oleh peraturan
            perundang-undangan atau berdasarkan putusan pengadilan.
          </li>
        </LegalList>
        <p>
          Setiap agen {SITE.name} terikat kewajiban kerahasiaan yang melarang
          mereka membagikan data pengguna ke pihak luar, memakainya untuk
          kepentingan pribadi atau usaha lain, maupun menyimpannya di luar sistem
          resmi perusahaan. Pelanggaran atas kewajiban tersebut merupakan
          tanggung jawab pribadi agen yang bersangkutan dan dapat berujung pada
          pencabutan akses serta penempuhan upaya hukum.
        </p>
      </LegalSection>

      <LegalSection num="V" title="Langkah Pengamanan" id="pengamanan">
        <p>
          Kami menerapkan langkah pengamanan teknis dan organisasi yang wajar
          untuk melindungi data pribadi Anda, antara lain:
        </p>
        <LegalList>
          <li>
            Enkripsi data pada saat dikirimkan melalui jaringan maupun pada saat
            disimpan.
          </li>
          <li>
            Penyimpanan kata sandi dalam bentuk acak satu arah yang tidak dapat
            dikembalikan ke bentuk semula.
          </li>
          <li>
            Pembatasan akses berbasis peran, sehingga setiap pengguna internal
            hanya dapat melihat data yang relevan dengan tugasnya.
          </li>
          <li>
            Pencatatan jejak aktivitas (<em>audit log</em>) atas akses dan
            perubahan data penting.
          </li>
          <li>Peninjauan keamanan dan pemutakhiran sistem secara berkala.</li>
          <li>
            Pembekalan mengenai perlindungan data pribadi bagi agen dan staf.
          </li>
        </LegalList>
        <p>
          Kendati demikian, tidak ada sistem elektronik yang sepenuhnya kebal
          dari risiko. Anda turut berperan menjaga keamanan data dengan
          menggunakan kata sandi yang kuat, tidak membagikannya kepada siapa pun,
          dan keluar dari akun setelah menggunakan perangkat bersama.
        </p>
      </LegalSection>

      <LegalSection num="VI" title="Penanganan Insiden Kebocoran Data" id="insiden">
        <p>
          Apabila terjadi dugaan atau insiden kebocoran data pribadi, kami akan
          menempuh langkah berikut:
        </p>
        <LegalList ordered>
          <li>
            Melakukan pengamanan segera untuk menghentikan dan membatasi dampak
            insiden.
          </li>
          <li>
            Memberitahukan Subjek Data yang terdampak serta lembaga berwenang
            dalam waktu paling lambat 3 x 24 jam sejak insiden diketahui, sesuai
            ketentuan yang berlaku.
          </li>
          <li>
            Melaksanakan pemeriksaan menyeluruh dengan sasaran penyelesaian tahap
            awal dalam 14 (empat belas) hari kalender, yang dapat diperpanjang
            bila kompleksitas insiden menuntut demikian.
          </li>
          <li>
            Mengambil tindakan korektif, termasuk pencabutan akses pihak yang
            terlibat dan perbaikan sistem.
          </li>
        </LegalList>
        <p>
          Pemberitahuan kepada Anda akan memuat keterangan mengenai data yang
          terdampak, waktu kejadian, dan langkah penanganan yang telah kami
          lakukan.
        </p>
      </LegalSection>

      <LegalSection num="VII" title="Hak Anda sebagai Subjek Data" id="hak-subjek-data">
        <p>Sesuai peraturan perundang-undangan yang berlaku, Anda berhak untuk:</p>
        <LegalList>
          <li>Memperoleh informasi dan mengakses data pribadi milik Anda.</li>
          <li>Memperbaiki data yang tidak akurat atau tidak lengkap.</li>
          <li>
            Meminta penghapusan data pribadi Anda sepanjang tidak bertentangan
            dengan kewajiban penyimpanan menurut hukum.
          </li>
          <li>
            Memperoleh salinan data Anda dalam format yang lazim digunakan dan
            dapat dibaca sistem lain.
          </li>
          <li>
            Menarik kembali persetujuan pemrosesan yang sebelumnya Anda berikan.
          </li>
          <li>
            Mengajukan keberatan atas pemrosesan tertentu, termasuk pengambilan
            keputusan otomatis yang berdampak hukum bagi Anda.
          </li>
          <li>
            Menunda atau membatasi pemrosesan data yang sedang dipersengketakan.
          </li>
          <li>Mengajukan pengaduan kepada kami maupun kepada lembaga berwenang.</li>
        </LegalList>
        <p>
          Permohonan pelaksanaan hak dapat Anda sampaikan melalui kanal resmi
          pada bagian X. Demi keamanan, kami akan memverifikasi identitas
          pemohon terlebih dahulu, dan menanggapi permohonan dalam waktu paling
          lambat 3 x 24 jam sejak identitas terverifikasi.
        </p>
        <p>
          Penarikan persetujuan tidak memengaruhi keabsahan pemrosesan yang telah
          dilakukan sebelumnya, namun dapat mengakibatkan sebagian layanan tidak
          lagi dapat kami berikan kepada Anda.
        </p>
      </LegalSection>

      <LegalSection num="VIII" title="Penyimpanan dan Penghapusan Data" id="retensi">
        <p>
          Kami menyimpan data pribadi hanya selama diperlukan untuk memenuhi
          tujuan pemrosesan sebagaimana diuraikan pada bagian III, atau selama
          jangka waktu yang diwajibkan peraturan perundang-undangan — misalnya
          kewajiban penyimpanan dokumen transaksi dan perpajakan.
        </p>
        <p>
          Setelah jangka waktu penyimpanan berakhir atau permohonan penghapusan
          Anda dikabulkan, data akan kami hapus secara permanen atau kami ubah
          menjadi bentuk anonim yang tidak lagi dapat dikaitkan dengan diri Anda.
          Data anonim dapat kami pertahankan untuk keperluan analisis statistik.
        </p>
      </LegalSection>

      <LegalSection num="IX" title="Kuki dan Penyimpanan Lokal" id="kuki">
        <p>
          Platform ini menggunakan kuki (<em>cookie</em>) dan penyimpanan lokal
          pada peramban Anda untuk:
        </p>
        <LegalList>
          <li>
            Menjaga sesi masuk Anda agar tidak perlu memasukkan kata sandi
            berulang kali.
          </li>
          <li>
            Mengingat preferensi tampilan seperti mode gelap, warna aksen, dan
            ukuran teks.
          </li>
          <li>Menjaga keamanan sesi dan mencegah penyalahgunaan akun.</li>
          <li>Mengukur penggunaan fitur secara agregat.</li>
        </LegalList>
        <p>
          Anda dapat menghapus atau membatasi kuki melalui pengaturan peramban.
          Perlu diperhatikan bahwa mematikan kuki yang bersifat esensial akan
          menyebabkan Anda tidak dapat masuk ke akun dan sebagian fitur tidak
          berfungsi sebagaimana mestinya.
        </p>
      </LegalSection>

      <LegalSection num="X" title="Menghubungi Kami" id="kontak">
        <p>
          Untuk pertanyaan, permohonan pelaksanaan hak, atau pengaduan mengenai
          pengelolaan data pribadi, silakan menghubungi kami melalui WhatsApp
          resmi{" "}
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
          Apabila Anda menilai tanggapan kami belum memadai, Anda berhak
          mengajukan pengaduan kepada lembaga yang berwenang di bidang
          perlindungan data pribadi di Republik Indonesia.
        </p>
      </LegalSection>

      <LegalSection num="XI" title="Perubahan Kebijakan" id="perubahan">
        <p>
          Kebijakan Privasi ini dapat kami perbarui sewaktu-waktu mengikuti
          perkembangan layanan maupun perubahan peraturan. Versi terbaru berlaku
          sejak dimuat pada halaman ini, dan tanggal pembaruan dicantumkan pada
          bagian atas dokumen.
        </p>
        <p>
          Untuk perubahan yang bersifat mendasar dan berdampak besar terhadap hak
          Anda, kami akan berupaya menyampaikan pemberitahuan melalui surel atau
          pemberitahuan di dalam aplikasi.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
