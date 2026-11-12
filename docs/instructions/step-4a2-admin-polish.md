# Step 4a2 — Admin UI polish (decisions D-049, D-050)

> **Fonts are Bebas Neue and Space Grotesk (D-051), and no placeholder or demo wording is visible (D-052); Step 1l sets both.** **Do Step 1l first** (it sets the new tokens). In this step use the **admin type tokens and spacing in `docs/design/type-and-spacing-spec.md` sections 3 to 5**; where this file mentions a size (for example the page title), the spec wins.

Prerequisite: Step 4a and Step 1l are merged. Merge `origin/main` first. Read `CLAUDE.md`, `docs/decisions-log.md` D-043, D-045, D-048, D-049 and `docs/ui-rulebook.md` sections 2b and 5. Do only this step; do not start 4b, 4c or Step 3. Add the checklist at the bottom to `docs/progress-tracker.md` first. No new features and no changes to rules, data or the demo backend: layout, components and styling only. Same fonts and tokens as the public site (Instrument Serif for page titles only, Hanken Grotesk for everything else); no glass, no gradients, no background spots.

## What the owner saw on a real phone (390 px wide)

1. **Orders page:** the "To" date field runs past the right edge of the screen (horizontal overflow) and sits crooked beside "From". The filters (From, To, Status, Prep list, Show past orders) fill a whole screen before the first order appears.
2. **Order card:** peach fill plus orange border plus a gold left bar is three competing colours; the pickup date and time is pushed to the right under the order number; the total and the status are cut off at the bottom behind the tab bar; there is no obvious next action.
3. **Prep list:** the label "To (optional, for a range)" wraps and overlaps the field; the page opens on an empty date and is mostly blank.
4. **Settings:** the pause switch is a tiny plain checkbox; card headings are in the thin serif at small size and look hairline.
5. **Everywhere:** the top bar plus the demo banner plus the Log out button take about 40 percent of the phone screen.

## 1. Shell

- **Slim top bar**, about 56 px: wordmark "Steam & Spice" left; a small **Demo** pill (tap or click shows the old explanation in a small popover); on the right a menu button holding Log out (and later Security). Remove the large Log out button and the large demo banner.
- A **paused strip** (amber with text, not colour alone) at the very top of every admin page while ordering is paused: "Ordering is paused" and a "Resume" button.
- Content gets bottom padding equal to the tab bar height plus the safe-area inset, so the last card and its buttons are never hidden. Page title in Instrument Serif at the admin size from the spec (1.5rem), one line.
- Wide screens (from the desktop token up): sidebar plus content with a maximum content width token; no stretched fields; two-column layouts only where they help.

## 2. Form controls (all admin pages)

- **No horizontal overflow at 320 to 430 px.** Date, time, select, text and number fields: `width: 100%`, `min-width: 0`, equal height (44 px), left-aligned text, the same border, radius and font as the rest, `appearance` reset so iOS date fields look like our fields. Label above, never overlapping the field; labels may wrap but fields line up.
- Two fields side by side use a two-column grid with equal widths that collapses to one column below a token width. "From" and "To" are always the same size.
- **Toggle switch component** (`role="switch"`, `aria-checked`, at least 44 px tall, on state in emerald with the words On and Off, keyboard and screen-reader friendly) replaces single checkboxes that mean on or off.
- Buttons: one primary style (solid emerald) and one secondary (outline); consistent heights; destructive actions (Cancel order) use a clear red-tinted outline with text, with an in-page confirmation.

## 3. Orders page

- **Compact filters:** one horizontally scrollable row of status chips (Open, New, Confirmed, Ready, Collected, Cancelled, All) and a row of quick ranges (Today, Tomorrow, This week, All upcoming); the exact From and To dates live in a collapsed "Date range" section. "Prep list" is a link-style button at the top right of the title row; "Show past orders too" becomes a toggle in the same collapsed section. The first order must be visible without scrolling on a 390 by 844 phone.
- **New orders count:** a compact badge next to the title ("3 new") in emerald, not the large red numeral.
- **Order card**, white with a hairline border and a 4 px emerald left bar only for `new`:
  1. Top row: order number (left) and a **status badge** (right) with text, for example New (solid emerald, white text), Confirmed (green tint, emerald text), Ready (peach tint), Collected (outline), Cancelled (outline, struck number). Sample or manual tags are small outline pills.
  2. **Pickup line**, the most prominent text: "Sat 14 Nov, 10:30" in Hanken 600 at a larger size, left-aligned, with a small "Customised" pill when any line is customised.
  3. Customer line: name, then the phone as a tap-to-call link.
  4. Items as a compact list: "2 × Frozen chicken momo", chosen options in smaller muted text under each line, notes in italics.
  5. Footer: total on the left; actions on the right: **one primary button for the next status** (New: "Confirm", Confirmed: "Mark ready", Ready: "Mark collected"; none when collected or cancelled), **"Message"** (opens the Message customer flow) and a **"More"** menu (the other statuses and Cancel order, which uses the in-page confirmation). All through `set_order_status`.
- Date group headings ("Saturday 14 November") in Hanken 600, sticky while scrolling, with the number of orders; no serif at small sizes.
- Empty state: a friendly sentence and a link to place a demo order on the site (only while the demo backend is active).

## 4. Prep list

- **Day chips** for today and the next 7 days showing the number of open orders per day ("Sat 14 · 3"); the page opens on the first day that has orders, otherwise tomorrow. Exact date and optional range go in a collapsed section using the same grid fields as the orders page.
- Result: each product on one line with a large quantity, then option totals indented, then the "Customised orders" list (order number, name, options). Empty state names the next day that has orders.
- Print: one clean page without the shell, chips or buttons.

## 5. Settings

- Page title in serif; **card headings in Hanken 600** at about `--step-1`, not the serif.
- Pause ordering becomes a toggle switch with the message field below it; saving shows a clear "Saved" confirmation next to the button (and the paused strip appears at once).
- Spacing between cards consistent; Save buttons the same width and position in every card; long help text in a smaller muted size, never smaller than 0.875 rem.

## Do not

Change behaviour, rules, data, tests (except where markup changes, then update and say so), add features, libraries, effects or new colours; start 4b, 4c or Step 3.

## Must see (open your own screenshots at 390 and 1440 px and say what you saw)

- Orders: no horizontal scroll; filters compact; at least the first order card fully visible, with its status and primary action; the pickup time reads first on the card; chips scroll horizontally inside their row only.
- A card for each status (create demo orders in each state) looks right, and status is never shown by colour alone.
- Prep list: day chips, the page opens on a day with orders, fields aligned, printed layout checked in print preview.
- Settings: toggle switch works by tap and keyboard; card headings readable; Saved confirmation visible.
- Top bar slim; Demo pill popover; paused strip appears when paused; the bottom tab bar never hides content.
- Keyboard focus visible on chips, buttons, toggle and menus; reduced motion honoured.

## Verify (once each)

`npm test` and `npm run build` pass (list tests changed). Contrast ratios for the status badges and chips. Merge to `main`, push, confirm the deploy ran.

## Tracker checklist to add

- [ ] Slim top bar, Demo pill, paused strip, bottom padding
- [ ] Form controls: no overflow, aligned fields, toggle switch
- [ ] Orders: compact filters, new card layout with primary next action and More menu
- [ ] Prep list: day chips, clear result layout, print
- [ ] Settings: toggle, readable card headings
- [ ] Checked in own screenshots, merged to `main`, deploy confirmed

## Report

Use the report format in `CLAUDE.md`, with contrast ratios, one line per "Must see" item and every test you changed.
