# Step 4g — Editable allergens and ingredients, and the Save bar (decision D-062)

Prerequisite: Steps 4bc and 4e are merged (4f may be in progress or merged; if 4f is not merged, do this on top of what is on `main` and keep its look rules). Merge `origin/main` first. Read `CLAUDE.md`, D-031, D-046, D-052, D-061, D-062 and `backend/README.md`. Owner rules for the session: write the code, run the build once and only the tests for files you changed; no screenshot matrix, but look at your own 390 px screenshot of the product editor and say what you saw; no visible demo, sample or TODO wording.

## 1. Bug: Save and Cancel bar floats in the middle of the screen (Products, Edit product)

On the owner's iPhone the sticky Save and Cancel row sits about 250 px above the tab bar, over the content (Stock card), instead of docked to the bottom. Since Step 4e the tab bar is part of a fixed-height column layout, so the bar's offset (probably still `tabbar height + safe area`, or `position: fixed` with a bottom offset) is now wrong. Find the cause on every admin form that has an action bar (product edit, new product, pickup, settings, dialogs) and fix it so the action row is **docked directly on top of the tab bar** (`position: sticky; bottom: 0` inside the scrolling content area, offset 0, no double safe-area), with the last field never hidden behind it (padding-bottom equal to its height). Say what the cause was. Check short and long forms at 390 px.

## 2. Allergens as editable data

- **Migration** (new forward-only file in `backend/supabase/migrations/`; do not edit older ones): table `allergens` (`id`, `name`, `sort_order`, timestamps) and join table `product_allergens` (`product_id`, `allergen_id`), RLS and explicit grants exactly like the other tables (public read of names for the build and the shop; admin write only). Seed the **14 UK allergens** as ordinary rows (celery, cereals containing gluten, crustaceans, eggs, fish, lupin, milk, molluscs, mustard, peanuts, sesame, soya, sulphur dioxide and sulphites, tree nuts) with the admin able to rename and delete them. Migrate existing `products.allergens` data into the join table (match by name), keep `allergen_note` as is, then stop using the old column in code (do not drop it in this step).
- **Admin UI:** in the product editor the Allergens card lists the allergens from the database as tick boxes (2 or 3 column grid). A small **Manage allergens** control (in the same card and under Settings) lets her add a new allergen, rename, reorder and delete; deleting one used by products says how many and asks for confirmation. Keep the note field.
- **Permanent reminder** at the top of the Allergens card, always visible: "UK law requires the 14 main allergens to be declared. Keep them in this list and tick every one that applies to this product." (plain wording, no scare styling.)
- **Safeguard:** a required tick box on each product, "I have checked the allergen and ingredient information", stored on the product (`allergens_checked_at`); the Active toggle cannot be switched on without it, with a clear message. Editing allergens or ingredients afterwards clears it and asks her to confirm again.
- The build reads allergens and the note from the database for each product page, structured data and any allergen text; products with no allergens ticked show nothing invented (D-052).

## 3. Ingredients as tags

- Per product, add ingredients **one at a time as removable tags** (type, press Enter or Add; remove with a small x; reorder by drag or arrows is optional). Suggestions appear from ingredients already used on other products. Store in a new table or array (your choice, with a forward-only migration; migrate the existing `ingredients_text` by splitting on commas where possible, keep the original text if not).
- The product page and the sheet show them as a clean list, in her order. Nothing is hard-coded in the code.

## 4. Other hard-coded lists

Search the admin and the build for any other hard-coded customer-facing or editable lists (option group names, spice levels, status names are fine as code; ingredient or allergen text is not) and report what you found; do not change the order statuses.

## Do not

Drop old columns, edit old migrations, change the public look, add libraries, or touch order logic. Do not remove the safeguard.

## Report

Under 25 lines: cause of the Save bar bug, migration file name, what was built, what you checked and did not check (you cannot reach Supabase from your sandbox), and what the owner should test after the deploy workflow applies the migration (create a product, add and delete an allergen, tick allergens, add ingredient tags, try to make it Active without the check, Save bar at the bottom).
