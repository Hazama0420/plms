# Dashboard UX Diagnosis

Dari inspeksi kode existing dashboard:

## Masalah UX Utama

1. **Visual Hierarchy Lemah**
   - Semua section (featured, latest, proyek inland, agent, agenda) memiliki bobot visual yang hampir sama dengan border-bottom dan header yang identik
   - Hero search sudah bagus, tapi marah-jalan: password card-based bila memanggil attention
   - Stats bisa dinormalisasi dan digabung ke section yang lebih berisi action

2. **Density Tinggi di Mobile**
   - 3 kolom grid untuk property card (mobile idealnya 1 atau 2)
   - Filter tabs yang terlalu banyak di area hero
   - Properti unggulan + terbaru + agent carousel + agenda semua tampil sekaligus

3. **Information Architecture Bercerita Ganda**
   - "Properti Unggulan" vs "Properti Terbaru" membingungkan user: apa bedanya?
   - Agent carousel muncul besar-besaran padahal user mungkin sudah puas dulu dengan properti
   - Agenda hanya muncul untuk agent: tidak terprioritisasi secara visual

4. **Brand Signal Terfragmentasi**
   - Emerald density tinggi tapi tidak konsisten
   - Tidak ada hero editorial yang menonjolkan INLAND sebagai brand
   - Tidak ada visual storytelling untuk engagement

## Key Insights

1. Dashboard harus 60% actions, 30% context, 10% stats
2. Hari ini agen harus fokus pada pending follow-up, tidak pada overview statistik
3. Stats bisa digunakan untuk performance insight, tidak sebagai headline visual
4. Mobile harus breath-last-first tanpa nycreenscroll

## Design Direction Prioritas

Gunakan hierarchy mental model:
`What needs attention? → What should I do? → What is happening? → Performance`

Gunakan section yang lebih konteks-based, bukan sekadar "statistik" + "list".
