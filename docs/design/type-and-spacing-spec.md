# Type, spacing and component spec (decisions D-050, D-051)

> **D-051 override (owner, 12 Nov 2026): the typefaces and the type scale are Klandestina's own.** Display = **Bebas Neue 400, uppercase** (headings, product names, prices). Text and UI = **Space Grotesk 400/500/600/700**. Self-hosted woff2 (fontsource npm packages), `font-display: swap`, Latin subset. Instrument Serif and Hanken Grotesk are removed everywhere. Wherever this file says "Instrument Serif" read Bebas Neue, and "Hanken" read Space Grotesk. Sizes: h1 `clamp(48px, 15vw, 72px)` phone and `clamp(64px, 13vw, 148px)` desktop is **too tall for a shop**, so h1 is `clamp(3rem, 1.6rem + 6vw, 6rem)` (max 96px), h2 `clamp(2.375rem, 5vw, 3.75rem)` (38 to 60px), h3 and product names 1.5rem to 1.625rem Bebas, price Bebas 1.375rem, modal title 1.75rem to 2rem. Letter-spacing on Bebas headings 0.01 to 0.02em. Body 1rem, reading text 1.0625rem (680px max), menu/description 0.875rem, buttons 0.875rem 600 (0.03em), pills 0.8125rem 600 uppercase, form label 0.8125rem 600, **input 1rem** (not 15px, to stop iOS zoom), eyebrow 0.75rem 600 uppercase 0.22em, tag chip never below 0.75rem. Bebas never below 1.375rem. Space Grotesk has no Devanagari: if Nepali text is added later, use Mukta for it.


