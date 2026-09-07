# Property Detail UX Diagnosis

Dari inspeksi kode existing property detail:

## Masalah UX Utama

1. **Bento Gallery Gambar Mungkin Terlalu Intensif**
   - 3 kolom grid untuk foto di mobile/medium breakpoint
   - Thumbnail strip menumpuk horizontal padahal bisa dirender sebagai modal atau expanded view
   - Lightbox sudah ada, jadi thumbnail strip bisa lebih compact menjadi indicator overlay

2. **Information Layout Benda Besar**
   - Badge-badge (Jual/Sewa, prop_type, status) di atas foto utama membuat foto utama teredup
   - Stats specs di garis horizontal (bedroom, bathroom, luas tanah/bangunan) tidak mempertegas pembacaan
   - Detail Lengkap section bisa jadi progressive disclosure (jambar) bukan continue a list

3. **Kalkulator KPR Terlalu Terpisah Secara Visual**
   - Secara semantic, ini adalah helpful tool masuk, bukan statement bisnis utama
   - Lebih baik di-place lebih dekat ke CTA inquiry atau jadi sticky A sidebar

4. **Brand Identity Visual Terfragmentasi**
   - Emerald tersebar di banyak elemen tapi tidak cohesive
   - Sections berdiri sendiri tanpa visual anchor editorial

## Key Insights

1. Hero gallery harus benar-benar hero: foto mewah, harga jelas, title jelas, minimal UI chrome
2. Specs harus mempertegas dis-infersi: luas tanah/bangunan harus lebih menonjol
3. CTA should be unclickdown focus area: agent + inquiry tanpa distraksi
4. Property photography adalah product, bukan decorative element

## Design Direction Prioritas

Gunakan hierarchy editorial:
`Hero Gallery → Price → Title/Location → Key Specs → Story → Features → Gallery → Agent → Inquiry/Survey → Related Properties`

Gunakan layout yang berani tetapi konsisten.

										