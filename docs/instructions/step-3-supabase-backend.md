# Step 3 — Supabase backend and real orders

Prerequisite: Step 2 done. Read `CLAUDE.md`, `docs/architecture-rulebook.md` sections 4 to 7 and the technical rulebook sections 2, 3 and 5 first. Do only this step.

> **Order change (D-055, supersedes D-048): this step now comes BEFORE Steps 4bc.** Build everything for the real backend so that nothing is redone later (see "Added by D-055" at the end of this file). The older note follows for background. **(D-048):** the admin screens (Steps 4a to 4c) are built first on a demo backend. This step therefore also **connects the admin to Supabase**: implement the `supabase` side of `admin/js/api.js` (replacing the stub), add Supabase Auth login with the two admin users and the vendored, version-pinned `supabase-js` in `admin/js/vendor/`, optional two-step login (TOTP), and run the same behaviour checks the mock rules tests describe against the real database. Switch `siteConfig.backend` to `supabase` only at the end, keep `mock` selectable for local work, and remove the demo banner and demo accounts from production.

## Goal

Real orders: the site saves each order in a database, assigns the order number (`SS-DDMM-NN`, D-032) and emails the owner (D-037). The order is placed on the site; the customer does not have to send a WhatsApp message (D-036). The shop reads real products at build time and real pickup rules at runtime.

## Owner actions first (list them clearly in your first message to the owner, then wait)

