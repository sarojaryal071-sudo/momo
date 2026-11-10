# UI rulebook

Status: v1, 2026-11-10. The brand name and all colours are placeholders until branding is final, but they are the starting point and must be used consistently.

## 1. Feel

Himalayan and earthy. Warm brick, wood, steam, chalkboard, kraft paper, prayer-flag colours used sparingly. It should feel like a person's home kitchen, not a startup landing page. The tone is simple and direct. The emotional pull ("taste of home" for Nepalis, "a taste of the Himalayas" for everyone else) comes from the hero line and the images, not from long paragraphs.

## 2. Colour tokens (already in `css/theme.css`; keep the names)

| Token | Value | Use |
|---|---|---|
| `--turmeric` | `#E3A018` | Main accent: highlights, badges, big decorative shapes. Charcoal text on turmeric passes; turmeric text on cream does not. |
| `--coriander` | `#5E7D3A` | Secondary: borders, banners, large decoration. Low contrast for small text on cream. |
| `--chutney` | `#B8321F` | Buttons, links, key highlights. White text on chutney passes. |
| `--white` | `#FFFFFF` | Page background (decision D-026). |
| `--cream` | `#F6EBD3` | Light tint for one or two calm bands only. No longer the page background. |
| `--cream-light` | `#FBF4E4` | Optional soft tint for raised areas or form fields if white needs warmth. |
| `--charcoal` | `#23211E` | Body text, dark sections. |
| `--clay` | `#8A5A3B` | Small details, captions, dividers. |

Run a real contrast check on every text and background pair you use and report the ratios. Do not add colours without asking. No purple or violet anywhere.

## 2b. Fluid sizing and soft-coded values (decision D-022)

Nothing visual is hard-coded. Everything scales smoothly with the screen and is defined once.

**Tokens, defined once in `frontend/css/theme.css`, used by name everywhere else:**
- Type scale `--step--1` to `--step-5`, each a `clamp()` between a phone size and a desktop size in `rem` (the body is `--step-0`).
- Spacing scale `--space-3xs` to `--space-3xl`, each a `clamp()` in `rem` with a small viewport-based part.
- Layout: `--gutter` (fluid side padding), `--wrap` (max content width, as already exists in `--max`), `--measure` (about `60ch`).
- Controls: `--tap` (minimum touch target, about `2.75rem`), `--radius` (small; the brand is not pill-shaped), `--hairline` (border width), `--ring-width` and `--ring-offset` (focus ring).
- Tune the numbers while building; keep the names stable.

**Rules:**
- Pixel values appear **only inside token definitions** in `theme.css`. Component and page CSS use tokens, `rem`, `%`, `ch`, `fr`, `vw`, `svh` and `dvh`, or container units. The one exception is the visually-hidden helper.
- No fixed `width` or `height` on layout boxes. Use `min-`/`max-` sizes, `aspect-ratio`, `min-block-size` with `clamp()`, and intrinsic grids such as `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))`.
- Prefer layouts that adapt without breakpoints. Where something must change at a width, prefer a container query. Media queries are a last resort: use `em` units, define at most two of them (document them in a comment block in `theme.css`, since CSS variables cannot be used in media queries), and never write a one-off breakpoint in a component.
- Images and media: `max-inline-size: 100%`, `height: auto`, with `width` and `height` attributes only to reserve space (the CSS still scales them).
- Text scales with the user's browser setting: never set font sizes in `px`, and the page must remain usable at 200 percent zoom and at widths from 320 px up.
- Colours, sizes, radii, shadows (if any), durations and z-indexes: tokens, not literals.

## 3. Typography and texture

- Headings: one self-hosted open-licence serif (decision D-025) with the existing serif stack as fallback in `--font-head`. Body: system sans (`--font-body`). No other web-font downloads. Story, voice and motifs: `docs/brand-direction.md`.
- No paper grain on the white page (decision D-026). Texture only on the chalkboard panel and the kraft tags.
- Chalk-style underline or hand-drawn rule under key headings, done with CSS or a small inline SVG, not an image dependency.
- Large, confident headings; short lines; generous spacing. Body copy max about 60 characters wide.

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
