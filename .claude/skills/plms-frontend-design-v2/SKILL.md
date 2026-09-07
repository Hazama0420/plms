---
name: plms-frontend-design
description: "Use when designing, auditing, refactoring, or implementing the PLMS frontend experience for INLAND Property. Focuses on premium real-estate UX, mobile-first responsive composition, INLAND brand identity, emerald-green brand preservation, editorial typography, property storytelling, purposeful motion, accessibility, and conversion from property discovery to inquiry/survey. Use for public pages, property catalog/detail, agent workspace, CRM UI simplification, navigation, responsive layout, design-system decisions, and visual-polish work."
license: MIT
metadata:
  author: "INLAND Property / PLMS"
  version: "2.0.0"
  domain: "product-design"
  role: "senior-product-designer + frontend-architect"
  scope: "design-and-implementation"
  output-format: "audit, design-spec, or code"
  related-skills:
    - plms-engineer
    - nextjs-developer
    - react-expert
    - typescript-pro
    - code-reviewer
---

# PLMS Frontend Design v2

## Role

Act as the **Senior Product Designer + Mobile-First Frontend Architect for INLAND Property**.

Design PLMS as a premium Indonesian real-estate product with two deliberately different experiences:

1. **Public / Client Experience** — property discovery, search, property detail, KPR, inquiry, survey.
2. **Agent / Operations Experience** — dashboard, property management, CRM, follow-up, survey management, invoices, projects, notifications, reports, settings, admin.

Do not treat PLMS as a generic SaaS dashboard and do not copy the visual language of major property portals.

## Context

PLMS is an existing production-oriented application built with:

- Next.js 16.2.10 App Router
- React 19.2.4
- TypeScript 5.x
- Tailwind CSS 4.x
- shadcn/ui / Radix / Base UI
- Supabase
- Zustand + TanStack React Query
- React Hook Form + Zod
- Recharts
- Framer Motion
- sharp
- OneSignal
- Fonnte / WhatsApp
- AI providers (Agnes, Groq, Gemini)
- Vercel

Existing PLMS structure already includes:

- public `/dashboard`
- public `/properties`
- public `/properties/[id]`
- `/kpr-calculator`
- login/register
- `/crm`
- leads
- follow-ups
- surveys
- invoices
- projects
- notifications
- reports
- settings
- admin
- existing `BottomNav`
- existing property/search/inquiry/dashboard components
- existing shadcn/ui primitives

Existing brand identity must be preserved. The primary INLAND brand color is **emerald green** and must remain recognizable.

Current source evidence includes:
- `app/layout.tsx` using Inter globally.
- `app/globals.css` defining emerald as the default primary and also supporting alternate accent themes.
- `BottomNav` already provides role-aware mobile navigation.
- Public property routes already support gallery, specs, agent information, inquiry, and structured property data.

## Design Philosophy

PLMS should feel like:

**Premium Property Discovery + Professional Real-Estate Workspace**

not:

**Generic Admin Dashboard + Property Listing Database**

Design goals:

- elegant
- modern
- calm
- confident
- premium
- editorial
- trustworthy
- image-led
- highly usable
- conversion-focused
- recognizably INLAND

## Core UX Model

### Public / Client

Use this mental model:

`Discover → Explore → Desire → Trust → Inquire → Survey`

The primary visual hierarchy is:

`Property Photography → Price → Property Identity → Location → Key Specs → Trust → Agent → CTA`

### Agent / Internal

Use this mental model:

`What needs attention? → What should I do? → What is happening? → Performance`

The hierarchy is:

`Action Needed → Core Work → Recent Activity → Performance → Secondary Metrics`

## Brand Identity Rules

### Emerald is mandatory

Emerald green is a protected brand asset.

- Do not remove emerald from the visual system.
- Do not replace emerald with blue, purple, gold, or another dominant accent.
- Emerald should remain the primary action/accent color for INLAND.
- Secondary colors are allowed only as supporting tones.
- Secondary colors must never visually overpower emerald.
- Preserve sufficient contrast between emerald and neutrals.

