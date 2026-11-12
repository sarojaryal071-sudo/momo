# Step 1l — Type scale and density, public site (decision D-050)

Prerequisite: Step 1k is merged (it is). Merge `origin/main` first. Read `CLAUDE.md`, `docs/decisions-log.md` D-043, D-044, D-050 and **`docs/design/type-and-spacing-spec.md` in full**. Do only this step; do not start 4a2, 4b, 4c or Step 3. Add the checklist at the bottom to `docs/progress-tracker.md` first.

## Why

The owner finds the site's fonts too big and the page not professional. The scale grows with the viewport (body up to about 19px, display up to about 128px) and spacing reaches 128px. We now adopt the size system, spacing and component rules from the spec. Palette, typefaces, layout, copy, behaviour, data, options logic, order flow and receipt do not change.

## Do

1. **Audit first (briefly).** List the font sizes and spacing values actually used for body, UI text, buttons, labels, h1 to h3, product names, prices, section padding and the biggest gaps, in a short table in your report, against the spec. Do not re-audit finished work beyond this.
2. **Tokens in `theme.css`:** replace the `--step-*` scale with the tokens from spec sections 2 and 3 (fixed body, UI, small, eyebrow, input, price, h3, h2, h1, statement; admin tokens scoped under the admin root class), and the spacing tokens from section 4 (`--section-space`, reduced top of the space scale, container, reading width). Keep names meaningful (`--text-body`, `--text-ui`, `--text-small`, `--text-h2` and so on). Remove old tokens nothing uses. Pixel values only inside token definitions (D-022).
3. **Switch every component to them:** header, menu, hero, trust row, product cards, product sheet, tiles, Made together, steps, statement, ordering row, footer, shop, cart, done, how to cook, receipt. Product names and prices in the sans (600); buttons 0.9375rem 600; inputs 1rem with labels 0.875rem 600; form errors 0.875rem with an icon or prefix. No functional text below 0.875rem; only eyebrows and tags at 0.75rem.
4. **Density:** apply `--section-space` and the container and reading widths; shrink the hero per spec section 4 (no viewport-height sizing; first product card name visible after one scroll on a 390 by 844 phone; hero panel at most about 36rem tall on 1440 by 900); remove decorative empty space in tiles, steps, trust row and footer.
5. **Components per spec section 5:** primary and secondary buttons (min height 2.75rem, hover lift at most 2px on pointer devices only, press 1px, `0.18s ease`), a clear **loading and disabled state on "Place order"** ("Placing order..." while saving), inputs with a visible 2px focus ring (never `outline: none` alone), cards flat at rest with a small hover lift for pointer devices only, 44px targets on touch.
6. **Muted text** via one `--muted` token with at least 4.5:1 (no opacity tricks); report the ratios.
7. **No `overflow-x: hidden` hacks** on `html` or `body`: find and fix any real overflow at the source.
8. Update `docs/ui-rulebook.md` (type and spacing sections) to point to the spec and match it.

## Do not

Change colours, typefaces, copy, behaviour, data or tests (except where class names change, then update and say so); add libraries, gradients, effects or animations; touch the admin pages other than the scoped admin tokens that you define (the admin itself is Step 4a2); start Step 3.

## Must see (open your own screenshots and say what you saw)

At 390 by 844 and 1440 by 900: home (top, the first product card, the footer), shop, the open product sheet, cart, done (receipt), how to cook, and the open menu:
- Body text is 16px and does not change between 390 and 1440 (check computed font sizes); h1 is at most about 80px and h2 at most about 48px at 1440.
- First product card name visible after one scroll at 390 by 844; hero panel height within the spec at 1440.
- Section gaps clearly smaller than before but still calm; nothing looks cramped; no component has big empty areas.
- Product names and prices are in the sans; the serif appears only in large headings.
- Inputs are 16px and do not zoom on focus (iPhone widths); focus rings visible on inputs, buttons, chips and links.
- "Place order" shows a loading state and disables itself while saving (use the mock gateway with a delay).
- No horizontal scroll at 320, 375, 390, 414, 768, 1280 and 1440 px.

## Verify (once each)

`npm test` and `npm run build` pass (list tests changed). Contrast ratios for the `--muted` token and any pair you changed. Report the home page transfer size. Merge to `main`, push, confirm the deploy ran.

## Tracker checklist to add

- [ ] Audit table and new type and spacing tokens; old `--step-*` removed
- [ ] All public components switched to the tokens
- [ ] Hero and sections at the new density
- [ ] Buttons, inputs, focus rings, loading state per spec
- [ ] `--muted` token and contrast checked; `overflow-x` hacks removed
- [ ] Checked in own screenshots, merged to `main`, deploy confirmed

## Report

Use the report format in `CLAUDE.md`, with the audit table (before and after), contrast ratios, one line per "Must see" item and every test you changed.
