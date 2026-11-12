# UI rulebook

Status: v1, 2026-11-10. The brand name and all colours are placeholders until branding is final, but they are the starting point and must be used consistently.

## 1. Feel

Premium, clean and earthy (decision D-027): a white page, deep emerald and warm copper, calm space, real food photography, one hand-drawn motif language. Warm like a person's home kitchen, not a startup landing page and not a discount supermarket. The tone is simple and direct. The emotional pull ("taste of home" for Nepalis, "a taste of the Himalayas" for everyone else) comes from the hero line and the images, not from long paragraphs.

## 2. Colour tokens (already in `css/theme.css`; keep the names)

Palette: **Emerald & Copper** (decision D-027). Contrast ratios below were calculated by the planning chat; re-check every pair you actually use and report the numbers.

| Token | Value | Use | Contrast notes |
|---|---|---|---|
| `--white` | `#FFFFFF` | Page background, cards. | |
| `--emerald` | `#004D3B` | Primary: headings, buttons (white text), header text, footer band, strong bands. | 9.88 with white either way. Safe for all text. |
| `--green` | `#0F8A72` | Hover and active states, borders, icons, large decoration. | 4.29 with white: **large text and UI parts only**, never small text. |
| `--sage` | `#7FB99B` | Decoration: ridge line, dividers, icon strokes, tinted tiles. | 4.38 on emerald: never for text. |
| `--green-tint` | `#EAF3EE` (derived) | Hero panel and calm bands. | Emerald on it 8.73, charcoal 14.19. |
| `--copper` | `#B87333` | Numerals, large display accents, borders, icon accents. | 3.79 with white: **large text and decoration only**. Never small text; never white text on copper buttons. Not for text on emerald (2.61). |
| `--peach` | `#E8B189` | Warm tile and band, kraft tag fill. | Emerald on it 5.22, charcoal 8.47. Text on emerald footer 5.22. |
| `--peach-tint` | `#FBEEE2` (derived) | Soft warm band or form hint. | Emerald on it 8.67. |
| `--charcoal` | `#23211E` | Body text. | 16.06 on white. |
| `--chutney` | `#B8321F` | Only for the chutney accent, errors and "unavailable". Never a main button colour. | 5.98 with white. |
| `--turmeric` | `#E3A018` | Small highlights only (badge dot, the chutney tile). Never text on white. | 2.26 with white. Charcoal on it 7.12. |

Retired: `--coriander`, `--clay`, `--cream`, `--cream-light`. Remove them once nothing uses them.

Buttons: emerald background, white text, a darker emerald on hover (derive with `color-mix`). Links: emerald, underlined. Focus ring: emerald on white and tinted areas; **peach or white on emerald** areas.

Do not add colours without asking. No purple or violet anywhere. No gradients: use flat tints.

**Shape and depth (D-027).** Two radius tokens: `--radius` (small, for buttons and fields) and `--radius-lg` (cards and panels). Chips may be pill-shaped. One subtle shadow token `--shadow-card` for product cards and the hero image cut-out (soft, low opacity, no coloured glow). Product cards are real listing content, so a grid of them is allowed; decorative repeated cards are still not.

## 2b. Fluid sizing and soft-coded values (decision D-022)

Nothing visual is hard-coded. Everything scales smoothly with the screen and is defined once.

**Tokens, defined once in `frontend/css/theme.css`, used by name everywhere else:**
- Type tokens `--text-body`, `--text-read`, `--text-ui`, `--text-small`, `--text-eyebrow`, `--text-input`, `--text-name`, `--text-price`, `--text-h2`, `--text-h1`, `--text-statement` (D-050, D-051): fixed `rem` for text people read or tap; only the display headings use `clamp()`, each with a hard maximum. Full table: `docs/design/type-and-spacing-spec.md`.
- Spacing scale `--space-3xs` to `--space-3xl`, each a `clamp()` in `rem` with a small viewport-based part.
- Layout: `--gutter` (fluid side padding, 16 to 32px), `--wrap` (max content width, `--max` 73.75rem), `--measure` (42.5rem), `--section-space` (vertical section padding and gaps, 40 to 80px); nothing uses a gap above 5rem.
- Controls: `--tap` (minimum touch target, about `2.75rem`), `--radius` (small; the brand is not pill-shaped), `--hairline` (border width), `--ring-width` and `--ring-offset` (focus ring).
- Tune the numbers while building; keep the names stable.

**Rules:**
- Pixel values appear **only inside token definitions** in `theme.css`. Component and page CSS use tokens, `rem`, `%`, `ch`, `fr`, `vw`, `svh` and `dvh`, or container units. The one exception is the visually-hidden helper.
- No fixed `width` or `height` on layout boxes. Use `min-`/`max-` sizes, `aspect-ratio`, `min-block-size` with `clamp()`, and intrinsic grids such as `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))`.
- Prefer layouts that adapt without breakpoints. Where something must change at a width, prefer a container query. Media queries are a last resort: use `em` units, define at most two of them (document them in a comment block in `theme.css`, since CSS variables cannot be used in media queries), and never write a one-off breakpoint in a component.
- Images and media: `max-inline-size: 100%`, `height: auto`, with `width` and `height` attributes only to reserve space (the CSS still scales them).
- Text scales with the user's browser setting: never set font sizes in `px`, and the page must remain usable at 200 percent zoom and at widths from 320 px up.
- Colours, sizes, radii, shadows (if any), durations and z-indexes: tokens, not literals.

