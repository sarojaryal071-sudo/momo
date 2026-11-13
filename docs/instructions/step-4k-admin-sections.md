# Step 4k — Admin sections: Settings menu and product editor tabs (decision D-065)

Prerequisite: Steps 4bc, 4f, 4g, 4h, 4j are merged (check `docs/progress-tracker.md`; do not start if any is missing). Merge `origin/main` first. Read `CLAUDE.md`, D-052, D-061, D-062, D-065, `docs/design/reference/admin-ui-reference.jpg`, and the current `admin/settings`, `admin/products` and product-editor code. Owner rules for the session: write the code, run the build once and only the tests for files you changed; look at your own 390 px screenshots of the Settings hub, one Settings section, and each product editor tab, and say what you saw; no visible demo, sample or TODO wording. **Layout only: no database or behaviour change.** All existing fields, validations and the allergen safeguard (D-062) keep working.

## 1. Settings: menu list and sub-pages

- `admin/settings` becomes a **hub**: a short list of rows (icon, title, one-line summary of the current value, chevron), as solid cards on the admin background: **Ordering** (pause ordering, daily limit, notice period for customised orders, ordering message), **Pickup details** (pickup area text, private pickup address, anything else about collection), **Messages** (WhatsApp templates), **Notices** (site notice banner), **Backup and privacy** (export, privacy text), **App** (add to home screen, Live feed status, log out). Map every existing settings block into exactly one of these; nothing is lost; say where each went. Do not show a row for an empty section.
- Tapping a row opens that section on its own sub-page (a view within the same page with a clean URL such as `settings/ordering` or a hash route; the back arrow, the browser Back button and the tab bar all behave; deep links work after reload). Each sub-page has a title, its fields in solid cards, and the docked Save and Cancel bar from 4g (one Save for that page); unsaved-changes warning on leaving.
- The hub rows show live summaries ("Open", "Paused", "Limit 20 a day", "48 hours").

## 2. Product editor: four tabs

- Under the glass top bar (back arrow, product name, delete) a **sticky tab strip** with four tabs: **Basic, Advanced, Allergens, Availability**. One section is visible at a time; the active tab is raised or underlined in emerald; strip never scrolls the page sideways at 320 px (tabs share the width). Selected tab is remembered while editing the product and in the URL hash.
- **Basic:** name, description, price (£ shown, pence stored), photo with Change photo and required alt text, category (existing field), unit label.
- **Advanced:** the option groups of this product (as today) and the ingredient tags.
- **Allergens:** the allergen tick boxes (list from the database, Manage allergens control, the permanent UK-law reminder, the note) and the required check "I have checked the allergen and ingredient information" (D-062).
- **Availability:** Active toggle (with the safeguard message when the check is missing), stock (tracked or not, quantity), customised lead time, hidden state.
- **One Save for the whole product** in the docked bar: saves every tab together. A small dot on a tab means unsaved changes there; a red dot with an icon means a validation problem there; on Save with a problem the page jumps to the first tab with a problem and focuses the field. New product uses the same four tabs.
- Empty and error states keep real wording; keyboard: tabs are a proper tablist (arrow keys, Home and End).

## Do not

Change the database, the build, order logic or the public site; add libraries; remove any field; show demo wording.

## Report

Under 20 lines: where each existing settings block went, what you checked (own 390 px screenshots, mock backend) and did not (Supabase unreachable), and what the owner should test (open each Settings section, change one value and Save, open a product, switch tabs, make an error on a tab, Save, watch the dot and the jump).
