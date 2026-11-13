# Step 4l — Catalogue: categories, reusable options, allergens by product (decision D-065)

Prerequisite: Step 4k is merged. Merge `origin/main` first. Read `CLAUDE.md`, D-028, D-031, D-046, D-052, D-062, D-065, `backend/README.md`, the migrations (`0001` option tables, `0002` order functions, `0007` allergens), `place_order` and `set_order_status`, `scripts/build.mjs` and the shop code that renders options. Owner rules for the session: write the code, run the build once and only the tests for files you changed plus the database tests (they run on a local PostgreSQL; run them once because this step changes the order function); you cannot reach Supabase, so say what is and is not checked.

## Goal

A Flatpay-style catalogue she manages centrally: **Categories**, a library of **Options** (reusable option groups, like modifier groups) that she builds once and applies to individual products or to whole categories, and **Allergens** where she chooses which products contain each allergen in bulk. Customers see the same options as today; prices, lead-time, stock and order rules do not change.

## 1. Database (new forward-only migration(s); never edit older ones)

- `categories` (`id`, `name`, `sort_order`); products get `category_id`; migrate existing `products.category` text values into rows (keep the old column untouched, stop using it in code).
- **Option library:** `option_groups` (`id`, `name`, `kind` single or multiple, `sort_order`, `active`) and `options` (`id`, `group_id`, `label`, `price_delta_pence`, `is_default`, `sort_order`, `active`) as the reusable library; join tables `product_option_groups_link` (`product_id`, `group_id`, `sort_order`) and `category_option_groups` (`category_id`, `group_id`). **Effective groups of a product = groups linked to the product plus groups linked to its category** (a product can also be excluded from a category group with an exclusion row if you judge it necessary; otherwise state that you did not build it). Migrate the existing per-product groups and options into the library (merge groups with the same label and identical options into one shared group, otherwise keep separate), then link them to the same products, so the shop shows exactly the same options as before. Keep old tables until verified; do not drop them in this step.
- RLS and explicit grants like the other tables (public read of what the shop and the build need, admin write only).
- **`place_order` and any order function** must validate selected options against the **effective** groups, with every existing rule unchanged (prices recomputed server-side, defaults, single and multiple, customised lead time, stock, limits). Order items must keep a **snapshot** of the chosen option labels and prices so later edits to the library never change old orders; verify this already holds, or add it.
- Allergens: keep `allergens` and `product_allergens`; add an admin function or plain upserts to set the products of an allergen in one go; keep the per-product ticks and the `allergens_checked_at` safeguard (changing a product's allergens through the bulk screen clears that product's check, with a clear message).

## 2. Admin UI

On the Products area add four top tabs under the title: **Items, Categories, Options, Allergens** (strip never overflows at 320 px; selected state in the URL). Use the 4f kit.

- **Items:** the list as today, with a category filter and category shown on each row.
- **Categories:** list with add, rename, reorder, delete (delete asks how many products use it and moves them to no category). Each category shows which option groups it applies to.
- **Options:** the library. List of option groups; open one to edit name, single or multiple choice, its options (label, price change in £, default, order, active); and an **Applies to** section with two pickers: categories and individual products (checkbox lists with search), showing the count. Deleting a group in use shows how many products and categories use it and asks to confirm.
- **Allergens:** the allergen list (add, rename, reorder, delete, with the permanent UK-law reminder) and, for each allergen, a **Contains in** picker to choose products in bulk (checkbox list with search and "select all in category"). Show a matrix summary per product so she can see what each product contains.
- **Product editor** (from 4k): Basic gets a category selector; Advanced shows the **effective options** (inherited from the category, marked "from category", and linked directly) with an **Add option group** picker from the library and a **Create new group** shortcut; Allergens tab ticks still work and stay in sync with the bulk screen.
- One docked Save per page, unsaved dots, real empty states, no demo wording.

## 3. Build and shop

`scripts/build.mjs` and the shop read the effective groups per product into `products.json` exactly in the shape the shop already uses; the product page, structured data and allergen text come from the same data. A failed or empty fetch still fails the build; a product with no price stays unorderable.

## Tests (database tests only, run once)

Effective groups (direct plus category); an option from a group not linked to the product is rejected; tampered price rejected; defaults, single and multiple rules unchanged; order item snapshot survives renaming and deleting a group; bulk allergen assignment clears the per-product check; RLS (anonymous cannot write; admin can); the data migration produced the same options for existing products.

## Do not

Drop old tables or columns, edit old migrations, change prices or order rules, add libraries, change the public look, or show demo wording.

## Report

Under 30 lines: migration file names, how existing data was migrated and merged, whether product-level exclusions were built, what you checked (database tests, mock backend) and did not (Supabase), and what the owner should test after the deploy workflow applies the migration (existing products still show the same options in the shop; create a category and an option group; apply it to a category and see it on its products; place an order using it and see the order; bulk assign an allergen; confirm a product's allergen check clears).
