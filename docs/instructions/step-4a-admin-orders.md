# Step 4a — Admin: login, orders, prep list, messages, pause ordering (D-036, D-037, D-045)

Prerequisite: Step 1k is merged (it is) and, for 4b and 4c, the earlier admin sub-step is merged. **Step 3 is not required** (D-048). Read `CLAUDE.md`, `docs/architecture-rulebook.md` sections 4 to 6, 11 and 12, `docs/technical-rulebook.md` sections 4, 5 and 7, and `docs/ui-rulebook.md` sections 2b and 5. Do only this sub-step. Add its checklist to `docs/progress-tracker.md` first.

## Goal

She can log in on her phone, see every order by pickup date, process it, message the customer on WhatsApp, see what to prepare, and pause ordering.

## Demo backend (D-048): read this first

- Every admin screen talks only to `admin/js/api.js`. It exposes the operations the screens need (`login`, `logout`, `listOrders`, `setOrderStatus`, `listProducts`, `saveProduct`, `getSettings`, `saveSettings`, and so on) and has two implementations picked by `siteConfig.backend`: **`mock`** (build it now) and **`supabase`** (left as a clearly marked stub that throws "not connected yet"; Step 3 fills it).
- **`mock` keeps its data in `localStorage`** under one namespaced key, seeded from `frontend/data/*.seed.json` plus a small set of **sample orders** (marked sample) so every screen has something to show. A `Reset demo data` button restores the seed. **Orders placed on the public site in mock mode are saved into the same store** (update the mock order gateway so `submitOrder()` writes the order and returns its `SS-DDMM-NN` number), so the whole flow can be tried in one browser: place an order, then see it in the admin.
- **Login in mock mode:** a fixed demo email and password defined as named constants and shown on the login page ("Demo mode: any data stays in this browser"); two demo accounts. A visible **Demo mode** banner is on every admin page while `mock` is active. The mock login is never a security control; Step 3 replaces it with real Supabase Auth.
- **The mock must enforce the same rules the database will** (they are listed in `docs/architecture-rulebook.md` sections 11 and 12): `set_order_status` moves stock back and out exactly once; the earliest pickup uses `custom_min_lead_hours` for customised lines; `max_orders_per_day`; `ordering_open`; stock never below 0; option and price recomputation. Put these rules in one `admin/js/rules.js` (or the shared mock module) so Step 3 can compare behaviour and tests carry over.
- Tests: add tests for the mock rules (stock return on cancel, no double return, daily limit, pause, lead time), run with the existing test runner.

## Shared rules for every admin page (D-021 style, D-047)

- Plain HTML, CSS and JavaScript; reuse `theme.css` and `base.css` (Instrument Serif for the few large headings, Hanken Grotesk everywhere else, D-043). The admin is plain, clear and **phone first**: big touch targets, one-handed use, no decoration, no glass or ambient effects.
- Auth goes through `admin/js/api.js` (demo login now; Step 3 swaps in Supabase Auth with the vendored, version-pinned `supabase-js` in `admin/js/vendor/`). Every admin page checks the session, otherwise redirects to `login.html`. With the real backend the database enforces the same (`is_admin()`); the page check is only for friendliness.
- `noindex` meta and a restrictive Content-Security-Policy on every admin page. No links to `/admin/` from public pages. No analytics.
- Money in integer pence; show as £10 or £10.50. UK English. Limits, intervals and names are named constants in one admin config file.
- Never hard-delete orders. Customer text is always inserted as text, never as HTML.

## Do

0. **Admin shell** shared by every admin page: a slim top bar (title, demo banner, log out) and, on phones, a **fixed bottom tab bar** with Orders, Prep, Products, Pickup and Settings (large icons drawn as single-stroke SVG, labels in Hanken Grotesk, current tab marked; pages not built yet in this sub-step show a calm "Coming in the next step" page); on wide screens a left sidebar with the same items. Solid surfaces, hairline borders, the site's tokens and fonts; no glass, no gradients.
1. **Login** (`admin/login.html`): email and password, no sign-up, no page that reveals whether an email exists, log out button. Two-step login arrives with the real backend in Step 3; leave a placeholder "Security" section that says so.
2. **Orders** (`admin/index.html`, the home of the admin): orders grouped by pickup date, with a clear group for "No pickup date". Default view: today and upcoming. Each order shows number, pickup date and time, name, phone (tap to call), lines with their options and a **Customised** label, notes, total, status and a "manual" label when `source = manual`. Filters: date range and status.
3. **Never miss a new order**: a big count of orders with status `new` at the top, new rows highlighted until opened, the browser tab title "(N) Orders" while any are new, automatic refresh every `ORDERS_REFRESH_SECONDS` (named constant, 60). No sound, no live subscription (D-045g).
4. **Status buttons**: new, confirmed, ready, collected, cancelled. **Always through `set_order_status`** (the database function that moves stock back or out exactly once); show a clear message if re-opening a cancelled order fails for lack of stock. A confirmation prompt (an in-page one, not a browser dialog) before cancelling.
5. **Message customer** (one button per order): opens `wa.me` to the customer's number (use the phone conversion helper from `whatsapp.js`) with the template for the order's status (`wa_template_confirmed`, `wa_template_ready`, `wa_template_cancelled` from the private settings), filling `{name}`, `{order_number}`, `{pickup}`, `{items}` and `{address}` (from `pickup_address_text`; if empty, show a clear warning "Add your pickup address in Settings" before opening). She can edit the text in a small box before opening WhatsApp. If the phone is invalid, disable the button and say why. State clearly: "You tap send in WhatsApp."
6. **Prep list** (`admin/prep.html`, linked from the orders page): pick a pickup date (default tomorrow; a range option); show totals per product and per option, for example "Frozen chicken momo x6, Frozen veg momo x4, Customised x2: No onion x1, Hot x2", and the list of customised lines with order number and name. Cancelled orders excluded. A print stylesheet makes it one clean page.
7. **Pause ordering and templates** (a first small `admin/settings.html`; 4c adds the rest): the **Pause ordering** switch with a message field (`ordering_open`, `ordering_closed_message`), the three WhatsApp templates with a list of the placeholders, and the **pickup address text** (private). Each saves with a visible "Saved" confirmation. Say on the page that the pause is live at once and that the public cart shows the message.

## Do not

Add roles beyond the two-admin allowlist, hard-delete orders, change a status with a direct table update, show customer data on any public page, or build products, pickup rules or the notice banner (4b and 4c).

## Verify (live run in demo mode)

- Log in on a phone-sized screen with each demo account; log out; direct URLs redirect to login when logged out.
- Place a test order on the public site (mock mode); it appears under the right pickup date with options and the Customised label; the count and tab title update within a minute.
- Change the status through every state; cancel a standard order and see its stock return (check the stock number in the products view or the mock store); re-open it and see it taken again; try re-opening when stock is short.
- Tap Message customer for each status and read the WhatsApp text; try with the address empty and with an invalid phone.
- Prep list for the test date shows correct totals and prints on one page.
- Pause ordering: the public cart shows the message and cannot place an order; the mock gateway refuses an order while paused. Switch it back.

## Report

Use the report format in `CLAUDE.md`, plus what you could not test and anything the owner must do.
