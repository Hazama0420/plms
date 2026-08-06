// app/(dashboard)/legal/syarat-ketentuan/page.tsx
import type { Metadata } from "next";
import { SITE, WHATSAPP_HREF } from "@/lib/site-config";
import {
  LegalArticle,
  LegalList,
  LegalSection,
} from "@/components/legal/LegalArticle";

export const metadata: Metadata = {
  title: `Syarat dan Ketentuan | ${SITE.name}`,
  description:
    "Syarat dan ketentuan penggunaan platform Inland Property bagi pengunjung maupun pengguna terdaftar.",
};

export default function SyaratKetentuanPage() {
  return (
    <LegalArticle
      title="Syarat dan Ketentuan"
      intro={
        <>
          <p>
            Selamat datang di platform {SITE.name}. Dokumen ini mengatur
            hubungan antara Anda sebagai pengguna dengan {SITE.name} selaku
            penyelenggara layanan pencarian, pemasaran, dan pengelolaan
            informasi properti.
          </p>
          <p>
            Dengan mengakses maupun menggunakan platform ini — baik sebagai
            pengunjung tanpa akun (tamu) maupun sebagai pengguna terdaftar —
            Anda dianggap telah membaca, memahami, dan menyetujui seluruh
            ketentuan di bawah ini. Apabila Anda tidak menyetujui salah satu
            bagian daripadanya, kami mempersilakan Anda untuk menghentikan
            penggunaan platform.
          </p>
        </>
      }
    >
      <LegalSection num="I" title="Penerimaan dan Perubahan Ketentuan" id="penerimaan">
        <p>
          Persetujuan atas Syarat dan Ketentuan ini terbentuk pada saat Anda
          mulai mengakses platform, tanpa memerlukan tanda tangan atau
          konfirmasi terpisah. Persetujuan tersebut berlaku untuk seluruh
          halaman dan fitur, termasuk halaman yang dapat dibuka tanpa login
          seperti daftar properti dan kalkulator KPR.
        </p>
        <p>
          {SITE.name} berhak memperbarui, menambah, atau mengubah isi dokumen
          ini sewaktu-waktu sesuai kebutuhan operasional maupun perubahan
          peraturan perundang-undangan. Versi terbaru akan langsung berlaku
          sejak dimuat di halaman ini, dan tanggal pembaruan dicantumkan pada
          bagian atas dokumen. Kami menganjurkan Anda meninjau halaman ini
          secara berkala. Penggunaan platform yang Anda lanjutkan setelah
          pembaruan dimuat dipandang sebagai penerimaan atas versi yang baru.
        </p>
      </LegalSection>

      <LegalSection num="II" title="Ruang Lingkup Layanan" id="ruang-lingkup">
        <p>
          {SITE.name} adalah platform yang mempertemukan pemilik properti dan
          agen pemasaran dengan calon pembeli maupun calon penyewa. Peran kami
          terbatas pada penyediaan sarana pencarian, penayangan, dan
          pengelolaan informasi properti.
        </p>
        <p>
          Perlu Anda pahami bahwa {SITE.name}{" "}
          <strong className="font-semibold text-foreground">
            bukan merupakan pihak dalam transaksi
          </strong>{" "}
          jual beli maupun sewa menyewa yang terjadi antara pemilik, agen, dan
          calon pembeli atau penyewa. Kami tidak bertindak sebagai penjual,
          pembeli, penjamin, penilai, notaris, maupun lembaga pembiayaan.
          Seluruh negosiasi harga, pemeriksaan legalitas dokumen, penandatanganan
          perjanjian, dan penyelesaian pembayaran berlangsung di luar platform
          dan sepenuhnya menjadi kewenangan serta tanggung jawab para pihak yang
          bertransaksi.
        </p>
        <p>Layanan yang kami sediakan mencakup, namun tidak terbatas pada:</p>
        <LegalList>
          <li>Penayangan katalog properti beserta foto, spesifikasi, dan harga.</li>
          <li>Pencarian dan penyaringan properti berdasarkan kriteria pengguna.</li>
          <li>
            Simulasi cicilan kredit pemilikan rumah melalui fitur Kalkulator KPR.
          </li>
          <li>
            Penghubungan calon pembeli atau penyewa dengan agen {SITE.name} yang
            menangani properti terkait.
          </li>
          <li>
            Penjadwalan survei properti serta pengelolaan tindak lanjut oleh agen.
          </li>
          <li>
            Fitur internal bagi pengguna terdaftar seperti pengelolaan prospek,
            laporan, dan penerbitan dokumen transaksi.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection num="III" title="Akses Tamu dan Akun Pengguna" id="akun">
        <p>
          Sebagian halaman dapat diakses tanpa mendaftar. Fitur yang menuntut
          interaksi lebih lanjut — antara lain menghubungi agen, mengajukan
          jadwal survei, dan seluruh menu pengelolaan internal — hanya terbuka
          bagi pengguna yang telah memiliki akun terverifikasi.
        </p>
        <p>Sebagai pemilik akun, Anda menyatakan dan menjamin bahwa:</p>
        <LegalList>
          <li>
            Data yang Anda daftarkan adalah benar, akurat, mutakhir, dan merupakan
            milik Anda sendiri atau Anda berwenang penuh untuk menggunakannya.
          </li>
          <li>
            Anda berusia sekurang-kurangnya 18 tahun atau telah cakap melakukan
            perbuatan hukum menurut hukum Republik Indonesia.
          </li>
          <li>
            Anda bertanggung jawab menjaga kerahasiaan kata sandi serta seluruh
            aktivitas yang terjadi melalui akun Anda.
          </li>
          <li>
            Anda akan segera memberi tahu kami apabila mengetahui adanya
            penggunaan akun tanpa izin.
          </li>
        </LegalList>
        <p>
          {SITE.name} berhak menangguhkan atau menutup akun yang terindikasi
          memuat data palsu, digunakan untuk tujuan melawan hukum, atau melanggar
          ketentuan dalam dokumen ini.
        </p>
      </LegalSection>

      <LegalSection num="IV" title="Publikasi Data Properti" id="publikasi">
        <p>
          Apabila Anda menyerahkan data atau informasi mengenai penjualan atau
          penyewaan suatu properti kepada agen {SITE.name} untuk ditayangkan di
          platform, maka Anda memberikan izin kepada kami untuk menampilkan,
          menyimpan, menyalin, menyunting seperlunya, menyesuaikan format, serta
          menyebarluaskan data tersebut — baik sebagian maupun seluruhnya — pada
          platform {SITE.name} dan kanal pemasaran resmi yang kami kelola.
        </p>
        <p>
          Izin tersebut diberikan tanpa kewajiban pembayaran royalti dalam bentuk
          apa pun, dan berlaku selama data properti masih ditayangkan. Anda dapat
          meminta penghentian penayangan dengan menghubungi agen penanggung jawab
          atau kanal resmi kami.
        </p>
        <p>Dengan menyerahkan data properti, Anda menyatakan bahwa:</p>
        <LegalList>
          <li>
            Anda adalah pemilik sah properti tersebut atau telah memperoleh kuasa
            tertulis dari pemiliknya.
          </li>
          <li>
            Informasi mengenai luas, harga, status kepemilikan, dan kelengkapan
            dokumen adalah benar.
          </li>
          <li>
            Foto dan materi yang Anda unggah tidak melanggar hak cipta maupun hak
            pihak lain.
          </li>
        </LegalList>
        <p>
          Segala tuntutan yang timbul dari ketidakbenaran pernyataan di atas
          menjadi tanggung jawab pihak yang menyerahkan data.
        </p>
      </LegalSection>

      <LegalSection num="V" title="Kewajiban dan Larangan Pengguna" id="larangan">
        <p>
          Anda sepakat menggunakan platform ini secara wajar, beritikad baik, dan
          sesuai peraturan perundang-undangan yang berlaku. Anda dilarang
          melakukan hal-hal berikut:
        </p>
        <LegalList>
          <li>
            Mencemarkan nama baik, mengancam, melecehkan, atau merendahkan
            martabat orang lain melalui sarana apa pun di platform ini.
          </li>
          <li>
            Menyampaikan pernyataan yang mengandung unsur suku, agama, ras, dan
            antargolongan (SARA), ujaran kebencian, atau konten asusila.
          </li>
          <li>
            Memuat informasi properti fiktif, menyesatkan, atau harga yang
            sengaja tidak sesuai kenyataan.
          </li>
          <li>
            Mengambil data platform secara massal dan otomatis (
            <em>scraping</em>, <em>crawling</em>, atau penggunaan{" "}
            <em>bot</em>) tanpa izin tertulis dari {SITE.name}.
          </li>
          <li>
            Menghubungi pengguna lain untuk keperluan di luar transaksi properti,
            termasuk penawaran produk yang tidak diminta.
          </li>
          <li>
            Menyalahgunakan data pribadi pengguna lain yang Anda peroleh melalui
            platform.
          </li>
          <li>
            Mengganggu, membebani, atau berusaha menembus sistem keamanan
            platform, termasuk melakukan pengujian penetrasi tanpa izin tertulis.
          </li>
          <li>
            Menggunakan platform untuk kegiatan yang melanggar hukum Republik
            Indonesia, termasuk pencucian uang dan penipuan.
          </li>
        </LegalList>
        <p>
          Pelanggaran atas larangan di atas dapat berakibat penutupan akses,
          penghapusan konten, dan bila diperlukan penempuhan upaya hukum.
        </p>
      </LegalSection>

      <LegalSection num="VI" title="Perubahan dan Penghentian Layanan" id="perubahan-layanan">
        <p>
          {SITE.name} berhak menambah, mengubah, membatasi, menangguhkan, atau
          menghentikan seluruh maupun sebagian fitur platform, termasuk melakukan
          pemeliharaan sistem yang dapat menyebabkan layanan tidak dapat diakses
          untuk sementara waktu.
        </p>
        <p>
          Kami akan berupaya menyampaikan pemberitahuan sebelumnya untuk
          perubahan yang berdampak besar. Namun untuk tindakan yang bersifat
          mendesak — misalnya penanganan gangguan keamanan — perubahan dapat
          dilakukan tanpa pemberitahuan terlebih dahulu. {SITE.name} tidak
          berkewajiban memberikan ganti rugi atas ketidaktersediaan layanan yang
          bersifat sementara.
        </p>
      </LegalSection>

      <LegalSection num="VII" title="Tautan ke Situs Pihak Ketiga" id="tautan">
        <p>
          Platform ini dapat memuat tautan menuju situs, aplikasi, atau layanan
          milik pihak ketiga, termasuk kanal perpesanan, peta, dan lembaga
          pembiayaan. Tautan tersebut disediakan semata-mata untuk kemudahan Anda.
        </p>
        <p>
          {SITE.name} tidak mengendalikan dan tidak bertanggung jawab atas isi,
          kebijakan privasi, praktik keamanan, maupun kerugian yang timbul dari
          pengaksesan situs pihak ketiga tersebut. Penggunaan layanan pihak ketiga
          tunduk pada syarat dan ketentuan masing-masing penyedia, dan sepenuhnya
          menjadi risiko Anda sendiri.
        </p>
      </LegalSection>

      <LegalSection num="VIII" title="Komunikasi, Buletin, dan Notifikasi" id="komunikasi">
        <p>
          Dengan menggunakan platform dan mendaftarkan kontak Anda, Anda
          menyetujui penerimaan komunikasi dari {SITE.name} melalui surel, pesan
          WhatsApp, dan notifikasi dorong (<em>push notification</em>) pada
          peramban maupun perangkat Anda.
        </p>
        <p>Komunikasi tersebut dapat berupa:</p>
        <LegalList>
          <li>
            Pesan operasional, seperti konfirmasi pendaftaran, pengaturan ulang
            kata sandi, pengingat jadwal survei, dan pemberitahuan tindak lanjut
            agen.
          </li>
          <li>
            Pesan pemasaran, seperti informasi properti baru, promosi, dan
            buletin berkala.
          </li>
        </LegalList>
        <p>
          Anda dapat berhenti menerima pesan pemasaran kapan saja melalui tautan{" "}
          <em>berhenti berlangganan</em> pada surel yang kami kirim, mematikan
          izin notifikasi di pengaturan peramban atau perangkat, atau menghubungi
          kami langsung. Perlu dicatat bahwa pesan operasional tetap dikirimkan
          selama akun Anda aktif, karena pesan tersebut merupakan bagian yang
          tidak terpisahkan dari layanan.
        </p>
      </LegalSection>

      <LegalSection num="IX" title="Dokumen yang Berkaitan" id="dokumen-terkait">
        <p>
          Syarat dan Ketentuan ini merupakan satu kesatuan yang tidak terpisahkan
          dengan Pengecualian Tanggung Jawab, Kebijakan Privasi, dan Pemberitahuan
          Hak Cipta {SITE.name}. Ketiga dokumen tersebut dapat Anda baca melalui
          tautan pada bagian bawah setiap halaman.
        </p>
        <p>
          Apabila terdapat pertentangan penafsiran antara dokumen-dokumen
          tersebut, maka ketentuan yang lebih khusus mengenai pokok persoalan
          yang bersangkutan yang akan berlaku.
        </p>
      </LegalSection>

      <LegalSection num="X" title="Hukum yang Berlaku dan Penyelesaian Sengketa" id="yurisdiksi">
        <p>
          Syarat dan Ketentuan ini disusun, tunduk, dan ditafsirkan berdasarkan
          hukum Negara Republik Indonesia.
        </p>
        <p>
          Setiap perselisihan yang timbul akan diupayakan penyelesaiannya secara
          musyawarah untuk mufakat dalam jangka waktu 30 (tiga puluh) hari
          kalender sejak salah satu pihak menyampaikan pemberitahuan tertulis.
          Apabila musyawarah tidak mencapai kesepakatan, para pihak sepakat
          menyelesaikan perselisihan melalui Pengadilan Negeri yang berwenang di
          wilayah Republik Indonesia.
        </p>
        <p>
          Apabila satu atau beberapa ketentuan dalam dokumen ini dinyatakan tidak
          sah atau tidak dapat diberlakukan oleh pengadilan, maka ketentuan
          lainnya tetap berlaku dan mengikat sepenuhnya.
        </p>
      </LegalSection>

      <LegalSection num="XI" title="Hubungi Kami" id="hubungi-kami">
        <p>
          Untuk pertanyaan, saran, atau keluhan sehubungan dengan Syarat dan
          Ketentuan ini, silakan menghubungi kanal resmi {SITE.name}:
        </p>
        <LegalList>
          <li>
            WhatsApp:{" "}
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-600 dark:text-emerald-400"
            >
              {SITE.whatsapp}
            </a>
          </li>
        </LegalList>
        <p>
          Kami berupaya menanggapi setiap penyampaian dalam waktu 3 (tiga) hari
          kerja sejak diterima. Demi keamanan Anda, pastikan komunikasi hanya
          dilakukan melalui nomor resmi di atas.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
