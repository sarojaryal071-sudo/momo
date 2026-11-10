# Step 1j — Cart on desktop, and the ambient background (decision D-042)

Prerequisite: Step 1i is merged (it is). Merge `origin/main` first. Read `CLAUDE.md`, `docs/decisions-log.md` D-039 to D-042 and `docs/ui-rulebook.md` sections 2b and 5. Do only this step; do not start Step 3. Add the checklist at the bottom to `docs/progress-tracker.md` first. Small step: two parts.

## 1. Cart page on desktop (bug found by the owner)

**What is wrong:** on a wide screen the quantity control in the cart line is a very wide pill with the - 1 + controls squashed at its left end and empty space to its right. Cause: `frontend/css/components.css` has `.cart-line > div { flex: 1 1 14rem; }`, which was meant for the product name block but also matches the quantity control, because it is a `div` too (`class="qty stepper"`).

Fix it properly, not just with a more specific selector:
- The quantity stepper is content width (never grows); only the name block grows.
- On wide screens lay each cart line out as a grid with fixed columns: name and details (flexible) / stepper / line price (right-aligned) / Remove, aligned from line to line. Phone layout (wrapping) stays as it is.
- The wide cart page uses a two-column layout from the desktop breakpoint token up: the lines and the total on the left, "Your details" (name, phone, pickup, notes, "Place order") on the right in a solid white card with the `--shadow-card` token, with a maximum overall width token. Narrow screens stay a single column, as now. Keep every class, `data-*` attribute and ID the scripts and tests rely on.
- Check that no other `> div` or flex rule stretches a stepper elsewhere (product card, product sheet, cart).
- The "Your cart" heading must not touch the sticky header: check the top spacing at the wide width.
- Tokens only, no pixel values outside `theme.css` (D-022).

## 2. Ambient background (D-042)

Add one decorative layer behind the whole site:
- Implementation: a single fixed pseudo-element (for example `body::before`), `position: fixed; inset: 0; z-index: -1; pointer-events: none`, `aria-hidden` by nature, with three soft spots: emerald tint (top left), peach (right, about mid height), sage (bottom left). Use soft radial spots or blurred solid circles, whichever is cheaper on a phone; no animation; no extra HTTP request.
- Tokens in `theme.css`: spot colours (from the existing palette tokens only), sizes, positions, and `--ambient-opacity` (start at about 0.18 for the spots; the page background stays `--white`). Setting `--ambient-opacity: 0` must switch it off completely.
- Legibility: charcoal text on the most coloured area of any spot must stay at least 4.5:1; report the ratio. Content cards, forms and the receipt stay solid; emerald bands and the hero panel simply cover the layer. Hide it in print styles.
- Respect `prefers-reduced-transparency` and `prefers-contrast: more`: no spots.
- Check performance: no layout shift, no scroll jank on a 360 px viewport; the layer must not repaint on scroll.

## Do not

Add other gradients, animations or images to the background, change colours of existing tokens, or change behaviour, data, tests, or the receipt. Start Step 3.

## Must see (open your own screenshots and say what you saw)

- Cart at 1440 px wide: stepper is content width and aligned in its column; two-column layout; no huge empty areas; heading clear of the header. Same at 1024, 768 and 390 px.
- Home and shop at 390 and 1440 px, with the ambient layer on and then with `--ambient-opacity: 0`: spots visible but faint; the glass header, menu and checkout bar show soft colour through them; text clearly readable. Save the four screenshots (on and off, narrow and wide) in the scratchpad and describe them; do not commit them.

## Verify (once each)

`npm test` and `npm run build` pass (list tests changed). Contrast ratio reported. Merge to `main`, push, confirm the deploy ran.

## Tracker checklist to add

- [ ] Stepper content width; cart line grid and two-column wide cart
- [ ] Ambient background layer with tokens and kill switch
- [ ] Checked in own screenshots, merged to `main`, deploy confirmed

## Report

Use the report format in `CLAUDE.md`, with the contrast ratio, one line per "Must see" item, and the exact token to set to turn the ambient layer off.
