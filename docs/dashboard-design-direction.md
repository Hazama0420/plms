# Dashboard Design Direction (Implemented)

Desktop + Mobile

## UX Diagnosis Summary

**Key Problems:**
1. Visual hierarchy lemah - semua section sama bobot visual
2. Density tinggi di mobile - 3 kolom grid tidak optimal
3. Information architecture bercerita ganda - user bingung bedanya properti unggulan vs terbaru
4. Brand signal terfragmentasi - emerald tersebar tapi tidak cohesive

**Design Hers:**
Gunakan: `What needs attention? → What should I do? → What is happening? → Performance`

## Desktop Composition

1. Greeting (tailored to logged in state)
2. Search (compact + consistent)
3. Action Needed (only for agents with pending items - 60% action)
4. Featured Properties (3 kolomit grid) (30% work)
5. Performance Stats Grid (compact summary)
6. Recent Leads (only for admin - 10% context)

## Mobile Composition

1. Greeting
2. Search (full width)
3. Action Needed (scrollable list) (URGENT - must be visible)
4. Featured Properties (1 column grid - compact)
5. Performance (2 cols)
6. Reports (2 cols)
7. New Properties (1 column)
8. Team Agent Carousel (compact)

## Typography

- Headline: text-2xl sm:text-3xl font-weight-extrabold
- Section titles: text-xs sm:text-sm font-bold uppercase tracking-wide
- Body: text-sm text-muted-foreground

## Color Usage

- Emerald = primary CTA + action-needed badges + specs
- Charcoal = main text
- White/Slate = surfaces
- Amber = urgency/important flags

## Motion

- Skeleton loading states
- Subtle card hover effects
- No aggressive animations
