# Step 4c — Admin: pickup, settings, notice, export, manual orders, home screen (D-034, D-038, D-045, D-047)

Prerequisite: Step 3 done and verified (database, functions and the owner's two admin logins exist). Read `CLAUDE.md`, `docs/architecture-rulebook.md` sections 4 to 6, 11 and 12, `docs/technical-rulebook.md` sections 4, 5 and 7, and `docs/ui-rulebook.md` sections 2b and 5. Do only this sub-step. Add its checklist to `docs/progress-tracker.md` first.

## Goal

The rest of what she controls, and the last convenience features. After this step the admin is complete.

## Shared rules for every admin page (D-021 style, D-047)

- Plain HTML, CSS and JavaScript; reuse `theme.css` and `base.css` (Instrument Serif for the few large headings, Hanken Grotesk everywhere else, D-043). The admin is plain, clear and **phone first**: big touch targets, one-handed use, no decoration, no glass or ambient effects.
- Auth with the vendored, version-pinned `supabase-js` in `admin/js/vendor/`. Every admin page checks the session and that the user is in `admins` (`is_admin()`), otherwise redirects to `login.html`. The database enforces the same; the page check is only for friendliness.
- `noindex` meta and a restrictive Content-Security-Policy on every admin page. No links to `/admin/` from public pages. No analytics.
- Money in integer pence; show as £10 or £10.50. UK English. Limits, intervals and names are named constants in one admin config file.
- Never hard-delete orders. Customer text is always inserted as text, never as HTML.

## Do

1. **Pickup** (`admin/pickup.html`): the weekly pattern (weekday, start, end, active), the **time step** in minutes (default 1, D-038), and exceptions (closed date, extra date and hours, note). A **preview** shows the dates and times customers will see for the next two weeks, including closed and **full** days.
2. **Settings** (extend `admin/settings.html`): the notice banner (on or off, message; live on the public site with no rebuild); `min_lead_hours`, `custom_min_lead_hours` (hours, with a hint such as "48 = 2 days"), `max_days_ahead`, `max_qty_per_item`, `low_stock_threshold`, the order prefix, and the **daily order limit** (`max_orders_per_day`, empty means no limit; counts non-cancelled orders per pickup day, D-047). Validate numbers and show "Saved".
3. **Export**: a button on the orders page that downloads orders for a chosen date range as CSV, including options, customised flag, source and status.
4. **Manual orders** (`admin/new-order.html`, linked from the orders page): name (required), phone, pickup date and time, notes, products with quantities and options; calls `create_manual_order`; the order appears in the list marked `manual` and takes stock like any order. Explain: "Use this for orders that came by phone or Instagram."
5. **Home screen**: a web app manifest and icons for `/admin/` so she can add it to her phone's home screen (name "Steam & Spice Admin"); a small "Add to home screen" help section with plain steps for iPhone and Android. No service worker, no push notifications in this step.
6. **Data care**: a short "Backup and privacy" help section: export a CSV every week (the free plan has no automatic backups), and note that old customer details should be removed after the retention period once she and the council decide it; a tool to remove customer details from old orders is a later step (record it in the decisions log open items).

## Do not

Add roles beyond the two-admin allowlist, hard-delete orders, add push notifications, a service worker, analytics, or customer accounts.

## Verify (live run)

- Edit pickup rules and add a closed date and an extra day; confirm the cart's date and time choices change and the admin preview matches.
- Set the daily limit to 1, place an order for a date, and confirm that date disappears from the cart list and the function refuses a direct attempt. Clear the limit.
- Switch the notice on; see it on the public site without a rebuild; switch it off. Change a lead time and see the earliest date move.
- Export a CSV and open it in a spreadsheet; the options and flags are readable.
- Add a manual order; it shows in the orders list as `manual`, in the prep list, and takes stock.
- Add the admin to a phone's home screen and open it as an app; login still works.

## Report

Use the report format in `CLAUDE.md`, plus what you could not test and anything the owner must do.
