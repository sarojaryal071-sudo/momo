# Step 4m — Order "More" menu and the Active toggle (two bugs seen on the live admin)

Prerequisite: current `main`. Merge `origin/main` first. Read `CLAUDE.md`, D-045, D-062, D-065 (only for what is already built) and `admin/js/orders.js`, the product list and `set_order_status`. Owner rules for the session: write the code, run the build once and only the tests for files you changed (and the database tests only if you change SQL); own 390 px screenshots of both fixes; no demo wording. Do not wait for Steps 4k or 4l; these fixes are independent and small.

## Bug 1: the order card "More" menu offers irrelevant actions

On a **Cancelled** order the menu lists Message customer, Set to New, Set to Confirmed, Set to Ready and Set to Collected. It should only offer what makes sense next. Rules (current status -> offered actions; the current status is never offered):

- **New:** Confirm (primary button, already), Cancel order; More: Message customer, Cancel order.
- **Confirmed:** Mark ready (primary), More: Message customer, Back to New, Cancel order.
- **Ready:** Mark collected (primary), More: Message customer, Back to Confirmed, Cancel order.
- **Collected:** no primary button; More: Message customer, Undo collected (back to Ready).
- **Cancelled:** no primary button; More: Message customer, **Reopen order** (back to New). Reopening must take the stock again exactly once, like a new order, and must refuse with a clear message ("Not enough stock to reopen") when stock is short or the daily limit or the date is full. If `set_order_status` does not already do this, fix it in a new forward-only migration and cover it with a database test; do not edit older migrations.
- Cancelling a Collected order is not offered. Cancel always asks a short confirm in a glass dialog and says that stock will be returned. The "Message customer" template matches the status (Cancelled uses the cancellation template).
- Menu items use the 4f look, the menu is anchored to the More button and never covers the order's own text (it currently overlaps the card; keep it inside the card or open it as a glass sheet at the bottom on phones).

## Bug 2: a product's Active toggle can be turned off but not back on

Cause (seen in the toast on the live site): the D-062 safeguard blocks Active until the product's "I have checked the allergen and ingredient information" box is ticked (and an unpriced product cannot be Active). The toggle just snaps back and a toast at the top says why, so it looks broken. Fix the experience:

- If a product cannot be Active yet, show a clear **status line on the card** instead of a silent toggle: "Needs allergen check" or "Set a price first" as a button-like chip that opens the product on the right tab/section (Allergens or Price) with the field focused. Keep the toggle visible but visibly disabled with a text reason beside it (never colour alone).
- If she taps the disabled toggle, open that same place directly (no hidden toast). Any toast stays but must not cover the page header and must stay long enough to read.
- In the product editor, the Active control shows the same reason next to it and a **"Confirm and show"** shortcut when only the allergen check is missing (it ticks the check and saves Active together after she has seen the allergen and ingredient fields; she must still be looking at that section, never a blind one-tap).
- Verify that ticking the check and saving then allows Active, and that Frozen veg momo (currently Off) can be turned on this way. Check that nothing else (a failed request, row-level security, a stale value) is also blocking the toggle: say what you verified.

## Do not

Change order statuses or the database beyond what Bug 1's Reopen needs, remove the allergen safeguard, or touch the public site.

## Report

Under 15 lines: what changed, what you checked and did not (Supabase is unreachable from your sandbox), and what the owner should test (a Cancelled order's More menu shows only Message customer and Reopen; reopen an order; the veg momo card says Needs allergen check, tapping it opens the right place, tick the check, save, turn it Active).
