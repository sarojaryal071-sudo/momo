# Step 4 — Admin panel

Prerequisite: Step 3 done and verified. Read `CLAUDE.md`, the architecture rulebook, and the technical rulebook sections 4, 5 and 7 first. Do only this step.

## Goal

A mobile-friendly admin panel at `/admin/` where the owner sees orders by pickup date, messages customers on WhatsApp with one tap, and controls products, pickup times and the notice banner without a developer.

## Do

1. **Auth**: `admin/login.html` with email and password using the vendored, version-pinned `supabase-js` in `admin/js/vendor/`. Every admin page checks the session and that the user is in `admins`; otherwise it redirects to login. Log out button. No sign-up, no password reset page that reveals whether an email exists.
2. **Orders (`admin/index.html`)**: orders grouped by pickup date, with a clear group for "No pickup date". Default view is today and upcoming. Each order shows number, time, items, total, name, phone, notes, status. Filters: date range and status. Status buttons: new, confirmed, ready, collected, cancelled (update `orders.status` only; no deletion). Newest orders surface visibly. Customer text is shown with `textContent`.
3. **Message customer**: a button per order that opens `wa.me` to that customer's number with a short template chosen by status (for example "confirmed" and "ready for pickup"). It uses the phone conversion helper from `whatsapp.js`. If the phone is empty or invalid, the button is disabled with the reason shown. State clearly in the UI that she taps send in WhatsApp.
4. **Products (`products.html`)**: list, edit price, toggle availability, reorder, upload or replace a photo (to `product-photos`, size and type limits, resized on the client before upload), add a new item (name, kind, unit label, price, photo). Description fields do not exist (decision D-009). Show "Changes appear on the site in a minute or two" after saving, since saving triggers the rebuild.
5. **Pickup (`pickup.html`)**: edit the weekly pattern (weekday, start, end, slot length, active) and add or remove exceptions (closed date, extra date and hours, note). A preview shows the dates and times customers will see for the next two weeks.
6. **Settings and notice (`settings.html`)**: switch the notice banner on or off and edit its message (live on the public site, no rebuild); edit `min_lead_hours`, `max_days_ahead`, `max_qty_per_item`, and the order prefix.
7. **Export**: a button on the orders page that downloads orders for a chosen date range as CSV (supports later record-keeping and data-retention decisions).
8. **Design**: reuse `theme.css` and `base.css`; the admin is plain and clear, not decorative. Big touch targets, designed for a phone first. `noindex` meta and a restrictive Content-Security-Policy on every admin page. No links to `/admin/` from public pages.

## Do not

Add roles beyond one admin allowlist, hard-delete orders, show customer data on any public page, or add analytics.

## Verify (live run)

- Log in on a phone-sized screen with the real admin account; log out; confirm direct URLs redirect to login when logged out.
- Place a real test order on the public site, find it in the admin under the right pickup date, change its status through every state, tap Message customer and check the WhatsApp text for each template.
- Change a price and availability; confirm the public shop updates after the automatic rebuild. Add a new item with a photo and see it on the shop.
- Edit pickup rules and add a closed date; confirm the cart page's date and time choices change.
- Switch the notice on, check it on the public site without a rebuild, switch it off.
- Log in as no one (anonymous) and as a non-admin Supabase user if possible: both must be refused by the database, not just by the page.

## Report

Use the report format in `CLAUDE.md`.
