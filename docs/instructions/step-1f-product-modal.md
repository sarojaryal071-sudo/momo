# Step 1f — Product details window, options, stock and custom lead time (decision D-031)

Prerequisite: Step 1e is merged. Merge `origin/main` first. Read `CLAUDE.md`, `docs/decisions-log.md` D-031, `docs/architecture-rulebook.md` section 11, `docs/technical-rulebook.md` sections 1 to 3 and `docs/ui-rulebook.md` sections 2b and 5. Do only this step; do not start Step 3. Add the checklist at the bottom to `docs/progress-tracker.md` first.

## Goal

Replace the big quantity block on every product card with a small, clear flow, and let customers choose options such as "No onion" and a spice level. Everything is front end only, driven by seed data (the same shapes Step 3 will fill from the database), so Step 3 only swaps the data source.

## 1. Cards

- Each card (home and shop): image, name, size, price, and **one small "Add" button**. No big stepper, no wide "Add to cart" button, no quantity input on the card.
- Tapping the card (image, name or an explicit "Details" link) opens the details window. The card remains a normal static HTML element; the opening is progressive enhancement. Without JavaScript the card still shows name, size and price.
- After a plain item is added (no required choices), "Add" becomes a compact `- 1 +` stepper in the same spot; at 0 it returns to "Add". Keep the "Added" announcement for screen readers and the sticky checkout bar from Step 1e.
- A product that has options, or whose stock is 0, behaves differently: with options the "Add" button opens the details window first (the customer must see the choices); with stock 0 the card shows "Sold out" and no button.
- Keep every class, `data-*` and ID that the cart scripts and tests use, or update the tests in the same commit and say so.

## 2. Details window (modal)

Use the native `<dialog>` element opened with `showModal()`. Its content lives in the page HTML (one dialog per product or one shared dialog filled from the card's own data attributes and hidden content) so the text exists in the source.

Contents, in this order:
1. Close button (visible, 44 px at least), product photo (larger), name, size, price.
2. **Ingredients and allergens**: a section with `<p data-todo>TODO: ingredients and allergen information from the owner</p>` until she provides them. Never invent.
3. **Options**: one block per option group from data. `single` groups are radio buttons with the default pre-selected; `multiple` groups are checkboxes ("Leave out: No onion, No coriander"). Each option shows its price change when not zero ("+ £0.50"). Labels are real labels, large tap targets.
4. A short note that appears only when a non-default option is chosen: "Customised: needs X notice. Earliest pickup: <date>." (X from the lead-time constant, shown in days when a multiple of 24 hours.)
5. Stock line: "Only N left" at or below `LOW_STOCK_THRESHOLD`; the quantity cannot go above the stock.
6. Quantity (compact `- 1 +`) and the primary button "Add to cart · £total" with the total live-updating with options and quantity.
7. A plain line: "Options are preferences, not an allergy guarantee. Tell us about any allergy before you order." This sentence is `data-todo` until the owner and council approve the wording; show the text in the meantime so the page is honest.

Accessibility: focus moves into the dialog and returns to the opener on close; Escape and a backdrop click close it; the page behind does not scroll; focus ring visible on every control; reduced motion honoured; 360 px layout is a full-height sheet from the bottom or a full-screen panel, wide screens a centred panel with a maximum width token. No gradients, no emoji, tokens only (D-022).

## 3. Data (seed first, database later)

Extend `frontend/data/products.seed.json` (and the cart's product lookup) with, per product:
- `stock_quantity` (integer or `null` meaning not tracked). Sample values marked `"placeholder": true` (for example chicken and veg 24, sauces 12).
- `option_groups`: array of `{ id, label, kind: "single" | "multiple", options: [ { id, label, price_delta_pence, is_default } ] }`. Sample groups, marked `"placeholder": true`: for each momo, "Leave out" (multiple: No onion, No coriander) and "Spice level" (single: Mild, Medium default, Hot); for each sauce, "Spice level" only. Price changes sample 0. These are the owner's examples, not final lists; the admin panel will own them later.

Named constants in `frontend/js/site-config.js` (D-022): `LOW_STOCK_THRESHOLD` (5), `CUSTOM_MIN_LEAD_HOURS` (48, mock value; Step 3 reads it from settings), alongside the existing `min_lead_hours` mock. Show the sample status honestly (a visible "sample" label where values are sample).

## 4. Cart, pickup and order message

- The cart stores slug, quantity and the chosen option ids per line (still no prices in storage). The same product with different options is a different line. Unit price = base price + sum of option price changes, computed from the data file.
- Cart lines show the options as small text under the name ("No onion, Hot") and a "Customised" label; the quantity stepper in the cart is compact too.
- `pickup.js`: when any line is customised, the earliest allowed date and time use `CUSTOM_MIN_LEAD_HOURS`; otherwise `min_lead_hours`. The date picker only offers valid slots, and the cart shows one plain sentence when the notice is longer ("Customised items need 2 days' notice. Earliest pickup: Thursday 12 November.").
- The order sent to the gateway and the WhatsApp message list each line with its options and mark customised lines. The mock gateway and its tests are updated accordingly. Keep order total logic in integer pence.
- A line whose quantity would exceed the stock is capped with a clear message; a sold-out item cannot be added.

## Do not

Add a free-text allergy box (waiting for the owner and the council), prices or promises about allergens, a database, or the admin panel. Hard-code option names, prices or lead times in the page or script code: only data and named constants. Start Step 3.

## Verify (once each)

- Shop and home at 360 px: cards are small, one phone screen shows four or more; "Add" works; the stepper appears after adding; a card with options opens the window first.
- Dialog: opens from the card, traps and returns focus, Escape and backdrop close it, options change the total live, the customised note and earliest-pickup date appear when a non-default option is chosen, stock limit and "Only N left" work, sold-out card has no button.
- Cart: lines with options are separate lines, "Customised" label, date picker respects the longer notice only when needed, the WhatsApp text lists options.
- Works with JavaScript off for what is static (card text and price, links); keyboard-only run through add, options, checkout.
- `npm test` and `npm run build` pass (update tests that depend on the old card markup, and say so). No horizontal overflow at 360 px. Merge to `main`, push, confirm the deploy ran.

## Tracker checklist to add

- [ ] Small cards with Add and compact stepper
- [ ] Details dialog (info, options, stock line, live total, allergy line)
- [ ] Seed data for options and stock; constants `LOW_STOCK_THRESHOLD` and `CUSTOM_MIN_LEAD_HOURS`
- [ ] Cart lines with options, customised lead time in the pickup picker, WhatsApp message with options
- [ ] Verified, merged to `main`, deploy confirmed

## Report

Use the report format in `CLAUDE.md`. List every sample value and every `TODO:` added, and every test you changed because the markup changed.
