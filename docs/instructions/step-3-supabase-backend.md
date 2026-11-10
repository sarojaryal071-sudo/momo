# Step 3 — Supabase backend and real orders

Prerequisite: Step 2 done. Read `CLAUDE.md`, `docs/architecture-rulebook.md` sections 4 to 7 and the technical rulebook sections 2, 3 and 5 first. Do only this step.

## Goal

Real orders: the site saves each order in a database, assigns the order number, and emails the owner. The shop reads real products at build time and real pickup rules at runtime.

## Owner actions first (list them clearly in your first message to the owner, then wait)

1. Create a Supabase project (free tier) and note the project URL and anon key.
2. In Authentication settings, **disable public sign-ups**. Create one admin user (the owner's email and a strong password).
3. Choose the email provider and create an API key (suggestion: Resend free tier). The owner's email address goes only into a Supabase function secret.
4. Create a fine-grained GitHub token limited to this repository with permission to run workflows. It goes only into a Supabase function secret.
5. Add repository variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` (public values) in GitHub.

Write `backend/README.md` as a step-by-step guide for these actions in plain language, with where each value goes.

## Do

1. **Migrations** in `backend/supabase/migrations/`, numbered and forward-only: all tables and indexes from section 4 of the architecture rulebook, the `is_admin()` function, row-level security policies from section 5, the `product-photos` storage bucket and its policies, and a `place_order` SQL function that does the counter and insert in one transaction with row locking.
2. **`seed.sql`**: the two momo packs (prices from decision D-002), the two sauce pots (inactive or unavailable, no price), default settings (`order_prefix` `SS`, `min_lead_hours` 24, `max_days_ahead` 14, `max_qty_per_item` 10), default pickup rules (Saturday and Sunday 10:00 to 18:00, 60 minutes), an empty notice row. Keep it free of any personal data.
3. **`place-order` function** exactly as architecture section 6: validation, server-side price recalculation, pickup checks, honeypot, IP rate limit, number assignment, insert, owner email through the provider, return. Email failure never loses the order. CORS limited to the site's origins (from a secret).
4. **`trigger-rebuild` function** and a database webhook on `products` insert, update and delete, starting the deploy workflow through the GitHub API. Add `workflow_dispatch` handling to the workflow if missing.
5. **Frontend wiring**: implement the `supabase` gateway in `order-gateway.js` (plain `fetch` to the function), read pickup rules and exceptions and public settings in `pickup.js` over REST with the anon key, switch `site-config.js` to `backend: 'supabase'` with the public URL and anon key (these may be in the repo). Keep `mock` selectable for local development.
6. **Build**: extend `build.mjs` per architecture section 7 steps 2 to 6: fetch active products, merge with `frontend/content/products/<slug>.json`, fill the marked regions, write `dist/data/products.json`, download and convert photos to WebP. Failed or empty fetch fails the build in CI. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the workflow environment.
7. **Notice banner**: `notice.js` fetches `site_notice` and shows the strip on every public page when active; silent on failure; reserve space so the layout does not jump.
8. **Tests**: a script (documented in `backend/README.md`) that proves: anonymous users cannot read or write `orders`, cannot read inactive products or non-public settings; a tampered price is ignored; two simultaneous orders get different numbers; a sold-out product is rejected; an order with every optional field empty succeeds.

## Do not

Put the service-role key, GitHub token, email key or owner email in the repo, the browser, or workflow variables. Build the admin panel (Step 4). Add payments or customer accounts.

## Verify (live run)

- Place a real order from the deployed site with every field empty, then with every field filled. Confirm: the row in the database, the correct number format (`SS-MMDD-NN`, check decision D-007 with the owner first), the owner email arriving, the WhatsApp message opening with the real number.
- Edit a product price directly in the database; the webhook starts a rebuild; the live shop shows the new price within a couple of minutes.
- Turn the function off and confirm the failure path from Step 2 still works.
- All backend tests pass. Report any policy you could not test.

## Report

Use the report format in `CLAUDE.md`, plus the list of owner actions completed and anything still pending.