## 3. Typography and texture (D-043 superseded by D-050, D-051)

**The source of truth for sizes, weights, spacing and component rules is `docs/design/type-and-spacing-spec.md`.** Summary:

- **Two families, both self-hosted** (SIL OFL, Latin, `font-display: swap`, metric-matched fallbacks, preloaded; licences next to the files): **Bebas Neue** 400, uppercase (h1 to h3, product names, prices, step numerals, never below 1.375rem) and **Space Grotesk** 300 to 700 variable (everything else, including the whole admin). Instrument Serif and Hanken Grotesk are removed.
- Body is a fixed 1rem (reading text 1.0625rem, 42.5rem measure); buttons 0.9375rem 600; labels and functional text at least 0.875rem; inputs 1rem; eyebrows and tags 0.75rem. h1 `clamp(3rem, 1.6rem + 6vw, 6rem)`, h2 `clamp(2.375rem, 5vw, 3.75rem)`. Heading `text-wrap: balance`, paragraphs `text-wrap: pretty`.
- Secondary text uses the single `--muted` token (at least 4.5:1, no opacity tricks). Form errors carry an "Error:" prefix, never colour alone. Focus ring is 2px with an offset on every control.
- **Section labels:** a small uppercase Space Grotesk 600 eyebrow (about 0.2em tracking) above each section heading, emerald on white and tints, peach on emerald; never copper, mid-green or sage for small text. Only words already on the page or in `brand-direction.md`.
- No visible placeholder, sample, demo or TODO wording anywhere (D-052). A fact we do not have is not rendered; an unconfirmed value carries the invisible `data-pending` attribute (or `"pending": true` in seed data), which the launch gate checks.
- No paper grain, no ambient background, no decorative extras that fight the type. Glass only on the full-screen menu and the product sheet; the header, checkout bar, chips and card controls are solid.

## 4. Layout

- Mobile first. Design at 360 px wide, then widen. Max content width `--max`.
- Editorial and slightly uneven: one strong image beside text, a full-bleed band, a tilted kraft-tag detail, a chalkboard-style menu panel. Vary the rhythm between sections.
- The shop page may use a chalkboard-style menu panel for the packs, echoing her sign, with real, readable text (never text baked into an image).
- Header: brand name, simple nav (Home, Shop, How to cook), a cart link showing the item count, and a call or WhatsApp link. Footer: phone, "Pickup only", short note, links to legal pages when they exist.

## 5. Components

- Primary button: chutney background, white text, 44 px high at least, clear focus ring. One primary action per section.
- Secondary button: outlined in charcoal.
- Quantity control: minus, number, plus, large touch targets, labelled for screen readers.
- Form fields: visible labels above inputs, `cream-light` background, charcoal border.
- Notice banner: a turmeric strip at the top of the page with charcoal text. Appears only when active.

## 6. Avoid the "AI-generated site" look

- No purple, no gradient backgrounds, no glow or glassmorphism, no neon.
- No row of three identical rounded cards with emoji or stock icons.
- No generic hero phrases such as "Elevate your", "Unlock", "Seamless", "Experience the magic of".
- No stock-looking people photos. No decorative blobs.
- No emoji in headings, buttons or labels.
- Do not centre everything. Do not give every section the same padding, background and structure.
- Flat colours, texture, real type, honest imagery.

## 7. Images

- AI-generated images are for mood only and are placeholders for her real photos (decision D-017). Aim for realistic, slightly imperfect, warm-lit scenes: steam over a bamboo steamer, folded momo, a chutney bowl, a brick-and-wood kitchen corner.
- Never use an AI image to claim a real place, a real person or a real product. The shop page should show the real packs once photographed.
- Alt text describes what is visibly there, in plain words.
- Her sign image has garbled text on the veg tag and odd spelling. It is reference only, never final artwork.
- Files: WebP, mobile-sized first, with `width` and `height` attributes.

## 8. Copy rules

- UK English. One language only. Prices as £10.
- Short, plain sentences. Say what it is, what it costs, how to get it.
- Product line format: "Frozen chicken momo — 40 pieces — £10".
- State "Pickup only" and "Pay cash on pickup" wherever someone orders.
- The hero carries the emotion. Use "Taste like Nepal" as the tagline. Draft the hero line and short story with the owner; do not invent backstory (no names, places or family stories).
- Wherever facts are missing (cooking times, allergens, sauce prices), use a visible `TODO:` placeholder and list it in the report.

## 9. Pages and purpose

- **Home:** hero with tagline and one clear button to the shop; a short "taste of home" passage; the two packs; how ordering works (choose, confirm, pick up and pay cash); contact.
- **Shop:** packs and sauce add-ons with price, availability and an add-to-cart control; the chalkboard menu panel.
- **How to cook:** short steps for cooking from frozen; not a recipe. Placeholder until times are confirmed.
- **Cart:** items, quantities, total, optional details, confirm.
- **Done:** order number, summary, WhatsApp button, pickup and cash reminder.
- **Later:** allergens, privacy, terms (after council registration).
