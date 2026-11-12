> **Do Steps 4b and 4c as one session (D-054).** Do all of this file, commit, then do all of `step-4c-admin-pickup-settings.md`, commit, and give one combined report (under 50 lines). Run each part's own checks once. Merge to `main` only after both parts are done. Build directly on Supabase (D-055): Step 3 is a prerequisite, no demo backend. **Also do D-056 in this session (part 4c):** status buttons (Confirm, Mark ready, Mark collected, Cancel) save the status, then open WhatsApp with the matching editable template; new-order alert (badge, tab title count, optional soft sound, refresh each minute). No email anywhere. Remember D-052 (no visible placeholders or demo wording) and the fonts in D-051.

# Step 4b — Admin: products, options, stock, ingredients and allergens (D-009, D-031, D-046)

Prerequisite: Step 1k is merged (it is) and, for 4b and 4c, the earlier admin sub-step is merged. **Step 3 is not required** (D-048). Read `CLAUDE.md`, `docs/architecture-rulebook.md` sections 4 to 6, 11 and 12, `docs/technical-rulebook.md` sections 4, 5 and 7, and `docs/ui-rulebook.md` sections 2b and 5. Do only this sub-step. Add its checklist to `docs/progress-tracker.md` first.

## Goal

She manages the shop herself: prices, stock, photos, new items, the options customers can choose, and ingredients and allergens.

## Demo backend

Same as in `step-4a-admin-orders.md` (D-048): use `admin/js/api.js` and the `mock` implementation, keep the rules in the shared rules module, and add the operations this step needs.

## Shared rules for every admin page (D-021 style, D-047)

- Plain HTML, CSS and JavaScript; reuse `theme.css` and `base.css` (Instrument Serif for the few large headings, Hanken Grotesk everywhere else, D-043). The admin is plain, clear and **phone first**: big touch targets, one-handed use, no decoration, no glass or ambient effects.
- Auth goes through `admin/js/api.js` (demo login now; Step 3 swaps in Supabase Auth with the vendored, version-pinned `supabase-js` in `admin/js/vendor/`). Every admin page checks the session, otherwise redirects to `login.html`. With the real backend the database enforces the same (`is_admin()`); the page check is only for friendliness.
- `noindex` meta and a restrictive Content-Security-Policy on every admin page. No links to `/admin/` from public pages. No analytics.
- Money in integer pence; show as £10 or £10.50. UK English. Limits, intervals and names are named constants in one admin config file.
- Never hard-delete orders. Customer text is always inserted as text, never as HTML.

## Do

1. **Products** (`admin/products.html`): a list with name, price, stock, availability and a "Sold out" marker at 0. Per product: edit name, kind (`pack` or `addon`), unit label, price (in pounds, stored as pence), availability, order (drag or up and down buttons), active; **add a new item**; upload or replace the photo (to `product-photos`, type and size limits, resized on the client before upload). Show "Changes appear on the site in a minute or two" after saving, because saving triggers the rebuild (D-012).
2. **Stock**: a number per product with quick + and - controls and a plain explanation: "Stock counts packs already frozen and ready. Customised orders are made to order and do not use stock." Empty means not tracked. Stock edits go to `product_stock` and do **not** trigger a rebuild.
3. **Options**: per product, option groups (label, single or multiple choice, order, active) and the options in them (label, optional price change in pence, which one is the default, order, active). Exactly one default per single-choice group; validate this. A **preview** shows how the customer will see the groups and prices. Explain in plain words: "Choosing anything other than the default makes the order customised and needs the longer notice."
4. **Ingredients and allergens** (D-046): an ingredients text box, the **14 UK allergens as tick boxes** (celery, cereals containing gluten, crustaceans, eggs, fish, lupin, milk, molluscs, mustard, tree nuts, peanuts, sesame, soya, sulphites), and an optional "may contain" note. Show a plain warning that the information must be accurate and checked, and that wording for legal statements comes from her and the council. Saving triggers the rebuild.
5. **Public site wiring** (small): the product window and Product JSON-LD show ingredients, allergens and the note when present; when absent the page keeps its visible `TODO:` marker (and the build still fails on it once the site is indexable).
6. The description fields that D-009 forbids stay out; only the three allergen fields above are new.

## Do not

Hard-delete products (set inactive instead), let a price be negative, let an option price change reduce the price below zero, or trust the browser for stock rules (the database does).

## Verify (live run in demo mode)

- Edit a price, availability and stock; the public shop updates after the rebuild (prices and availability) or at once on the cart (stock). Add a new item with a photo; it appears on the shop with the right card.
- Add an option group and options with a price change; they appear in the product window with the right total; a non-default choice shows the customised note.
- Fill ingredients and allergens; after the rebuild they appear in the product window and JSON-LD; clear them and the `TODO:` marker returns.
- Anonymous and non-admin users cannot write any product, option or stock row (refused by the database).

## Report

Use the report format in `CLAUDE.md`, plus what you could not test and anything the owner must do.
