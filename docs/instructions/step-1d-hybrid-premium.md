# Step 1d — Hybrid premium rebuild (decisions D-027, D-028)

Prerequisite: Steps 0 to 2 and 1b, 1c are merged (they are). Read `CLAUDE.md`, then open `docs/design/hybrid-reference-grocery.jpg` and `docs/design/palette-emerald-copper.jpg`, then read `docs/ui-rulebook.md` sections 2, 2b and 5 and `docs/brand-direction.md` sections 4, 5 and 8. Do only this step. First add the checklist at the bottom to `docs/progress-tracker.md`.

## Goal

The current site looks plain and childish. Rebuild the look as a premium, clean shop: a white page, deep emerald and copper, a rounded hero panel with a cut-out food image, a calm trust row, real product cards, and a rich footer, with our "Made together" story in emerald bands. Copy, behaviour, tests and data do not change, except where this file says so.

## How to use the reference

The grocery mockup is a template for **structure, rhythm and polish**. It is an AI mockup of a supermarket: do not trace it, do not reuse its photos, and do not copy its content. **Leave out** (D-027): gradients (use flat tints), star ratings, discounts and "% off", deal countdowns, rewards, delivery messaging, account, wishlist and "track order" icons, the location chip, "Shop by category" and "Shop by needs" blocks, invented badges such as "Best seller", "Organic" or "Fresh", and the search bar until the catalogue is big enough (D-028).

## Palette and tokens (D-027)

Use the table in `docs/ui-rulebook.md` section 2, including the shape and shadow tokens. Add the tokens to `frontend/css/theme.css` (fluid and token-only per D-022), switch every component to them, then remove the retired colours (`--coriander`, `--clay`, `--cream`, `--cream-light`) once nothing uses them. Rules that matter most:
- Buttons: emerald, white text. Never white text on copper or mid-green; never small text in copper, mid-green or sage.
- Focus ring: emerald on white and tinted areas; peach or white on emerald.
- No gradients anywhere. Flat tints only.
- Report contrast ratios for every text and background pair you actually use.

## Home page, top to bottom

1. **Header** (white): small drawn mark (a simple fold glyph) with the wordmark in the display font, nav (Home, Shop, How to cook), the phone number as a link, and the cart icon with a count badge. No search, account, wishlist or track-order. Calm, generous spacing; sticky is optional if it stays slim.
2. **Hero panel**: a rounded `--green-tint` panel inside the page margins (not edge to edge). Left: small eyebrow "HOMEMADE · FROZEN · PICKUP", H1 "Taste like Nepal." in emerald display type, the subline from `docs/brand-direction.md` section 4, a primary button "See the momo" and a secondary "How to cook". Right: the **cut-out hero image** overlapping the panel edge with `--shadow-card`, with the steam wisps rising from it. A thin sage ridge line runs along the panel's base. On narrow screens the image sits below the text and the layout stacks.
3. **Trust row** (inside the bottom of the hero panel, or directly under it): four short items with small line icons you draw as SVG (single stroke, `currentColor`, no icon set, no emoji). Use exactly: "Homemade — Made at home, then frozen" / "Frozen — Ready to steam at home" / "Pickup only — Order online, collect in person" / "Pay cash — Pay when you pick up". No other claims.
4. **Our momo** (white): heading with a "View all" link to the shop, then **product cards** for the available products, up to `HOME_PRODUCT_LIMIT`. A card holds: image slot on a `--green-tint` square, name, size ("40 pieces"), price, quantity control and "Add to cart". Badges only for real states ("Sample" and "Unavailable"), never invented ones. The cards must keep every class, `data-*` attribute and ID the cart scripts and tests rely on. The grid uses `repeat(auto-fit, minmax(min(100%, var(--card-min)), 1fr))` with a max card width so one or two items do not stretch absurdly.
5. **Two tiles** (different widths, not identical): a `--green` or emerald tile "Pickup only" with one sentence and the pickup `data-todo` marker, and a `--peach` tile for the chutney ("Momo is traditionally served with a spicy tomato dip." / "Add our spicy tomato chutney to your order.") with the chutney cut-out slot and a button to the shop. Both link to real places and make no offers or discounts.
6. **Made together**: a full-width emerald band, white text, the fold divider, restrained text width, with the kitchen image slot beside the text when an image exists (copy from the brand direction, section 4).
7. **Fold. Fill. Steam.** (white): large copper numerals 1, 2, 3 (large size only) with the three short lines, and the wrapper, fold, finished-momo arrow illustration (drawn as single-stroke SVG, placeholder art) beside them. Not three identical cards.
8. **Wherever home is now** (white): the large statement, plenty of space.
9. **How ordering works**: "Choose. Confirm. Pick up and pay cash." in a calm row, with a `--peach-tint` background and the small kraft tag "Pickup only".
10. **Footer** (emerald, ridge line above): four columns on wide screens (brand with "Taste like Nepal."; Quick links: Home, Shop, How to cook; Shop: the product kinds; Get in touch: the phone number and "Pickup only. Pay cash on pickup."), stacked on narrow. A bottom line "© Steam & Spice" with no year, plus privacy and terms links only when those pages exist. No social icons until accounts exist.

