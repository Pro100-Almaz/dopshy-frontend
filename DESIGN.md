---
name: Dopsy Arena
description: A fast, sporty football-turf booking and operations system — the arena as an interface.
colors:
  pitch-green: "#039855"
  pitch-green-bright: "#12b76a"
  pitch-green-tint: "#d1fadf"
  pitch-green-deep: "#027a48"
  night-black: "#101828"
  night-black-deep: "#0c111d"
  turf-dark: "#1a2231"
  surface-white: "#ffffff"
  surface-mist: "#f9fafb"
  line-gray: "#e4e7ec"
  ink-body: "#344054"
  ink-muted: "#667085"
  alert-red: "#f04438"
  caution-amber: "#f79009"
  legacy-blue: "#465fff"
typography:
  display:
    fontFamily: "Bebas Neue, Impact, sans-serif"
    fontSize: "clamp(3rem, 9vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.85
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Outfit, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Outfit, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "Outfit, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "normal"
  label:
    fontFamily: "Outfit, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.06em"
rounded:
  sm: "8px"
  md: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.pitch-green}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.sm}"
    padding: "14px 20px"
  button-primary-hover:
    backgroundColor: "{colors.pitch-green-deep}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.sm}"
  button-outline:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.sm}"
    padding: "14px 20px"
  card:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.md}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.night-black}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  chip:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Design System: Dopsy Arena

## 1. Overview

**Creative North Star: "The Floodlit Pitch"**

Dopsy Arena is a football turf you can operate. The interface borrows its identity from the venue itself — pitch-green turf under stadium floodlights, set against deep night-black. Green is the ball in play; black and mist-gray are the stands and the air. Every screen should feel like the moment before kickoff: charged, legible, ready. The personality is fast and sporty — energetic and confident, echoing turf, floodlights, and momentum. Interactions are quick and punchy; nothing lingers.

The system runs at two densities from one identity. **Operator screens** (the admin panel — dashboard, bookings, slots, payments, staff) carry dense operational truth read at a glance: compact tables, tight rhythm, status the eye finds instantly. **Player screens** (the public booking flow — fields, time, checkout) stay effortless and thumb-first, with generous touch targets and a single obvious next action. Same green, same type, two levels of density.

This system explicitly rejects the **generic off-the-shelf admin template** it grew out of. The stock TailAdmin blue (`#465fff`), the anonymous blue-and-gray SaaS chrome, the interchangeable card grids — those are the anti-identity. The default operational accent is being migrated from that legacy blue to pitch-green so nothing reads as a stock dashboard. Warmth and energy come from the green, the black, and the Bebas display voice — never from cream neutrals or decorative gradients.

**Key Characteristics:**
- Pitch-green (`#039855`) is the single brand accent, at both densities.
- Night-black and mist-gray neutrals; no cream, no warm-tinted near-whites.
- Bebas Neue for sporty display moments; Outfit carries all working text.
- Flat surfaces that lift softly on action — quick, never heavy.
- Mobile-first: player flows are designed thumb-first, WCAG 2.1 AA throughout.

## 2. Colors

A high-contrast athletic palette: one saturated pitch-green against a black-to-mist neutral ramp, with red and amber reserved strictly for operational status.

### Primary
- **Pitch Green** (`#039855`): The brand accent and single most important color. Primary buttons, active navigation, selected slots, field-type badges, focus rings on player surfaces, and any "go / confirm / book" affordance. This is the color of the ball in play.
- **Pitch Green Bright** (`#12b76a`): The lit variant — live indicators, pulsing "available now" dots, hover glow, positive deltas. Use where green needs to feel switched-on.
- **Pitch Green Deep** (`#027a48`): The pressed/hover state for primary actions; also green text on light tints where `#039855` is too light for AA.
- **Pitch Green Tint** (`#d1fadf`): Soft background wash for success banners, selected-state fills, occupied-slot chips.

