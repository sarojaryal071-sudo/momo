# Step 4h — Weekly pickup hours redesign (decision D-063)

Prerequisite: Steps 4bc and 4f are merged (if 4f is not merged yet, keep 4f's look rules from `docs/instructions/step-4f-admin-visual-style-and-products.md` and `docs/design/reference/admin-ui-reference.jpg`). Merge `origin/main` first. Read `CLAUDE.md`, D-038, D-052, D-061, D-063, and the current `admin/pickup` page and `pickup_rules` table. Owner rules for the session: write the code, run the build once and only the tests for files you changed; look at your own 390 px screenshot of the Pickup page and say what you saw; no visible demo, sample or TODO wording.

## Problem

The Pickup page shows one full card per rule (Day, From, To, In use, Save, Delete). Two open days already fill the screen; it is crowded and repetitive.

## Build

1. **Weekly hours card (replaces the per-rule cards):**
   - Seven **day chips** in one row (Mon to Sun; wrap or scroll within the card so nothing overflows at 320 px). Tap toggles open or closed; selected is solid emerald with a tick; each chip has an accessible name ("Saturday, open"). 44 px tap targets.
   - Below the chips, **Opening windows** that apply to all open days: each window is one row **From – To** (time inputs, 16 px, any minute per D-038) with a small remove button; **Add another window** (a secondary button) adds a row. Default one window.
   - **Different hours for a day** (a quiet text button): choose a day, and it gets its own windows (shown as a compact row "Sat: 10:00 – 13:00, 16:00 – 19:00" with Edit and Remove); that day then ignores the shared windows. Keep this out of the way when unused.
   - A short **summary line** under the card in plain words, for example "Open Sat and Sun, 10:00 to 18:00", updated live.
   - **One Save** for the whole week (sticky action row docked above the tab bar, like the product editor, with Cancel). Save runs in one transaction (a database function or delete and insert inside one request so a failure leaves the old hours untouched), shows loading, then a toast; unsaved-changes warning on leaving.
2. **Validation:** From must be before To; windows on a day must not overlap (merge or reject with a clear message); at least one open day or a clear "Closed all week" confirmation; no empty windows. Messages in plain words with an icon.
3. **Data:** use the existing `pickup_rules` rows (day, from, to, active). Loading groups the rows into the shared windows (the most common set among open days) and per-day exceptions; saving writes one row per open day and window. No new tables; add a forward-only migration only if you need the transactional function. Public site pickup rules keep working unchanged (verify the shop still reads the same shape).
4. **Date exceptions** (closing a particular date, extra opening) stay as they are, restyled with the same components, below the weekly card; do not mix them with the weekly rules.
5. Use the admin kit from 4f: raised buttons, soft chips, solid card on the background patches. Everything fits on a 390 px phone without horizontal scroll.

## Do not

Change the public site, the order or pickup-time logic, or the date-exception behaviour; add libraries; show any sample wording.

## Report

Under 20 lines: what changed, files changed, what you checked (own 390 px screenshot, mock backend) and did not check (Supabase is unreachable from your sandbox), and what the owner should test (open and close days with chips, two windows on one day, a different-hours day, Save and reload, the shop's pickup times and the cart's date picker after saving).
