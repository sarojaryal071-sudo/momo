# Step 1b — Visual upgrade ("Made together")

Prerequisite: Steps 0 to 2 merged into `main`. Read `CLAUDE.md`, then `docs/brand-direction.md` in full, then only the sections of `docs/ui-rulebook.md` you need (2, 2b, 3, 5, 6). Do only this step. Add the checklist below to `docs/progress-tracker.md` as a "Step 1b" section first.

## Goal

Make the existing pages look professional, plain and beautiful, following the brand direction. Nothing about ordering, data or tests changes. No new features.

## Do

1. **Tokens (fluid, per D-022).** Extend `frontend/css/theme.css` with what the upgrade needs: a larger display type step, band padding and rhythm tokens, divider and motif sizes, tag and label tokens. Pixel values only in token definitions.
2. **One display font (D-025).** Choose one open-licence serif (SIL OFL or similar) for headings. Self-host a Latin subset as `woff2` in `frontend/assets/fonts/`, at most about 80 KB in total, `font-display: swap`, with a metric-matched fallback so the layout does not jump. Add its licence file next to it. Body text stays on the system stack. Report the font chosen and its size.
3. **Hand-drawn motifs** as small SVG files in `frontend/assets/svg/`, imperfect and drawn with a single stroke where possible, colours through `currentColor` or CSS variables: the fold (pleat divider and panel border), the ridge line (hero and above footer), steam wisps, and the kraft tag shape. No prayer flags, religious symbols or flags. Mark decorative SVGs `aria-hidden="true"` and use them as CSS backgrounds or inline only where they must inherit colour.
4. **Home page.** Rebuild `index.html` to the copy spine in `docs/brand-direction.md` section 4, using the exact strings. Layout intent:
   - Hero: very large display headline, ridge line, steam, one image slot, one button.
   - "Made together": a full-width charcoal band, cream text, the fold divider.
   - "Fold. Fill. Steam.": three steps as large numerals set editorially, not three identical cards. Vary alignment and size.
   - "The chutney": a turmeric band with charcoal text.
   - "Wherever home is now": a quiet full-width statement in large type with plenty of space.
   - Packs: the chalkboard panel with fold border and kraft-tag prices.
   - How ordering works and contact: calm, simple.
5. **Shop, how to cook, cart, done.** Apply the motifs and tokens lightly: fold border on the chalkboard panel, kraft tags for price, "Pickup only" and availability, ridge line above the footer. Cart and done stay calm and functional. Do not change behaviour or markup that scripts and tests depend on.
6. **Header and footer.** A simple text wordmark (placeholder name) in the display font, more generous spacing, the ridge line above the footer, phone and "Pickup only" kept.
7. **Image slots.** Wire the four slots with responsive `<picture>` or `srcset`, fixed `aspect-ratio`, `width` and `height`, lazy loading below the fold, honest alt text. Keep the placeholders until the owner supplies images; the page must look good with placeholders and with real images.
8. **Motion.** At most two effects: slow steam drift, and a gentle fade-in as sections appear. Pure CSS where possible; a tiny script for the reveal is allowed if content is fully visible by default without it. Honour `prefers-reduced-motion`. No animation libraries.
9. **Copy rules.** Use the strings in the brand direction. Anything marked [CONFIRM] must appear as a visible `data-todo` marker, not as plain text. Add no cultural or product claims that are not in `docs/brand-direction.md` section 2.

## Do not

Change ordering logic, tests, data files or the build validations. Add libraries, gradients, emoji, rows of identical cards, stock photos, or anything copied from another site. Start Step 3.

## Verify (once each, per `docs/usage-rules.md`)

- Open home, shop, how to cook, cart and done at 360 px and at desktop width. No horizontal overflow; no layout shift on load; motifs readable; text never over a busy part of an image.
- Contrast ratios for every new text and band pairing (report numbers; body text at least 4.5).
- Keyboard focus visible on the new bands; reduced motion honoured; page readable with JavaScript off.
- `npm test` and `npm run build` pass. Report the total weight of fonts and SVGs and the size of the home page transfer.
- After merging to `main`, confirm the deploy ran. Do not run Lighthouse (the owner uses PageSpeed Insights).

## Tracker checklist to add

- [ ] Fluid tokens extended
- [ ] Display font self-hosted with licence
- [ ] SVG motifs (fold, ridge line, steam, kraft tag)
- [ ] Home page rebuilt to the copy spine
- [ ] Shop, how to cook, cart, done, header and footer updated
- [ ] Image slots wired
- [ ] Motion (two effects, reduced-motion safe)
- [ ] Verified and merged to `main`

## Report

Use the report format in `CLAUDE.md`, including the font chosen, the weights, and the contrast ratios.