### Neutral
- **Night Black** (`#101828`): Primary ink for headings and high-emphasis text; the base for dark-surface panels and the landing's floodlit background.
- **Night Black Deep** (`#0c111d`) / **Turf Dark** (`#1a2231`): Deepest backdrops and dark-mode surfaces — the stands behind the pitch.
- **Ink Body** (`#344054`): Default body-text color on light surfaces. Meets AA on white and mist.
- **Ink Muted** (`#667085`): Secondary text, captions, placeholders. Never lighter than this for text on white — lighter grays fail contrast.
- **Line Gray** (`#e4e7ec`): Borders, dividers, table rules, hairline card outlines.
- **Surface White** (`#ffffff`): Cards, panels, inputs, elevated surfaces.
- **Surface Mist** (`#f9fafb`): The app body background. Cool near-white, not cream.

### Status (operational only, never decorative)
- **Alert Red** (`#f04438`): Unpaid, cancelled, overdue, destructive actions.
- **Caution Amber** (`#f79009`): Pending, in-progress, expiring holds.

### Legacy
- **Legacy Blue** (`#465fff`): The TailAdmin template accent. Being migrated OUT. Do not introduce it into new surfaces; replace it with pitch-green as admin components are touched.

### Tokens in code
Pitch-green ships as its own Tailwind ramp — `pitch-25` … `pitch-950` in `src/assets/main.css` — with the same hex values as the `success-*` ramp but a name that states intent: `success` is the outcome of an operation, `pitch` is the brand accent. New surfaces use `pitch-*`; `success-*` stays for genuine success states. Sidebar active states (`menu-item-active`, `menu-item-icon-active`, dropdown/badge variants) already run on `pitch-*`, so the legacy blue is gone from navigation.

Focus is a token too: the `focus-ring` / `focus-ring-inset` utilities draw a 2px `pitch-500` outline. Outline rather than ring, because it reads on white cards, green buttons and hovered table rows without needing a matching offset color.

### Named Rules
**The One Pitch Rule.** There is exactly one brand accent: pitch-green. Blue is not a second brand color — it is legacy debt. Red and amber are status signals, not accents. If a new screen needs "a pop of color," it is green.

**The No-Cream Rule.** Backgrounds are cool (mist `#f9fafb`, white, or night-black). No warm-tinted near-whites, no sand, no paper. Warmth is forbidden as a body color; energy is carried by the green.

## 3. Typography

**Display Font:** Bebas Neue (with Impact, sans-serif fallback)
**Body Font:** Outfit (with sans-serif fallback)

**Character:** A hard contrast pairing — Bebas Neue is a tall, condensed, all-caps sports-signage face that shouts "matchday"; Outfit is a clean, neutral geometric sans that stays quiet and legible under dense data. Bebas is the stadium banner; Outfit is the scoreboard readout. They never blur together because they sit on opposite ends of the contrast axis.

### Hierarchy
- **Display** (Bebas Neue 400, `clamp(3rem, 9vw, 6rem)`, line-height 0.85): Landing hero and big sporty moments only — "ИГРАЙ КАК ПРОФИ". All-caps by nature. Never used for UI labels or running text.
- **Headline** (Outfit 700, 36px / `title-md`, line-height 1.22): Page titles and major section heads in the app.
- **Title** (Outfit 600, 20px, line-height 1.5): Card titles, modal headers, field names.
- **Body** (Outfit 400, 14–16px, line-height 1.43): All running text, table cells, form values. Cap prose at 65–75ch.
- **Label** (Outfit 600, 12px, letter-spacing 0.06em, often uppercase): Table headers, badges, meta rows, form labels.

### Named Rules
**The Bebas-Is-A-Guest Rule.** Bebas Neue appears only where the arena is speaking — heroes, hype CTAs, big score-like numbers. It is never a workhorse. All operational UI (tables, forms, nav, buttons) is Outfit. Bebas in a data table is a costume, not a system.

## 4. Elevation