Recommended relationship:

- INLAND Emerald = brand + primary CTA + active states + important highlights
- Charcoal = main text
- Warm Ivory / Off-White = premium surface/background
- Stone / Cool Gray = supporting surfaces
- Optional muted gold / brass = restrained premium accent
- Optional deep forest = dark editorial sections
- Destructive red = errors only
- Status colors = functional, not decorative

Do not turn the interface into a green UI. Emerald should be **intentional, not ubiquitous**.

## Visual Direction

### Public Experience

Use:
- large property photography
- editorial spacing
- strong typographic hierarchy
- restrained UI chrome
- asymmetrical compositions where appropriate
- section numbering such as `01`, `02`, `03`
- subtle borders
- soft radius
- refined shadow usage
- generous whitespace
- immersive property detail pages

Avoid:
- generic SaaS dashboards
- excessive cards
- excessive badges
- excessive gradients
- excessive shadows
- excessive glassmorphism
- equal visual weight for every element
- dense metadata
- oversized UI chrome

### Agent Experience

Use:
- calm structured layouts
- action-first hierarchy
- concise cards
- clear status
- compact but breathable data presentation
- responsive tables that transform into cards on mobile
- progressive disclosure
- strong task prioritization

Do not sacrifice agent productivity for decoration.

## Typography System

The existing application currently uses Inter globally. Do not remove or replace the global UI font blindly.

Use a two-tier typography concept:

### Display / Editorial
A distinctive, elegant serif or humanist display face may be introduced for:
- hero headlines
- major property storytelling headings
- premium section titles

### UI / Data
Keep a clean sans-serif for:
- navigation
- prices
- buttons
- forms
- metadata
- tables
- filters
- CRM
- settings

Rules:
- Never use the display font for dense UI.
- Use maximum 1 display family + 1 UI family.
- Typography must remain readable in Bahasa Indonesia.
- Use expressive typography sparingly so the brand feels intentional rather than decorative.
- Large headlines should have controlled line length.

## Layout System

### Mobile

Design as a dedicated composition.

Default goals:
- single-column flow
- breathable horizontal padding
- compact but comfortable controls
- large image area
- clear primary CTA
- bottom navigation where appropriate
- bottom sheet for advanced filtering
- sticky CTA only when it improves conversion
- no horizontal overflow
- no desktop tables
- no "desktop UI squeezed into phone width"

### Tablet

Use:
- 2-column where content naturally pairs
- reduced navigation chrome
- responsive grids
- modal/bottom-sheet filters depending on available width

### Desktop

Use:
- spacious max-width content
- editorial hero compositions
- 3-column property grids where appropriate
- side-by-side detail layouts
- persistent filters only when useful
- clear page rhythm

Do not make desktop layouts unnecessarily sparse.

## Page Experience Architecture

### 1. Public Home

Preferred hierarchy:

1. compact header
2. editorial hero
3. search
4. quick filters
5. featured properties
6. locations
7. trust / why INLAND
8. KPR / helpful tools
9. agent / service CTA
10. footer

Primary goal: get users to property discovery.

### 2. Property Listing

Hierarchy:

1. search
2. quick filter chips
3. result count
4. sorting
5. property cards
6. advanced filter sheet/drawer

Desktop:
`filters | property grid`

Mobile:
`search | quick filters | result | vertical cards`

Never force table view on public mobile discovery.

### 3. Property Detail

This is a core INLAND differentiator.

Use:

`Hero Gallery → Price → Title/Location → Key Specs → Story → Features → Gallery → Agent → Inquiry/Survey → Related Properties`

The page should feel closer to an **editorial architecture/property showcase** than a database record.

### 4. Agent Dashboard

Use:

`Greeting → Action Needed → My Properties → Recent Leads → Today's Follow-up → Performance`

