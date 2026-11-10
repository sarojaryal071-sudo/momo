# Step 2 — Cart and order flow (mock backend)

Prerequisite: Step 1 done. Read `CLAUDE.md` and the technical rulebook sections 2, 3, 4 and 7 first. Do only this step.

## Goal

A complete shopping flow: add to cart, review, optional details, confirm, WhatsApp message, confirmation page. It runs against a **mock gateway** so the real backend (Step 3) can be swapped in without changing the pages.

## Do

1. **`frontend/js/site-config.js`**: `backend: 'mock'`, `whatsappNumber` (digits only, `447413069241`, marked `TODO: confirm with owner`), `currency`, and empty `supabaseUrl` and `supabaseAnonKey` (public values only).
2. **`cart.js`**: cart in `localStorage` as slug and quantity only, wrapped in try/catch. Functions: add, setQty, remove, clear, count, and `formatPrice(pence)`. Quantity 1 to 10. Update the header count on every page.
3. **Shop page**: make the add-to-cart controls work (quantity control, add button, small confirmation text that is announced to screen readers). Unavailable or unpriced items cannot be added.
4. **`cart.html`**: loads `data/products.json` (the build writes it; extend `build.mjs` to write it from the seed with `--seed`). Lists items, quantity controls, line prices, total. Items missing from the data show as unavailable and are dropped at confirm. Empty-cart state with a link to the shop.
5. **Order form** under the cart: name, phone (with the visible hint "Add your phone number so we can arrange pickup"), pickup date, pickup time, notes. **All optional.** Add a hidden honeypot field. Show "Pickup only. Pay cash on pickup." next to the button.
6. **`pickup.js`**: reads `data/pickup.seed.json` (weekly rules and exceptions, same shape as the future database tables) and returns available dates and times, honouring a lead time and a maximum days ahead from the same file. Seed with Saturday and Sunday 10:00 to 18:00, one-hour slots, marked `TODO: confirm with owner`. Pickup date is a select list of valid dates, then times for that date.
7. **`order-gateway.js`**: `submitOrder(order)` returns `{ orderNumber, totalPence, emailed }`. Implement the `mock` version (returns `SS-TEST-01`, `emailed: false`, short artificial delay) and leave a clearly separated `supabase` stub for Step 3. An 8-second timeout applies to any gateway.
8. **`whatsapp.js`**: builds the message exactly as the technical rulebook section 4 describes, builds the `wa.me` link, includes the phone conversion helper for later admin use.
9. **Confirm handler**: disable the button, call the gateway, on success build the WhatsApp link, clear the cart, go to `done.html?o=<orderNumber>`. On failure follow the failure rules in section 3 of the technical rulebook (no number, plain message, WhatsApp message still available, cart kept).
10. **`done.html`**: shows the order number and summary (kept in `sessionStorage` for this page only), a large "Open WhatsApp" button, and the line "Tap send in WhatsApp to confirm. Pickup only, pay cash on pickup." Try one automatic open on load; the button is the fallback. Both `cart.html` and `done.html` carry `noindex`.
11. **Tests**: `node --test` for cart totals, `formatPrice`, pickup date and time generation, WhatsApp message and link, and UK phone conversion.

## Do not

Call Supabase, store orders anywhere, send email, claim WhatsApp "sent", use `innerHTML` for customer text, or add accounts or payment.

## Verify (live run)

- On the deployed site at phone width: add both packs, change quantities, remove one, reload (cart persists), confirm with every field empty, then with every field filled.
- The WhatsApp link opens with the correct pre-filled text on a phone or in WhatsApp Web. Check the text carefully, including £ and line breaks.
- Break the gateway (force a failure) and check the failure path, the kept cart, and the number-less message.
- Keyboard-only run through the whole flow. Screen-reader labels on quantity controls.
- `node --test` passes.

## Report

Use the report format in `CLAUDE.md`, with screenshots or descriptions of each screen and the exact WhatsApp text produced.
