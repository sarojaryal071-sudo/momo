# Step 4f — Admin visual style and Products redesign (decision D-061)

Prerequisite: Steps 4bc, 4d and 4e are merged. Merge `origin/main` first. **Open and study `docs/design/reference/admin-ui-reference.jpg`** (four panels: component kit, Products list, Edit product, Orders). It is the approved look. Read `CLAUDE.md` (rules still apply), D-044, D-050, D-059 to D-061 and `docs/design/type-and-spacing-spec.md` section 5. Owner rules for the session: write the code, run the build once and only the tests for files you changed; no screenshot matrix, but look at your own 390 px screenshot of each page you touched and say what you saw; no visible demo, sample or TODO wording. Admin only: do not change the public site. If Step 4e already added a raised or glass style, **replace it with this one**; keep 4e's one-row buttons, clean URLs and fixed tab bar.

## What to take from the reference, and what not to

Take: shapes, softness, layout, spacing, states, hierarchy. Do **not** take: its food photos, product names, the 12-item allergen list, sample customers or prices, or the mountain mark (none exists). Real data only: products are Frozen chicken momo, Frozen veg momo, Chutney pot, Hot sauce pot, with their own images from `frontend/assets/img` (pack-chicken, pack-veg; sauces use the existing sauce image or a neutral emerald tile with the product initial if none; never invent a photo). Allergens are the 14 already built.

## 1. Tokens (admin token layer, no hex in components)

Add or update admin tokens: radius (buttons about 0.875rem, chips full pill, cards about 1rem, inputs 0.75rem), raised-button face, top highlight, bottom edge, soft shadow, pressed shadow and 2 px press-down, glass (translucent white about 0.6 to 0.72 alpha, blur about 14 to 20 px, hairline white border, inner top highlight, soft shadow, solid fallback when `backdrop-filter` is unsupported), badge tints, ring colour. Motion tokens: 0.18 s interaction, 0.24 s panels, only under `prefers-reduced-motion: no-preference`.

## 2. Components (match the kit panel)

- **Primary button:** emerald face, white 600 text, soft rounded, gently raised (lighter top edge, darker bottom edge, soft shadow). **Pressed:** darker, shadow tight, moves down 2 px. **Secondary:** white raised face, emerald text. **Destructive:** soft red-tint face, red text, same raised shape. **Disabled:** flat grey, no shadow. **Loading:** keeps the label and shows a spinner. Min height 2.75rem.
- **Round icon buttons** (filled emerald and light tint variants), Log out as an icon button.
- **Toggles:** inset track, raised round white thumb, emerald On and grey Off, with "On"/"Off" text beside when space allows (never colour alone).
- **Status badges** as soft pills: New (mint), Confirmed (green tint), Ready (peach), Collected (grey-green), Cancelled (soft red), each with text; contrast 4.5:1.
- **Dropdowns** (chevron), **inputs** with a clear 2 px emerald focus ring, chips for options (selected is solid emerald).
- Text and control-boundary contrast stays accessible; keyboard focus always visible.

## 3. Glass and background patches (whole admin)

- Glass on: top bar, bottom tab bar (active item gets an emerald underline), menus, dialogs, toasts, the paused strip. Content scrolls under the bars so the blur shows. Cards and form areas stay **solid white** with hairline border and soft shadow.
- **Background:** instead of plain white, one fixed decorative layer behind everything (`position: fixed; inset: 0; z-index` below content; `aria-hidden`; `pointer-events: none`) with three or four large solid-colour circles in brand colours (emerald tint, sage, peach tint, a hint of green) blurred with `filter: blur`, low opacity, placed top, middle-left and bottom-right so they show around cards. **No gradients, no animation, never blur the content itself.** Keep the page base very light (white or green tint) so contrast of text on any area stays at least 4.5:1; check at the strongest patch. Limit the cost on phones (few elements, no repaint while scrolling; if scrolling is not smooth, reduce the blur radius or element count and say so). The same layer is used on login (D-059), so reuse it rather than a second copy.
- Provide solid fallbacks when blur is unsupported or `prefers-reduced-transparency` is set.

## 4. Products area (make it professional and beautiful)

Rebuild the screens with the above components, keeping all existing function:

- **List:** title "Products" and a raised **Add product** button; one solid card per product: thumbnail (real image, rounded), name (sans, 600), price (£, tabular), **Active** toggle, **stock chip** ("12 in stock", "Not tracked", "Sold out"), and a raised **Edit** button on the same row where space allows. Hidden or unpriced products show greyed with the toggle off and a "Set price" prompt. Reorder controls (up and down) kept but quiet. Empty state when there are no products.
- **Unpublished changes:** a slim banner at the top of the list ("Unpublished changes") with a raised **Publish** button and the Publishing / Live / Failed status, as already built, restyled.
- **Edit product** (full screen on phones): glass top bar with back arrow, product name and a delete icon button (confirm in a glass dialog); sections as solid cards in this order: Name, Description, Price, Photo (preview, **Change photo**, alt text required), Options (groups as chips, each group editable: name, choices, price change per choice), Ingredients, Allergens (14 tick boxes in a tidy 2 or 3 column grid with a note field), Stock (tracked or not, quantity), Availability (active toggle, customised lead time). A **sticky action row** at the bottom, above the tab bar: **Save** and **Cancel** side by side. Save shows loading, then a toast; unsaved-changes warning on leaving.
- Inline validation (price format in £ shown, stored as pence), clear error text with an icon.

## 5. Other pages

Apply the kit (buttons, toggles, badges, glass bars, background) to Home, Orders, Prep, Pickup and Settings. **Orders** follows the reference panel: Status and When dropdowns, solid cards with order number and badge, a prominent pickup time, customer name, total, and **Confirm** (primary) with **More** (secondary) on one row. Do not change behaviour or data.

## Do not

Change the public site, the database or the order logic; add libraries or gradients; use the reference's invented products or photos; blur any content.

## Report

Under 30 lines: what changed, files changed, what you looked at and what you did not check, performance of the background on a phone-size viewport, and what the owner should test (button press feel, toggles, glass bars scrolling over cards, background patches on all pages, Products list and Edit product with a real save, publish banner).