## Shop page (D-028)

- Heading, then the filter chips by `kind` (labels from data, for example "Momo" and "Sauces"); show chips only when there are at least two kinds.
- A search box appears only when the product count is at least `SEARCH_MIN_PRODUCTS` (named constant in `frontend/js/site-config.js`, with `HOME_PRODUCT_LIMIT`). Both must work without breaking the static HTML: all cards exist in the HTML; filtering only hides and shows them, and everything is visible without JavaScript.
- Same product card as the home page. An empty state ("New items are coming soon.") if no products exist.
- Keep the allergen `TODO:` and the sample-value labels. Keep the Product JSON-LD logic unchanged.
- Remove the chalkboard panel as the product list. Do not delete the kraft tag.

## Other pages

How to cook, cart and done: same header and footer, the new palette, calm and functional, fields white with a clear emerald border and visible labels. Do not change behaviour, markup hooks used by scripts and tests, or copy.

## Images (the biggest factor in how premium this looks)

Premium comes mostly from photography. Wire these slots with transparent cut-outs in mind, `width` and `height`, `srcset`, lazy loading below the fold, honest alt text, and use `--shadow-card` where an image overlaps: hero (about 1200 by 1200), each product card (about 800 by 800 each, from the product's `photo`, falling back to a placeholder), chutney bowl (about 800 by 800), and kitchen (about 1200 by 800). **Placeholders must look intentional:** a tonal tile with a quiet single-stroke line drawing (momo, steamer, bowl) in sage on the tint, small and clearly a placeholder, not a flat grey box. **The images now exist:** they are already in `frontend/assets/img/`. Read `docs/design/image-manifest.md` first and follow it exactly: which files are cut-outs, which two pack shots need `mix-blend-mode: multiply` on a light tinted container, where each one goes, the suggested alt text, and the known limits (the hero lid is clipped on its right edge; the scenes are 1024 px wide). Wire these real files in place of the placeholders, keep the filenames, and delete placeholder files nothing refers to any more. Seed product `photo` values: `chicken-momo` uses `pack-chicken`, `veg-momo` uses `pack-veg`; the sauce pots keep the intentional placeholder until they have images. Report any asset you could not use as the manifest describes.

## Do not

Reuse the mockup photos, copy its content or add gradients, ratings, discounts, rewards, delivery messaging, invented badges, emoji, religious symbols or the national flag; add libraries; change ordering logic, data, tests or build validations beyond what D-028 needs; or start Step 3.

## Verify (once each, per `docs/usage-rules.md`)

- Home at 360 px and wide desktop against the reference's structure; no horizontal overflow; no layout shift; hero image overlaps cleanly; trust row and cards align.
- Shop with 2 products (now) and with a temporary 12-item test set (not committed): grid looks right, chips and search appear only per the thresholds, empty state works.
- Cart, done, how to cook at 360 px: new header, footer, palette, forms readable.
- Contrast ratios for every pair used. Keyboard focus visible on white, tinted and emerald areas. Reduced motion honoured. Content visible without JavaScript.
- `npm test` and `npm run build` pass; the remaining retired tokens are gone. Report the home page transfer size.
- After merging to `main`, confirm the deploy ran. No Lighthouse (the owner uses PageSpeed Insights).

## Tracker checklist to add

- [ ] Emerald & Copper tokens in; retired tokens removed
- [ ] Header and footer rebuilt (footer columns, ridge line)
- [ ] Hero panel with cut-out slot, trust row
- [ ] Product cards on home and shop; `HOME_PRODUCT_LIMIT`, `SEARCH_MIN_PRODUCTS` constants; chips and search thresholds
- [ ] Two tiles, Made together band, steps with illustration, statement, ordering row
- [ ] Cart, done, how to cook aligned
- [ ] Image slots and intentional placeholders
- [ ] Verified, merged to `main`, deploy confirmed

## Report

Use the report format in `CLAUDE.md`, including contrast ratios, image slot filenames and sizes, and any reference element you chose not to use and why.