Source: the Klandestina playbook (the owner's other site, checked 12 Nov 2026), adapted for a shop with a cart and an admin. **Kept from us:** palette (emerald, copper, peach, tints), typefaces (Instrument Serif for large headings, Hanken Grotesk for everything else, D-043), layout, the glass menu and product sheet (D-044). **Taken from the playbook:** the size system, spacing, component rules and the QA gate. All values below are rem (1rem = 16px) and live as tokens in `theme.css` only (D-022).

## 1. Principles

1. **Text that people read or tap does not scale with the screen.** Body is a fixed 1rem. Only display headings use `clamp()`, always with a hard maximum.
2. **Hierarchy comes from weight and colour, not from shrinking.** Use a `--muted` text token (computed at least 4.5:1) instead of smaller or semi-transparent text.
3. **Minimum sizes:** functional text (prices, totals, errors, allergens, help, labels, meta) at least 0.875rem (14px). Only decorative uppercase labels (eyebrows) and tags may be 0.75rem (12px). Inputs are 1rem (16px), which also stops iPhone Safari zooming in on focus.
4. **Big type is rare.** Display sizes appear only in the hero, section headings and the one large statement. Nothing in cards, forms, tables or the admin is display size.
5. **Only the space that is needed.** Section padding is modest, the product list must be reachable within about one scroll, and no component has decorative empty space.
6. **No hex in components, no px outside tokens, text at least 4.5:1, a visible 2px focus ring on every control, nothing that moves except under `prefers-reduced-motion: no-preference`, no `overflow-x: hidden` to hide layout bugs.**

## 2. Public site type tokens

| Role | Font, weight | Size | Line height | Notes |
|---|---|---|---|---|
| Body | Hanken 400 | 1rem fixed | 1.6 | `--muted` for secondary text |
| Reading paragraph | Hanken 400 | 1.0625rem | 1.6 | `max-width: 42.5rem` (about 680px) |
| UI text (nav, chips, buttons) | Hanken 500 to 600 | 0.9375rem | 1.3 | buttons 600 |
| Small and functional | Hanken 400 to 600 | 0.875rem | 1.5 | totals, errors, allergens, help, meta, labels (600) |
| Eyebrow label | Hanken 600 uppercase | 0.75rem | 1.2 | letter-spacing about 0.2em, decorative only, emerald |
| Tag or badge | Hanken 600 | 0.75rem | 1 | |
| Input text | Hanken 400 | 1rem | 1.4 | |
| Product name (card, sheet) | Hanken 600 | 1.0625rem card, 1.25rem sheet | 1.25 | sentence case |
| Price | Hanken 600, tabular figures | 1.0625rem | 1.2 | |
| h3 | Hanken 600 | `clamp(1.125rem, 1.05rem + 0.3vw, 1.3125rem)` | 1.25 | |
| h2 | Instrument Serif 400 | `clamp(1.875rem, 1.4rem + 2.2vw, 3rem)` | 1.05 | -0.01em; max about 48px |
| h1 (hero) | Instrument Serif 400 | `clamp(2.625rem, 1.5rem + 5vw, 5rem)` | 0.98 | -0.01em; max about 80px; at most 3 lines on a phone |
| Large statement | Instrument Serif 400 | `clamp(2rem, 1.4rem + 3vw, 3.5rem)` | 1.05 | the only other display size |

Serif never below 1.6rem. Heading `text-wrap: balance`; paragraphs `text-wrap: pretty`.

## 3. Admin type tokens (denser, scoped under the admin root)

| Role | Size | Notes |
|---|---|---|
| Base text | 0.9375rem, line height 1.5 | fixed |
| Page title | 1.5rem Instrument Serif | one line |
| Card heading | 1rem Hanken 600 | sans |
| Labels, meta, help | 0.875rem | Labels 600; never smaller |
| Order pickup line | 1.0625rem Hanken 600 | the most prominent text on an order |
| Buttons and chips | 0.875rem to 0.9375rem, 600 | |
| Inputs | 1rem | prevents iPhone zoom |
| Tab bar labels | 0.75rem | icon-and-label navigation |

Compact rows and tighter gaps (admin spacing tokens below), but **tap targets stay at least 44px on touch devices** (`pointer: coarse`); 40px is allowed for dense desktop rows.

## 4. Spacing and layout tokens

- **Section padding (vertical):** `--section-space: clamp(2.5rem, 1.5rem + 3.5vw, 5rem)` (40px to 80px). Replaces the current 64 to 128px steps. Inside a section, header to content gap `clamp(1.25rem, 1rem + 1vw, 2rem)`.
- Reduce the top of the spacing scale: `--space-2xl` max about 4rem and `--space-3xl` max about 5rem (or remove 3xl); nothing may use a gap above 5rem.
- **Container:** max `73.75rem` (1180px), side padding `clamp(1rem, 0.5rem + 2.5vw, 2rem)`. Reading width `42.5rem`. Section header block max `38.75rem` (620px).
- Grid gaps `1rem`; card padding `1rem` to `1.25rem`; radii stay on our tokens.
- **Hero:** no viewport-height sizing. Panel padding `clamp(1.5rem, 1rem + 3vw, 3.5rem)`. On a 390 by 844 phone the first product card name must be visible after one scroll (at most about 1.2 screens from the top); on 1440 by 900 the hero panel is at most about 36rem tall and the top of "Our momo" is visible without scrolling more than a little.
- Trust row, tiles, steps and statement keep their order but lose any decorative extra height.
- Admin gaps: `0.5rem` inside cards, `0.75rem` between cards, `1rem` between sections; page padding `1rem`.

## 5. Components

- **Primary button:** solid emerald, white text, 0.9375rem 600, min height 2.75rem, padding about `0.75rem 1.5rem`, our radius token. Hover: slightly darker, lift at most 2px on pointer devices only. Press: down 1px. `0.18s ease`. Clear **loading** and **disabled** states (especially "Place order": spinner or "Placing order...", disabled while saving).
- **Secondary button:** outline in emerald, same size. Destructive: red-tinted outline with text, confirmation in-page.
- **Inputs:** `padding 0.75rem 0.875rem`, 1rem text, our radius, 1px border (ink at about 20%), label above (0.875rem 600). **Focus: a visible 2px emerald ring with offset, plus the border colour; never `outline: none` alone.** Error text 0.875rem with an icon or prefix, never colour alone.
- **Cards:** hairline border, no shadow at rest, hover lift at most 3px with a soft shadow for pointer devices only; no tilt, no 3D, no auto-looping carousels near an Add button.
- **Chips and pills:** 0.875rem to 0.9375rem, 44px high on touch.
- **Modal and sheet:** keep glass (D-044); close button 44px, scroll lock, tap outside closes, in 0.24s and out 0.16s, plain fade under reduced motion; `max-height: 86svh` on phones.
- **Navigation:** slim sticky header on public pages; the full-screen menu stays.
- **Motion:** interaction 0.18s ease, panels 0.24s, nothing animates prices, errors or text; every movement sits inside `prefers-reduced-motion: no-preference`.

## 6. QA gate (every polish step)

Computed contrast for every text and background pair (at least 4.5:1) · widths 320, 375, 390, 414, 768, 1280, 1440 · no horizontal scroll at any width · hero and first product reachable as above · keyboard focus and Escape · reduced motion · fonts do not cause layout jumps · live check in a private window after deploy.

## 7. Do not copy from the playbook

Uppercase display face for product names, auto-looping carousels, 3D tilt, extruded press shadows, 10px tags, semi-transparent muted text, focus by border colour only, mailto order forms, a 100vh hero, 130px section padding, ambient glows, more than one or two blurred elements, `overflow-x: hidden` on body, third-party CDN fonts.
