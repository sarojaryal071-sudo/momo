# Step 1k — Typography and a calmer look (decisions D-043, D-044)

Prerequisite: Step 1j is merged (it is). Merge `origin/main` first (it contains the new font files). Read `CLAUDE.md`, `docs/decisions-log.md` D-043 and D-044, and `docs/ui-rulebook.md` sections 2, 2b and 5. Do only this step; do not start Step 3. Add the checklist at the bottom to `docs/progress-tracker.md` first.

## Why

The owner compared our site with a professional one (Klandestina) and found ours looks templated. Without photos the biggest fixes are typography, scale, spacing and fewer effects. This step changes only look: no copy except the small section labels below, no behaviour, data, options logic, order flow or receipt.

## 1. Fonts (D-043)

The files are already in `frontend/assets/fonts/`: `instrument-serif-latin-400.woff2`, `hanken-grotesk-latin-variable.woff2` (weights 100 to 900) and their licence files `InstrumentSerif-OFL.txt`, `HankenGrotesk-OFL.txt`.
- Add `@font-face` rules in `theme.css` (Hanken Grotesk with `font-weight: 100 900`), `font-display: swap`, and **size-matched fallbacks** like the existing Young Serif fallback (measure real widths in a browser and set `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` so text does not jump when the font loads).
- Tokens: `--font-head` = Instrument Serif; `--font-body` = Hanken Grotesk (with its fallback); `--font-mono` stays for the receipt.
- Preload both files in the `<head>` of every page, replacing the Young Serif preload. Remove `young-serif-latin-400.woff2` and `YoungSerif-OFL.txt` once nothing refers to them. Total font weight for the two new files is about 56 KB; report the real transfer size.
- Update `docs/ui-rulebook.md` (type section) to match.

## 2. Roles and scale

- **Instrument Serif** (weight 400, never faux-bold): h1, h2, large statements ("Wherever home is now", "Made together", "Order received"), step numerals. Never below about 1.6 rem (it gets thin when small). Heading colour emerald, or white on emerald.
- **Hanken Grotesk**: body text (weight 400, about 1.0625 rem fluid), nav, buttons (600), labels, h3 and card titles, **product names (600, in sans, not serif)**, prices (600, `font-variant-numeric: tabular-nums`), forms, the receipt keeps its mono font.
- **Bigger, tighter display sizes (fluid tokens, rem and clamp only, D-022):** h1 about `clamp(3.5rem, 2rem + 8vw, 8rem)`, line-height about 0.95, letter-spacing about -0.01em; h2 about `clamp(2.4rem, 1.6rem + 3.6vw, 4.5rem)`, line-height about 1.0; h3 the existing `--step-1` in sans 600. Tune by eye at 390 and 1440 px, but keep the contrast of sizes dramatic (display at least 4 times body size on desktop). The hero h1 must not overflow its panel at 360 px.
- **Section labels (eyebrows):** small uppercase Hanken 600, letter-spacing about 0.18em, size `--step--1` (not below 0.8 rem), **emerald** on white and tinted areas, white or peach on emerald (never copper, never mid-green or sage for small text; report contrast). Put one above each section heading using only words already on the page or in `docs/brand-direction.md`: for example "Our momo", "The sauces", "Made together", "How it works", "Ordering". No new claims.
- Paragraph measure `max-width: 60ch`; headings `text-wrap: balance`, paragraphs `text-wrap: pretty`.

## 3. Rhythm and calm

- A fluid section spacing token (about `clamp(4rem, 2.5rem + 6vw, 8rem)`) between major sections; smaller spacing inside. One container max width token; left-aligned text by default (centre only for the big statement).
- One corner radius family (cards, panels, buttons) from tokens; remove decorative extras that fight the type (extra tags, outlines, double borders). Cards: hairline border, shadow only on hover for pointer devices; no heavy shadows at rest.
- Buttons: Hanken 600, calm solid emerald, a short colour or lift change on hover and a small press state; drop the thick tactile look on everything except the pills inside the product sheet.

## 4. Fewer effects (D-044)

- **Remove the ambient background layer** (the fixed pseudo-element and the `--ambient-*` tokens).
- **Solid, simple:** the sticky header (white with a hairline bottom border), the checkout bar (white or emerald, hairline top border, one shadow token), shop filter chips, card "Add" and quantity controls (clean outline pill and solid emerald button, no blur, no inner highlight), notice strips.
- **Keep glass only** on the full-screen menu layer and the product sheet (its backdrop and the option pills inside it). Remove glass tokens that are no longer used.
- Keep reduced-motion handling and focus rings everywhere.

## Do not

Change copy beyond the labels, behaviour, data, receipt layout, tests (except where class names change, then update and say so), add libraries, gradients or more effects, or start Step 3.

## Must see (open your own screenshots and say what you saw)

Home, shop, cart, done and how to cook at 390 and 1440 px, plus the open menu and product sheet at 390 px:
- Headings are large and tight, labels above each section, body text in Hanken Grotesk, no browser-default look anywhere (check form fields and buttons use the body font).
- Product names and prices are in the sans; the serif appears only in large headings.
- No layout jump when fonts load (throttle the network once to check); h1 fits at 360 px.
- No background spots, no glass anywhere except the menu and the sheet.

## Verify (once each)

`npm test` and `npm run build` pass (list tests changed). Contrast ratios for the labels and any new colour pair. Report the home page transfer size and the two font file sizes. Merge to `main`, push, confirm the deploy ran.

## Tracker checklist to add

- [ ] Fonts self-hosted with fallbacks and preloads; Young Serif removed
- [ ] Roles, bigger display scale, section labels
- [ ] Section rhythm and calmer cards and buttons
- [ ] Ambient layer and extra glass removed (glass only on menu and sheet)
- [ ] Checked in own screenshots, merged to `main`, deploy confirmed

## Report

Use the report format in `CLAUDE.md`, with contrast ratios, one line per "Must see" item, the font sizes and the page transfer size.
