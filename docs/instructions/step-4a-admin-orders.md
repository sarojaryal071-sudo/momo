# Step 4a — Admin: login, orders, prep list, messages, pause ordering (D-036, D-037, D-045)

Prerequisite: Step 3 done and verified (database, functions and the owner's two admin logins exist). Read `CLAUDE.md`, `docs/architecture-rulebook.md` sections 4 to 6, 11 and 12, `docs/technical-rulebook.md` sections 4, 5 and 7, and `docs/ui-rulebook.md` sections 2b and 5. Do only this sub-step. Add its checklist to `docs/progress-tracker.md` first.

## Goal

She can log in on her phone, see every order by pickup date, process it, message the customer on WhatsApp, see what to prepare, and pause ordering.

## Shared rules for every admin page (D-021 style, D-047)

- Plain HTML, CSS and JavaScript; reuse `theme.css` and `base.css` (Instrument Serif for the few large headings, Hanken Grotesk everywhere else, D-043). The admin is plain, clear and **phone first**: big touch targets, one-handed use, no decoration, no glass or ambient effects.
- Auth with the vendored, version-pinned `supabase-js` in `admin/js/vendor/`. Every admin page checks the session and that the user is in `admins` (`is_admin()`), otherwise redirects to `login.html`. The database enforces the same; the page check is only for friendliness.
- `noindex` meta and a restrictive Content-Security-Policy on every admin page. No links to `/admin/` from public pages. No analytics.
- Money in integer pence; show as £10 or £10.50. UK English. Limits, intervals and names are named constants in one admin config file.
- Never hard-delete orders. Customer text is always inserted as text, never as HTML.

## Do

1. **Login** (`admin/login.html`): email and password, no sign-up, no page that reveals whether an email exists, log out button. Optional two-step login (Supabase TOTP) can be switched on from a small "Security" section; document how in `backend/README.md`; do not force it.
2. **Orders** (`admin/index.html`, the home of the admin): orders grouped by pickup date, with a clear group for "No pickup date". Default view: today and upcoming. Each order shows number, pickup date and time, name, phone (tap to call), lines with their options and a **Customised** label, notes, total, status and a "manual" label when `source = manual`. Filters: date range and status.
3. **Never miss a new order**: a big count of orders with status `new` at the top, new rows highlighted until opened, the browser tab title "(N) Orders" while any are new, automatic refresh every `ORDERS_REFRESH_SECONDS` (named constant, 60). No sound, no live subscription (D-045g).
4. **Status buttons**: new, confirmed, ready, collected, cancelled. **Always through `set_order_status`** (the database function that moves stock back or out exactly once); show a clear message if re-opening a cancelled order fails for lack of stock. A confirmation prompt (an in-page one, not a browser dialog) before cancelling.
5. **Message customer** (one button per order): opens `wa.me` to the customer's number (use the phone conversion helper from `whatsapp.js`) with the template for the order's status (`wa_template_confirmed`, `wa_template_ready`, `wa_template_cancelled` from the private settings), filling `{name}`, `{order_number}`, `{pickup}`, `{items}` and `{address}` (from `pickup_address_text`; if empty, show a clear warning "Add your pickup address in Settings" before opening). She can edit the text in a small box before opening WhatsApp. If the phone is invalid, disable the button and say why. State clearly: "You tap send in WhatsApp."
6. **Prep list** (`admin/prep.html`, linked from the orders page): pick a pickup date (default tomorrow; a range option); show totals per product and per option, for example "Frozen chicken momo x6, Frozen veg momo x4, Customised x2: No onion x1, Hot x2", and the list of customised lines with order number and name. Cancelled orders excluded. A print stylesheet makes it one clean page.
7. **Pause ordering and templates** (a first small `admin/settings.html`; 4c adds the rest): the **Pause ordering** switch with a message field (`ordering_open`, `ordering_closed_message`), the three WhatsApp templates with a list of the placeholders, and the **pickup address text** (private). Each saves with a visible "Saved" confirmation. Say on the page that the pause is live at once and that the public cart shows the message.

## Do not

Add roles beyond the two-admin allowlist, hard-delete orders, change a status with a direct table update, show customer data on any public page, or build products, pickup rules or the notice banner (4b and 4c).

## Verify (live run)

- Log in on a phone-sized screen with each of the two admin accounts; log out; direct URLs redirect to login when logged out; anonymous and non-admin users are refused by the database.
- Place a real test order on the public site; it appears under the right pickup date with options and the Customised label; the count and tab title update within a minute.
- Change the status through every state; cancel a standard order and see its stock return (check the stock number in the database); re-open it and see it taken again; try re-opening when stock is short.
- Tap Message customer for each status and read the WhatsApp text; try with the address empty and with an invalid phone.
- Prep list for the test date shows correct totals and prints on one page.
- Pause ordering: the public cart shows the message and cannot place an order; a direct call to the function is refused. Switch it back.

## Report

Use the report format in `CLAUDE.md`, plus what you could not test and anything the owner must do.