Flat by default, lift on action. Surfaces rest flat on the mist background, defined by hairline `#e4e7ec` borders. Depth is not decorative — a shadow is a response to state (hover, focus, elevation), never an ambient default. On hover, a card raises from `shadow-theme-sm` to `shadow-theme-md` and its border tints green; on focus, a green ring appears. This keeps the interface quick and modern instead of heavy and shadowed.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0px 1px 3px 0px rgba(16,24,40,0.1), 0px 1px 2px 0px rgba(16,24,40,0.06)` — `theme-sm`): Cards and panels at rest.
- **Hairline** (`box-shadow: 0px 1px 2px 0px rgba(16,24,40,0.05)` — `theme-xs`): Buttons, inputs, low-emphasis surfaces.
- **Lift** (`box-shadow: 0px 4px 8px -2px rgba(16,24,40,0.1), 0px 2px 4px -2px rgba(16,24,40,0.06)` — `theme-md`): Hover state for interactive cards; dropdowns and popovers.
- **Float** (`theme-lg` / `theme-xl`): Modals and command surfaces only.
- **Focus Ring** (`box-shadow: 0 0 0 4px rgba(3,152,85,0.16)`): Keyboard focus and active selection. Migrate the legacy blue focus ring (`rgba(70,95,255,0.12)`) to this green.

### Named Rules
**The Lift-On-Action Rule.** Surfaces are flat at rest. A shadow deeper than `theme-sm` means the element is being interacted with — hover, drag, or open. A resting card with a heavy shadow is a bug.

## 5. Components

### Buttons
- **Shape:** Softly rounded (`8px` / `rounded-lg`). Consistent across sizes.
- **Primary:** Pitch-green fill, white text, `shadow-theme-xs`, padding `14px 20px` (`px-5 py-3.5`), Outfit 500, `text-sm`. The single confirm/book/go action per view.
- **Hover / Focus:** Background deepens to `#027a48` (`pitch-green-deep`); `transition`. Focus-visible shows the green focus ring. Disabled drops to `pitch-green-tint` fill at reduced opacity.
- **Outline:** White background, `#344054` text, `1px` inset `#d0d5dd` ring, hover to `#f9fafb`. The secondary action.
- **Hero CTA (landing only):** Bebas Neue, skewed `-10deg` parallelogram, green fill with a sweeping white sheen on hover. Signature, brand-surface only — never in the app.

### Chips / Badges
- **Field-type badge:** Solid `pitch-green` fill, white bold text, `rounded-full`, `text-xs`. Marks 5×5 / 6×6 on field cards.
- **Meta chip:** White or `rgba(255,255,255,0.9)` with backdrop-blur over imagery, hairline `#e4e7ec` border, `#475467` text, `rounded-full`. Amenities, indoor/outdoor.
- **Status chip:** Tint + deep-text pairs — green (confirmed), amber (pending), red (unpaid/cancelled). Fill is the tint, text is the deep shade of the same hue; never gray text on a colored fill.

### Cards / Containers
- **Corner Style:** `16px` (`rounded-2xl`) for content cards (field cards, dashboard panels); `8px` for compact list rows.
- **Background:** `surface-white` on `surface-mist`.
- **Shadow Strategy:** `theme-sm` at rest → `theme-md` on hover (see Elevation).
- **Border:** `1px` `#e4e7ec`, shifting to `pitch-green-tint`/`#6ce9a6` on hover for interactive cards.
- **Internal Padding:** `20px` (`p-5`), `gap-3` between stacked content.
- **Never nest cards.** A card inside a card is always wrong here.

### Inputs / Fields
- **Style:** White background, `1px` `#d0d5dd` border, `8px` radius, `12–14px` padding, Outfit body.
- **Focus:** Border shifts to `pitch-green` with the green focus ring; no blue.
- **Placeholder:** `ink-muted` (`#667085`) — must stay AA-legible, never lighter.
- **Error:** `alert-red` border and helper text.

