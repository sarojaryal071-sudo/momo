# Step 1c — Rebuild the look to the approved reference

Prerequisite: Step 1b is merged (it is). Read `CLAUDE.md`, `docs/brand-direction.md` (sections 5 and 8), and `docs/ui-rulebook.md` sections 2, 2b and 5 only. Do only this step. Add the checklist at the bottom to `docs/progress-tracker.md` first.

## Goal

Restyle the existing pages to match the approved design reference (decision D-026): direction A, a turmeric hero on a **white** page. Structure, copy, behaviour, tests and data stay as they are. This step overrides any look from Step 1b that conflicts with the reference.

## Reference (open both images first)

- `docs/design/home-reference-a-narrow.jpg` — phone layout.
- `docs/design/home-reference-a-wide.jpg` — wider layout.
They are generated mockups: follow layout, rhythm, colour, type scale and shapes. Do not trace pixels and do not reuse the photos in them. Copy comes from `docs/brand-direction.md` section 4 (the mockups already match it).

## Changes (decision D-026)

1. **White page.** Add `--white: #FFFFFF` and make it the page background. `--cream` becomes a light tint for at most one or two calm bands (for example "How ordering works"). Update every pairing that assumed cream. Report contrast ratios for all pairs you change or add.
2. **No grain on white.** Remove the page-wide paper grain. Keep texture only on the chalkboard panel and the kraft tags.
3. **Header.** White, wordmark left in the display font, "Shop" and "How to cook" right, cart icon with a small chutney-red count badge. No border-heavy styling.
4. **Hero.** A full-width **turmeric** band. Large display headline "Taste like Nepal." in charcoal, subline, a chutney-red button "See the momo". The hero image sits on the right and overlaps the band edge (cut-out look, no visible rectangle). The single-line **ridge line** (charcoal) runs along the base of the hero. Steam wisps rise from the image. On narrow screens the text stacks above a smaller overlapping image, as in the narrow reference.
5. **Made together.** Full-width **charcoal** band directly under the hero, white or cream text, centred or left as in the reference, restrained width.
6. **Fold. Fill. Steam.** On white. Large chutney-red numerals 1, 2, 3 with the short lines beside them, in a row on wide screens and stacked on narrow ones. One momo image slot beside them. Not three identical cards.
7. **The chutney.** Full-width turmeric band, charcoal text, the chutney bowl image slot at the right.
8. **Wherever home is now.** On white, large centred type, generous space.
9. **Packs.** The chalkboard panel with a fold border. The kraft tag "Pickup only" overlaps the panel's right edge, slightly rotated. Chutney-red "Add to cart" button centred in the panel.
10. **How ordering works.** Simple, centred: "Choose. Confirm. Pick up and pay cash." with the ridge line above the footer.
11. **Footer.** Charcoal bar: phone on the left (with a small phone glyph drawn in SVG), "Pickup only. Pay cash on pickup." on the right on wide screens, stacked on narrow.
12. **Other pages** (shop, how to cook, cart, done): same white page, same header and footer, the chalkboard and kraft-tag styles. Keep them calm; no new bands unless they help. Form fields: white with a clear charcoal border, or `--cream-light` fill if needed. Do not change behaviour or the markup hooks that scripts and tests use.

## Image slots

The reference hero and chutney images are **cut-outs with transparent backgrounds** (a steamer of momo; a bowl of chutney), and the momo near the steps is a single cut-out. Wire the slots so transparent WebP or PNG cut-outs sit correctly: hero (about 1200 by 1200, transparent), momo (about 800 by 800, transparent), chutney bowl (about 800 by 800, transparent), plus the existing kitchen slot if still used. Until real images arrive, use simple flat placeholders that keep the layout honest (a plain rounded shape or silhouette in clay or charcoal at low contrast), clearly marked as placeholders, so the layout works with and without real images. List the exact slot filenames and sizes in your report. The owner will supply the cut-outs.

## Do not

Reuse the mockup photos, add gradients, glows, emoji, identical-card rows, leaves or any new decoration not in the reference, religious symbols or the national flag, new libraries, or new claims. Do not touch ordering logic, data, tests or build validations. Start Step 3.

## Verify (once each, per `docs/usage-rules.md`)

- Home at 360 px and at wide desktop: compare with the narrow and wide references; no horizontal overflow; the hero image overlaps cleanly; no layout shift.
- Shop, how to cook, cart, done at 360 px: white page, header and footer consistent, forms readable.
- Contrast ratios for every new pairing (body text at least 4.5; large text at least 3).
- Keyboard focus visible on turmeric, charcoal and white; reduced motion honoured; content visible without JavaScript.
- `npm test` and `npm run build` pass. Report the home page transfer size.
- After merging to `main`, confirm the deploy ran. No Lighthouse (the owner uses PageSpeed Insights).

## Tracker checklist to add

- [ ] White page, cream demoted, grain removed
- [ ] Header and footer to the reference
- [ ] Hero band with overlapping cut-out slot and ridge line
- [ ] Made together band, steps, chutney band, statement, chalkboard with kraft tag, ordering
- [ ] Other pages aligned
- [ ] Cut-out image slots with honest placeholders
- [ ] Verified, merged to `main`, deploy confirmed

## Report

Use the report format in `CLAUDE.md`, including the contrast ratios and the image slot filenames and sizes.