Do not place a large row of equal-weight statistics above the actual work.

### 5. Property Management

Use:

`My Properties → Status → Search/Filter → Listing Cards/Table`

Cards must emphasize:
- image
- title
- price
- status
- leads/views where meaningful
- one primary action
- overflow menu for secondary actions

### 6. Create Property

Use a wizard or staged form:

`Basic → Location → Price → Specs → Media → Agent/Ownership → Review/Publish`

Do not expose every field in one long mobile form.

### 7. CRM

Simplify the UI.

Use:

`Search → Filters → Action Needed → Lead List → Lead Detail`

Lead detail:

`Contact → Property Interest → Pipeline → Activity → Follow-up`

Do not show every piece of CRM metadata simultaneously.

### 8. Follow-up

Prefer task-oriented agenda views:

`Today → Overdue → Upcoming → Completed`

Each item should clearly communicate:
- person
- property/context
- action
- time
- status
- next step

### 9. Survey

Prefer scheduling clarity:
`Requested → Scheduled → Upcoming → Completed`

### 10. KPR

Treat KPR as a conversion tool:

`Input → Monthly Estimate → Affordability Insight → Relevant Properties → Inquiry`

### 11. Reports

Prioritize interpretation:

`Overview → Trend → Property/Lead Performance → Agent Performance → Actionable Insight`

Do not create chart walls.

### 12. Admin / Settings / Operations

Use utility-first layouts.

Do not force the editorial property aesthetic into every internal screen.

## Property Card Rules

A property card is a visual sales unit, not a database row.

Priority:

1. image
2. title
3. price
4. location
5. 2–4 key specs
6. trust/agent signal
7. one primary action
8. favorite

Do not show every field on the card.

Bad:
- 5+ badges
- listing code
- every legal field
- every status
- multiple equal-weight buttons

Good:
- 1 meaningful badge
- favorite
- price
- location
- essential specs
- subtle action

## Navigation Rules

Public navigation should optimize discovery.

Agent navigation should optimize work.

Use role-aware navigation but keep mental models stable.

Existing `BottomNav` can be reused and refined rather than replaced without reason.

Public example:
`Home | Search | Saved/KPR | Profile`

Agent example:
`Home | Property | + | Leads | More`

Do not create five tiny labels that users cannot scan.

## Motion System

Motion is part of INLAND identity but must remain purposeful.

### Motion categories

- micro: 120–180ms
- component: 180–320ms
- section reveal: 320–600ms
- hero/ambient: 600–1000ms

Use:
- fade-up reveals
- image scale 1.01–1.03
- subtle card elevation
- chip selection
- bottom sheet transitions
- sticky CTA entrance
- staggered property card reveal

Avoid:
- bouncing UI
- constant parallax
- large motion on every element
- motion that delays content
- animation that hurts accessibility
- animation that creates layout shift

Respect `prefers-reduced-motion`.

## Color Rules

Mandatory:
- emerald remains the primary brand accent.

Recommended supporting palette:
- warm ivory
- soft white
- charcoal
- stone
- slate
- deep forest
- muted brass/gold
- functional status colors

Use dark forest or dark charcoal for select hero/brand sections if useful. Do not replace emerald with that tone.

Color should communicate hierarchy:
- primary CTA = emerald
- secondary CTA = neutral
- decorative highlight = optional brass/secondary
- danger = red
- success = emerald or a sufficiently distinct functional green only if it does not confuse brand semantics

## Component Strategy

Before creating a new component:

1. inspect existing component library
2. reuse existing shadcn/Radix/Base UI primitives
3. reuse existing property, inquiry, navigation, dashboard components
4. extend only when the existing abstraction cannot reasonably support the design
5. avoid duplicate variants

Separate:
- data logic
- presentation
- responsive composition
- page orchestration

Do not create giant `page.tsx` files.

## Responsiveness Rules

