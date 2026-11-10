# Step 1i — Glass pills fix: menu, product sheet, options (decisions D-040, D-041)

Prerequisite: Step 1h is merged (it is). Merge `origin/main` first. Read `CLAUDE.md`, `docs/decisions-log.md` D-039 to D-041 and `docs/ui-rulebook.md` sections 2b and 5. Do only this step; do not start Step 3. Add the checklist at the bottom to `docs/progress-tracker.md` first. This is the **last visual change to the customer screens** before they are locked, so do it carefully and **look at your own screenshots** (390 px wide, menu open and product sheet open) before you report: open each image and check it against the "Must see" list below. The owner tested the last version on a real phone and found the problems listed here.

## What is wrong now (from the owner's phone)

1. **Menu:** no close button is visible (the header controls are hidden behind the full-screen layer); the top third of the screen is empty; the links are flat solid white and peach blocks with a thick sage bottom edge, which looks like a cartoon. The owner wanted glass pills.
2. **Product sheet:** the close button shows a heavy double focus ring after a touch; the sheet looks muddy grey over the dark blurred page; there is a large empty gap between the options and the footer; the option pills have the same thick cartoon bottom edge; the quantity control looks flat and rectangular next to the pills.

## Shared pill style (tokens only, D-022)

Define in `theme.css`: a glass pill built from tokens: translucent fill, `backdrop-filter: blur(var(--glass-blur))` (inside `@supports`, solid fallback), a 1 px light border, an inner top highlight (`inset 0 1px 0` light), and a soft drop shadow. Press state: move down about `--depth`, shadow shrinks, `--dur-fast`, spring easing back. **No thick coloured bottom border, no solid white or peach fills, no gradients.** Hover and focus are subtle (slightly brighter fill); keyboard focus ring visible via `:focus-visible` only. Reduced motion: no transforms. Two variants: **on-dark** (white text on emerald-tinted glass) and **on-light** (emerald text on white glass with a faint emerald-tinted border).

## 1. Full-screen menu

- **Layer:** an emerald-tinted glass layer (`--glass-emerald` token, emerald at high alpha plus strong blur) over the blurred page, so the page shows through softly. It must not be a flat plain colour. Keep the ridge line at the bottom. Opens with the existing animation (fade and scale or the circular reveal); reduced motion: instant.
- **Top bar inside the layer:** wordmark on the left and a **large visible close button (X)** on the right, in a glass circle at least 48 px, plus the cart link if it was visible before. These must be inside the overlay itself (do not rely on the header behind, which sits under the layer because `backdrop-filter` creates its own stacking context). The close button works by tap, Escape and tapping outside the pills; focus returns to the menu button.
- **List:** the links (Home, Shop, How to cook) as on-dark glass pills, content width (`min(100%, 22rem)` token), centred, vertically centred in the space under the top bar so there is no big empty block above. The current page gets a stronger glass fill and a small marker dot, not a peach block.
- **Contact group** below, with a small label ("Get in touch"): phone, WhatsApp and Instagram as smaller on-dark glass pills. The Instagram line keeps its `data-todo` placeholder until the URL exists.
- Text white on the glass: contrast at least 4.5 against the worst case (the blurred page behind can be light), so set the tint alpha accordingly. Report the measured ratios.

## 2. Product sheet

- **Focus:** never show a ring on the close button after a touch or mouse open. Use the same last-input logic as the menu: keyboard opens focus the first control with a visible ring; pointer opens focus the dialog container.
- **Surface:** the sheet is a clean, light glass surface (`--glass-bg-strong`, clearly lighter than the page behind), not grey. The backdrop scrim is a light emerald-tinted dim with blur (a token), not a grey-black wash.
- **Height:** the sheet sizes to its content, up to `85dvh`; no empty gap. The footer (quantity and "Add to cart · £total") stays pinned at the bottom of the sheet; only the middle scrolls when content is taller.
- **Option pills:** the on-light glass pill; **selected** is solid emerald with white text and an animated tick; spacing tidy (rows wrap, equal gaps, group labels clear). Sizes stay compact (44 px tap height, no full-width rows).
- **Quantity stepper:** a pill-shaped glass control with round minus and plus buttons (44 px) and the number between; disabled minus is dimmed. Same press feel. The primary button keeps the solid emerald fill.

## 3. Same pills elsewhere

Use the same glass pill and press feel for the shop filter chips and the card "Add" and quantity controls so the whole site matches. Keep contrast and 44 px targets.

## Do not

Add gradients, thick coloured bottom edges, flat solid white or peach blocks for pills, new libraries, emoji or new copy. Change behaviour, data, options logic, the receipt, the order flow or tests beyond what these sections need. Start Step 3.

## Must see (check your own 390 px screenshots, and say what you saw)

- Menu open: wordmark and a visible X at the top; pills centred with no big empty top area; the page softly visible through the tinted layer; no thick coloured edges; white text readable.
- Product sheet open: no focus ring on the X after a click; the sheet looks light and clean; no big empty gap; the footer is pinned; option pills look like glass pills; selected pill is emerald with a tick; the stepper matches.
- Keyboard run: focus ring visible on menu pills, X, option pills and stepper. Reduced motion run: no movement.
- Without `backdrop-filter` support, surfaces fall back to solid tokens and stay readable.

## Verify (once each)

`npm test` and `npm run build` pass (list tests changed). Contrast ratios reported for the menu, sheet, pills and selected pills. Merge to `main`, push, confirm the deploy ran.

## Tracker checklist to add

- [ ] Glass pill tokens and press state
- [ ] Full-screen menu: tinted glass layer, visible X and wordmark, centred pills, contact group
- [ ] Product sheet: focus fix, light glass, content height, pinned footer
- [ ] Option pills and stepper restyled
- [ ] Filter chips and card controls match
- [ ] Checked in own screenshots, merged to `main`, deploy confirmed

## Report

Use the report format in `CLAUDE.md`, with contrast ratios, a line for each "Must see" item saying what you saw, and every test you changed.
