# Step 1 — Static pages (home, shop, how to cook)

Prerequisite: Step 0 done and deployed. Read `CLAUDE.md`, the UI rulebook and the SEO rulebook first. Do only this step.

## Goal

The public pages, hand-written, mobile first, readable by Google, using local seed data for products. No cart, no ordering yet (the buttons exist but are inert or link to the shop).

## Do first: fluid tokens (decision D-022)

Before any page work, do this once and add it as the first unchecked item of Step 1 in `docs/progress-tracker.md`:

- Extend `frontend/css/theme.css` with the fluid type scale, spacing scale, layout, and control tokens listed in `docs/ui-rulebook.md` section 2b. Keep the existing colour and font token names.
- Convert `frontend/css/base.css` so it uses only tokens: the focus ring (`3px` and offset), the paper-grain and heading sizes, and the `.wrap` and `.section` rules. The visually-hidden helper is the only exempt rule.
- Document the (at most two) media-query widths in a comment block in `theme.css`.
- Check only that `index.html` still renders at 360 px and at desktop width. No other verification for this item.

## Do

1. **Shared pieces** (copied by hand into each page, no templating): header with brand name, nav (Home, Shop, How to cook), a cart link with a count placeholder, and a phone or WhatsApp link; footer with the phone number, "Pickup only", and a short line. Add `frontend/css/components.css` for buttons, header, footer, forms, notice strip, and the chalkboard menu panel. Colours only via tokens.
2. **`index.html`**: hero with the tagline "Taste like Nepal" and one button to the shop; a short "taste of home" passage (draft it plainly; no invented backstory); the two packs with price; "How ordering works" in three short steps (choose, confirm, pick up and pay cash); contact. Vary the layout between sections; follow the "avoid the AI look" list.
3. **`shop.html`**: chalkboard-style menu panel for the two packs (real text, not an image), then sauce add-ons. Use the marked region `<!-- build:products -->` ... `<!-- /build:products -->` containing valid fallback HTML generated from `frontend/data/products.seed.json`. Each product block carries `data-slug` and `data-price-pence`. Add-to-cart buttons are present but only do something in Step 2. Sauce prices: show "Price to be confirmed" with a `TODO:` marker.
4. **`how-to-cook.html`**: short steps for cooking from frozen. Cooking times are not known: use a visible `TODO: steam time to be confirmed by owner`. Not a recipe.
5. **Products data**: create `frontend/data/products.seed.json` with chicken momo, veg momo (both pack, 40 pieces, 1000 pence), chutney pot and hot sauce pot (addon, price `null`, unavailable until priced). Create `frontend/content/products/<slug>.json` for the two momo packs with a short description and SEO text written by you, nothing invented about ingredients or allergens.
6. **Images**: use clearly named placeholder images in `frontend/assets/img/` (simple flat colour or texture WebP files are fine). The owner will generate the AI mood images; list the image slots you need (hero, momo close-up, chutney bowl, kitchen corner) with target sizes in your report. Every image has `width`, `height`, honest `alt`.
7. **SEO basics on every page** per `docs/seo-rulebook.md` section 3, plus the JSON-LD for Organization and Product (generated in `build.mjs` or written as fallback HTML in the marked region). Extend `build.mjs` to fill the marked region from the seed file with `--seed` and to run the validation checks (title, description, canonical, one `h1`).
8. **Responsive and accessible**: 360 px first, visible focus, 44 px targets, skip link.

## Do not

Add a cart, ordering, Supabase calls, analytics, web fonts, emoji icons, or any invented facts.

## Verify (live run)

- Open all three pages at 360 px and at desktop width on the deployed URL. Check layout, nav, footer, chalkboard panel.
- View page source: all headings, product names and prices are in the HTML without JavaScript.
- Lighthouse on `index.html` and `shop.html`: report performance, accessibility, SEO scores.
- `npm run build` passes the validations. With `SITE_INDEXABLE` unset the pages carry `noindex`.
- Contrast ratios for every text and background pair you used.

## Report

Use the report format in `CLAUDE.md`, including the list of image slots and every `TODO:` left.