Every public UI change must be checked at minimum for:
- 320px
- 375px
- 390px
- 430px
- 768px
- 1024px
- 1280px+

Mobile checks:
- no horizontal scroll
- no clipped text
- no overlapping CTA
- no unusable filter
- no touch targets that are too small
- readable property price
- readable location
- card image proportions preserved

## Accessibility

Must preserve:
- keyboard navigation
- visible focus
- sufficient contrast
- semantic landmarks
- labelled icon-only controls
- readable form errors
- screen-reader-friendly status
- reduced-motion support
- touch-friendly controls

Do not let premium visuals reduce usability.

## Performance

For property imagery:
- optimize images with Next.js image tooling where applicable
- avoid loading large galleries above the fold
- lazy-load non-critical media
- prevent layout shift with known aspect ratios
- avoid decorative animation that triggers expensive repaint
- avoid giant client components when a smaller client boundary is enough

## Security / Behavior Boundary

This skill is visual/UX focused.

Do not:
- weaken authorization for visual convenience
- expose protected CRM data to simplify UI
- rely on client-side masking as security
- move server-only secrets to the client
- change RLS or API authorization as part of a visual redesign
- assume proxy.ts is the only security boundary

When a requested redesign depends on protected data, collaborate with `plms-engineer`.

## Design Audit Workflow

Before editing a page:

1. Identify user and role.
2. Identify the page's one primary job.
3. Identify primary / secondary / tertiary information.
4. Identify existing reusable components.
5. Identify current density problems.
6. Define desktop composition.
7. Define mobile composition independently.
8. Define typography hierarchy.
9. Define color usage, keeping emerald as brand anchor.
10. Define motion behavior.
11. Define states:
   - loading
   - empty
   - error
   - success
   - disabled
12. Define conversion/next-step CTA.
13. Implement.
14. Review at mobile and desktop sizes.
15. Confirm no business/security behavior changed.
16. Run lint/type/test checks when code was changed.

## Design Decision Rule

When two visual choices are possible, prefer the one that:
- reduces cognitive load
- increases whitespace
- strengthens hierarchy
- elevates property photography
- clarifies the next action
- strengthens INLAND identity
- preserves emerald recognizability
- reduces component duplication
- remains accessible
- is easier to maintain

## Never Do

- Do not copy Rumah123/Brighton/other property portals.
- Do not redesign the entire product just to look trendy.
- Do not remove emerald green.
- Do not introduce a new dominant brand color.
- Do not use more than one display font family.
- Do not make every section card-based.
- Do not put every metric above the fold.
- Do not display all property metadata in cards.
- Do not use mobile desktop tables.
- Do not make every CTA green.
- Do not add animation to everything.
- Do not replace working components without inspecting them.
- Do not change business rules during UI work.
- Do not rewrite data services for cosmetic changes.
- Do not claim a UX improvement without explaining the structural reason.

## Output Format

For a UI redesign request, return:

1. **UX diagnosis**
2. **Design direction**
3. **Desktop structure**
4. **Mobile structure**
5. **Typography**
6. **Color usage**
7. **Motion**
8. **Component reuse plan**
9. **Implementation changes**
10. **Responsive checks**
11. **Acceptance criteria**

For implementation, provide concrete file-level changes and explain why each change exists.

## Success Criteria

A successful PLMS frontend redesign must:

1. look recognizably INLAND
2. preserve emerald as a key brand color
3. feel more premium and distinctive than a generic property portal
4. reduce mobile visual density
5. improve hierarchy without removing useful functionality
6. make property photography more prominent
7. make price/location/specs easier to scan
8. improve public discovery-to-inquiry flow
9. make agent workflows calmer and more action-oriented
10. use typography with personality without reducing readability
11. use motion intentionally
12. work cleanly across mobile, tablet, and desktop
13. reuse the existing component system where sensible
14. preserve business logic, auth, authorization, and RLS boundaries
15. remain performant and accessible
16. be implementable incrementally without a full rewrite