1. Create a Supabase project (free tier) and note the project URL and anon key.
2. In Authentication settings, **disable public sign-ups**. Create two admin users: the owner (her email) and the developer, each with a strong password; both are added to `admins` by a documented SQL statement.
3. Choose the email provider and create an API key (suggestion: Resend free tier). The owner's email address goes only into a Supabase function secret.
4. Create a fine-grained GitHub token limited to this repository with permission to run workflows. It goes only into a Supabase function secret.
5. Add repository variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` (public values) in GitHub.

**Project settings the owner chose (12 Nov 2026):** project "Steam & Spice", region Europe, Data API on, **"Automatically expose new tables" off**, **"Automatic RLS" on**. Therefore every migration must create tables with RLS enabled and add explicit `GRANT`s for exactly the roles that need access (anon read on public tables only, authenticated for admins), and the policy tests must prove it.

Write `backend/README.md` as a step-by-step guide for these actions in plain language, with where each value goes.

## Do

1. **Migrations** in `backend/supabase/migrations/`, numbered and forward-only: all tables and indexes from section 4 of the architecture rulebook (including the nullable `products.category` column, D-028; the shop's filter chips use `category` when present, otherwise `kind`), the `is_admin()` function, row-level security policies from section 5, the `product-photos` storage bucket and its policies, and a `place_order` SQL function that does the counter and insert in one transaction with row locking.
2. **`seed.sql`**: the two momo packs (prices from decision D-002), the two sauce pots (inactive or unavailable, no price), default settings (`order_prefix` `SS`, `min_lead_hours` 24, `max_days_ahead` 14, `max_qty_per_item` 10), default pickup rules (Saturday and Sunday 10:00 to 18:00, time step 1 minute, D-038), an empty notice row. Keep it free of any personal data.
3. **`place-order` function** exactly as architecture section 6: validation, server-side price recalculation, pickup checks, honeypot, IP rate limit, number assignment, insert, email the owner through the provider (failure never loses the order), return `{ orderNumber, totalPence }`. CORS limited to the site's origins (from a secret).
4. **`trigger-rebuild` function** and a database webhook on `products` insert, update and delete, starting the deploy workflow through the GitHub API. Add `workflow_dispatch` handling to the workflow if missing.
5. **Frontend wiring**: implement the `supabase` gateway in `order-gateway.js` (plain `fetch` to the function), read pickup rules and exceptions and public settings in `pickup.js` over REST with the anon key, switch `site-config.js` to `backend: 'supabase'` with the public URL and anon key (these may be in the repo). Keep `mock` selectable for local development.
6. **Build**: extend `build.mjs` per architecture section 7 steps 2 to 6: fetch active products, merge with `frontend/content/products/<slug>.json`, fill the marked regions, write `dist/data/products.json`, download and convert photos to WebP. Failed or empty fetch fails the build in CI. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the workflow environment.
7. **Notice banner**: `notice.js` fetches `site_notice` and shows the strip on every public page when active; silent on failure; reserve space so the layout does not jump.
8. **Tests**: a script (documented in `backend/README.md`) that proves: anonymous users cannot read or write `orders`, cannot read inactive products or non-public settings; a tampered price is ignored; two simultaneous orders get different numbers; a sold-out product is rejected; an order with every optional field empty succeeds.

## Changes from decisions D-032 to D-039

- The order is placed on the site (D-036): the function requires name and phone (UK format) and rejects an order without them; the cart and done pages follow `docs/technical-rulebook.md` section 3. Remove the automatic WhatsApp opening on the done page; keep the WhatsApp message builder for the failure backup and for the admin panel (Step 4).
- Email alert to the owner (D-037) through the chosen provider; owner email and API key only in function secrets.
- `pickup.js` and the checks use the time step from each rule's `slot_minutes` (default 1): any minute inside her windows is valid (D-038); a time outside every window, off the step or earlier than the lead time is rejected by the function.
- Keep `mock` selectable.

## Added by decision D-031 (options, stock, custom lead time)

Read `docs/architecture-rulebook.md` section 11 first. In addition to the list above:
- Migrations for `product_option_groups`, `product_options`, `product_stock`, the new `settings` keys (`custom_min_lead_hours` 48, `low_stock_threshold` 5) and their row-level security. The database webhook that triggers a rebuild covers `products`, `product_option_groups` and `product_options` only, **not** `product_stock`.
- `place_order` (SQL function) and the `place-order` edge function: accept option ids per line, recompute every price with the option price changes, derive the `customised` flag, apply `custom_min_lead_hours` to the pickup check when any line is customised, check and lower stock for standard lines in the same locked transaction, and store the options and flag in the order snapshot. Reject an option from another product, an inactive option, two options in one `single` group and a quantity above the stock.
- Seed: the sauces and momo get a few sample option groups only if the owner has listed them; otherwise seed none. Stock seeded with a sample quantity marked as sample.
- Frontend: replace the mock option, stock and lead-time sources from Step 1f with the real ones (runtime `fetch` with the anon key; keep the mock selectable).
- Tests: a tampered option price is ignored; an option from another product is rejected; two simultaneous orders for the last item let only one succeed and the stock never goes below 0; a customised order inside the custom notice period is rejected and a standard order is not; a customised order does not lower stock.

## Added by decisions D-045 to D-047 (admin additions)

Read `docs/architecture-rulebook.md` section 12 first. In addition to the list above:
- Migrations for the new columns (`products.ingredients_text`, `products.allergens`, `products.allergen_note`, `orders.source`) and the new settings keys (public: `ordering_open`, `ordering_closed_message`; private: `max_orders_per_day`, `wa_template_*`, `pickup_address_text`, with row-level security so anonymous users can read only the public keys).
- SQL functions `set_order_status`, `create_manual_order` and `full_pickup_dates` as described; revoke direct `update` of `orders.status` from the admin role so the function is the only path. `place_order` and the `place-order` edge function also check `ordering_open` and the full-date rule.
- Seed: `ordering_open` true; `wa_template_*` with plain starter wording (marked sample, for example "Hi {name}, your order {order_number} is confirmed for {pickup}.") and an empty `pickup_address_text`.
- Frontend (runtime, anon key): the cart reads `ordering_open` and its message (disable "Place order" and show the message when closed) and `full_pickup_dates` (hide full dates in the date list). The build fills ingredients, allergens and the note into the product window and JSON-LD; with no data it keeps the `TODO:` marker.
- Tests: two simultaneous orders respect `max_orders_per_day`; a full date and a paused shop are refused by the function; `set_order_status` returns and re-takes stock exactly once, even if called twice; anonymous users cannot read private settings or call the admin functions.

## Added by D-055 (so Step 4bc needs no rework)

- **Admin login:** Supabase Auth email and password for two admin users; the admin pages require a session; `admin/js/api.js` `supabase` side is the live one, the mock is used only by automated tests. Log out works; sessions refresh.
- **RLS and functions for everything the admin will edit:** admins can read and write `products`, option groups and options, `stock`, `settings`, pickup rules and exceptions, `orders` and order items (through the SQL functions for status changes and manual orders). Anonymous users still cannot. Write one policy test per table.
- **Product photos:** a Supabase Storage bucket `product-images` (public read, admin write only, file size and type limits as constants). The build script downloads current photos, makes the sized WebP set with `sharp` and requires alt text per product.
- **Publish pipeline:** `trigger-rebuild` edge function is callable only by an admin session; product and option edits mark "unpublished changes"; a Publish action runs the build; the admin can read the last build state (Publishing, Live, Failed) from a small `site_status` row that the workflow updates. Stock and settings changes never rebuild.
- **Seed the real data:** the migration seeds the two real products (frozen chicken momo and frozen veg momo, 40 pieces, 1000 pence) and the two sauce pots with prices unset and hidden until she sets them. No test orders in the live database. Mark unconfirmed values `data-pending` (D-052).
- **Admin screens already built (orders, prep list, pickup, settings):** switch them to the live backend and delete nothing they need; run the live flow end to end: place an order on the public site, see it in the admin within a minute, confirm it, cancel it (stock returns once), pause ordering, hit the daily limit.
- Migrations are versioned files in `backend/supabase/migrations/` that can be re-run on a new project; document how in `backend/README.md`.

## Do not

Put the service-role key, GitHub token, email key or owner email in the repo, the browser, or workflow variables. Build the admin panel (Step 4). Add payments or customer accounts.

## Verify (live run)

- Place a real order from the deployed site with every field empty, then with every field filled. Confirm: the row in the database, the correct number format (`SS-DDMM-NN`, D-032), the WhatsApp message opening with the real number.
- Edit a product price directly in the database; the webhook starts a rebuild; the live shop shows the new price within a couple of minutes.
- Turn the function off and confirm the failure path from Step 2 still works.
- All backend tests pass. Report any policy you could not test.

## Report

Use the report format in `CLAUDE.md`, plus the list of owner actions completed and anything still pending.
