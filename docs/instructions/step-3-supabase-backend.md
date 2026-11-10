# Step 3 — Supabase backend and real orders

Prerequisite: Step 2 done. Read `CLAUDE.md`, `docs/architecture-rulebook.md` sections 4 to 7 and the technical rulebook sections 2, 3 and 5 first. Do only this step.

## Goal

Real orders: the site saves each order in a database, and assigns the order number (`SS-DDMM-NN`, D-032). No email is sent (D-033): she sees orders in the admin panel and in the WhatsApp message the customer sends. The shop reads real products at build time and real pickup rules at runtime.

## Owner actions first (list them clearly in your first message to the owner, then wait)

1. Create a Supabase project (free tier) and note the project URL and anon key.
2. In Authentication settings, **disable public sign-ups**. Create one admin user (the owner's email and a strong password).
3. Create a fine-grained GitHub token limited to this repository with permission to run workflows. It goes only into a Supabase function secret.
4. Add repository variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` (public values) in GitHub.

Write `backend/README.md` as a step-by-step guide for these actions in plain language, with where each value goes.

## Do

1. **Migrations** in `backend/supabase/migrations/`, numbered and forward-only: all tables and indexes from section 4 of the architecture rulebook (including the nullable `products.category` column, D-028; the shop's filter chips use `category` when present, otherwise `kind`), the `is_admin()` function, row-level security policies from section 5, the `product-photos` storage bucket and its policies, and a `place_order` SQL function that does the counter and insert in one transaction with row locking.
2. **`seed.sql`**: the two momo packs (prices from decision D-002), the two sauce pots (inactive or unavailable, no price), default settings (`order_prefix` `SS`, `min_lead_hours` 24, `max_days_ahead` 14, `max_qty_per_item` 10), default pickup rules (Saturday and Sunday 10:00 to 18:00, time step 15 minutes, D-034), an empty notice row. Keep it free of any personal data.
3. **`place-order` function** exactly as architecture section 6: validation, server-side price recalculation, pickup checks, honeypot, IP rate limit, number assignment, insert, return `{ orderNumber, totalPence }`. No email (D-033). CORS limited to the site's origins (from a secret).
4. **`trigger-rebuild` function** and a database webhook on `products` insert, update and delete, starting the deploy workflow through the GitHub API. Add `workflow_dispatch` handling to the workflow if missing.
5. **Frontend wiring**: implement the `supabase` gateway in `order-gateway.js` (plain `fetch` to the function), read pickup rules and exceptions and public settings in `pickup.js` over REST with the anon key, switch `site-config.js` to `backend: 'supabase'` with the public URL and anon key (these may be in the repo). Keep `mock` selectable for local development.
6. **Build**: extend `build.mjs` per architecture section 7 steps 2 to 6: fetch active products, merge with `frontend/content/products/<slug>.json`, fill the marked regions, write `dist/data/products.json`, download and convert photos to WebP. Failed or empty fetch fails the build in CI. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the workflow environment.
7. **Notice banner**: `notice.js` fetches `site_notice` and shows the strip on every public page when active; silent on failure; reserve space so the layout does not jump.
8. **Tests**: a script (documented in `backend/README.md`) that proves: anonymous users cannot read or write `orders`, cannot read inactive products or non-public settings; a tampered price is ignored; two simultaneous orders get different numbers; a sold-out product is rejected; an order with every optional field empty succeeds.

## Changes from decisions D-032 to D-035

- Remove the `emailed` field from the gateway result, the mock gateway, the done page logic and the tests (no email, D-033). No email provider, key or owner email exists anywhere in this project.
- `pickup.js` and the order checks use the time step from each rule's `slot_minutes` (15) so the customer can pick times like 09:15 inside her windows (D-034); a time outside every window, off the step, or earlier than the lead time is rejected by the function.
- The Step 1f time picker is wired to real rules here; keep `mock` selectable.

## Added by decision D-031 (options, stock, custom lead time)

Read `docs/architecture-rulebook.md` section 11 first. In addition to the list above:
- Migrations for `product_option_groups`, `product_options`, `product_stock`, the new `settings` keys (`custom_min_lead_hours` 48, `low_stock_threshold` 5) and their row-level security. The database webhook that triggers a rebuild covers `products`, `product_option_groups` and `product_options` only, **not** `product_stock`.
- `place_order` (SQL function) and the `place-order` edge function: accept option ids per line, recompute every price with the option price changes, derive the `customised` flag, apply `custom_min_lead_hours` to the pickup check when any line is customised, check and lower stock for standard lines in the same locked transaction, and store the options and flag in the order snapshot. Reject an option from another product, an inactive option, two options in one `single` group and a quantity above the stock.
- Seed: the sauces and momo get a few sample option groups only if the owner has listed them; otherwise seed none. Stock seeded with a sample quantity marked as sample.
- Frontend: replace the mock option, stock and lead-time sources from Step 1f with the real ones (runtime `fetch` with the anon key; keep the mock selectable).
- Tests: a tampered option price is ignored; an option from another product is rejected; two simultaneous orders for the last item let only one succeed and the stock never goes below 0; a customised order inside the custom notice period is rejected and a standard order is not; a customised order does not lower stock.

## Do not

Put the service-role key, GitHub token in the repo, the browser, or workflow variables. Build the admin panel (Step 4). Add payments or customer accounts.

## Verify (live run)

- Place a real order from the deployed site with every field empty, then with every field filled. Confirm: the row in the database, the correct number format (`SS-DDMM-NN`, D-032), the WhatsApp message opening with the real number.
- Edit a product price directly in the database; the webhook starts a rebuild; the live shop shows the new price within a couple of minutes.
- Turn the function off and confirm the failure path from Step 2 still works.
- All backend tests pass. Report any policy you could not test.

## Report

Use the report format in `CLAUDE.md`, plus the list of owner actions completed and anything still pending.
