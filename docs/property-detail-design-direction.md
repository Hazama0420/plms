# Property Detail Design Direction (Implemented)

Desktop + Mobile

## UX Diagnosis Summary

**Key Problems:**
1. Bento gallery mungkin terlalu intensif - 3 kolom di mobile medium
2. Info layout berlebihan - badge badge + header yang terlalu banyak
3. Specs tidak hanya menjelaskan tapi memperkuat pembacaan
4. KPR calculator terlalu terpisah secara visual (harus inti)

**Design Hers:**
Gunakan: `Hero Gallery → Price → Title/Location → Key Specs → Story → Features → Gallery → Agent → Inquiry/Survey → Related Properties`

## Desktop Composition

1. Header (back + actions)
2. Hero Gallery (4:3 aspect) dengan thumbnail strip compact
3. Bento Content (8 sidebar 4):
   - Title + Price + Location (prominent)
   - Specs grid (4 kolom compact) - KEY
   - Selling Points (editorial box)
   - Full Description (readable)
   - KPR Calculator (integrated)
4. Sticky Aside - Agent Profile (sticky di desktop)

## Mobile Composition

1. Header (compact)
2. Hero Gallery (1 kolom) - no在高占比文字 overlay
3. Title and specs in vertical composition
4. Story sections stacked
5. Agent CTA sticky di bawah

## Typography

- Title: text-2xl sm:text-3xl lg:text-4xl font-extrabold
- Price: text-2xl sm:text-3xl font-black
- Section headers: text-xs font-bold uppercase tracking-wide
- Body: text-sm sm:text-base

## Color Usage

- Emerald = primary CTA + price + specs + agent badges
- Dark = hero gallery background (darkest map highest detail)
- White/slate = content surfaces
- Charcoal = main text

## Motion

- Image scale hover
- Spec badges subtle mushroom
- KPR slider always visible (connected to price)