### Navigation (admin sidebar)
- **Style:** Icon + label rows, `8px` radius, Outfit 500 `text-theme-sm`. Collapsed rail expands to `290px` on hover.
- **Active:** Green tint background + pitch-green text/icon (migrating from the legacy `brand-50 / brand-500` blue). Inactive: `#344054`, hover to `#f2f4f7`.
- **Mobile:** Off-canvas drawer; full dark-mode parity.

### Academy surfaces (operator screens)
Football and boxing run on one set of components parameterized by sport (`src/views/Academy/*`, `src/components/academy/*`), with the class vocabulary centralized in `components/academy/ui.ts` — `panel`, `panelHeader`, `input`, `buttonPrimary / Secondary / Ghost / Danger`, `th / td`. Same button, same panel, same table rule on every academy screen; a page that needs a new control adds it to that module rather than assembling utilities inline.

Recurring pieces: `StatusPill` (five semantic tones, contrast-checked), `StateBlock` (skeleton / error / empty in the shape of the coming content), `OccupancyMeter` (green while seats remain, amber when full), `AttendanceControl` (two explicit actions with the WhatsApp consequence in the tooltip), `ContactActions` (call, WhatsApp, hand the dialog to a manager), `ModulePending` (honest "waiting on the backend" state that lists the expected contract).

### Signature: Week Grid
The academy schedule is a real week: seven day columns with dates, today's column marked in pitch-green, each lesson a chip carrying time, group and an occupancy bar. Under `lg` it becomes a day picker plus a list — never a horizontally scrolling table. Lessons whose weekday the API didn't resolve surface in an amber strip instead of disappearing.

### Signature: Slot Grid
The booking slot grid is the product's defining component — a time-vs-field matrix where each cell is a bookable slot. Available slots read in pitch-green, held/occupied in amber/tint, selected fills solid green with the focus ring. It must stay glanceable for operators and tappable for players: minimum 44px touch targets on the player flow.

## 6. Do's and Don'ts

### Do:
- **Do** make pitch-green (`#039855`) the one brand accent — buttons, active nav, selected slots, focus rings. One pitch, one green.
- **Do** keep backgrounds cool: mist `#f9fafb`, white, or night-black. Energy comes from the green.
- **Do** keep surfaces flat at rest and lift them only on hover/focus (`theme-sm` → `theme-md`).
- **Do** pair status tints with same-hue deep text (green/amber/red), never gray text on a colored fill.
- **Do** confine Bebas Neue to hero and hype moments; run all UI in Outfit.
- **Do** design player flows thumb-first: ≥44px touch targets, AA contrast, one obvious action per screen.
- **Do** provide a reduced-motion alternative for every transition (the hover sheen, slot pulses, card lifts).
- **Do** say what an action will do when it triggers something outside the screen — marking a trial sends a WhatsApp message, so the button shows which message.
- **Do** show a named "waiting on the backend" state when an endpoint is missing, instead of an empty table that reads as "no data".

### Don't:
- **Don't** let this read as a **generic off-the-shelf admin template**. No anonymous blue-and-gray SaaS chrome, no interchangeable icon-heading-text card grids.
- **Don't** introduce the legacy template blue (`#465fff`) into any new surface — replace it with pitch-green as you touch admin components.
- **Don't** use cream, sand, paper, or any warm-tinted near-white as a background. The No-Cream Rule.
- **Don't** treat red or amber as accents — they are operational status only.
- **Don't** put Bebas Neue in tables, forms, or nav; it becomes a costume.
- **Don't** rest a card under a heavy shadow, and never nest a card inside a card.
- **Don't** let muted gray text drop below `#667085` on white — placeholder and caption text must still clear AA.
- **Don't** duplicate a screen per sport. One component, `sport` as a prop — the two academies drifted apart once already.
- **Don't** invent a metric. If a number or trend can't be derived from the API, it doesn't go on the screen.
