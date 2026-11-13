# Step 4n — Admin fixes round (decision D-066)

Prerequisite: Step 4k is merged (it is). Merge `origin/main` first. Read `CLAUDE.md`, D-052, D-061, D-062, D-065, D-066, `docs/design/reference/admin-ui-reference.jpg`, `docs/instructions/step-4m-order-menu-and-activation-fixes.md` (Bug 1 only), and the current admin pages. Owner rules for the session: write the code, run the build once and only the tests for files you changed (database tests only if you change SQL); look at your own 390 px screenshots of every item below and say what you saw; no demo, sample or TODO wording. You cannot reach Supabase from your sandbox: say what you could not check.

## A. Product editor: back to one page (undo the tabs of Step 4k)

The owner found the product editor was not crowded and wants it as before. Restore the **single scrolling form** the editor had before Step 4k (see commit `6ab5b47` for the layout: `git show 6ab5b47:<path>`), with the cards in the same order: Name and description, Price, Photo with alt text, Options, Ingredients, Allergens with the check, Stock, Availability. Remove the tab strip, the tab dots and the hash-routing for tabs. Keep everything built since then (the docked Save and Cancel bar, one Save, the allergen safeguard, category if present, validation, the 4f look). On a failed Save, scroll to the first invalid field, focus it and mark it in red with an icon and text. Keep the new Settings hub (section B).

## B. Settings hub: make it look like the rest of the admin, and give it a back path

The live hub (screenshot from the owner's phone) shows huge black icons (SVGs with no size or colour, about the full screen width) and the row title and summary run together on one line ("OrderingOpen · No daily limit…"). Fix:

- Icons sized by a token (about 1.5rem), emerald, inside a soft round tint; row layout: icon, then title above the one-line summary, chevron on the right; solid white rows with hairline border and raised soft shadow like the other cards, a gap between rows, the Settings title above the list. No inline SVG without width and height attributes or CSS, anywhere in the admin: search for the same bug elsewhere (Home, Orders, Products, login, tab bar) and fix it.
- Each sub-page has a clear **back arrow** at the top left ("‹ Settings") that works with the browser Back button and the tab bar. When a sub-page was opened from another page (for example from the product editor or Home), it returns **there** (use a `from` parameter, validated against a list of admin paths), and the button says where ("‹ Back to Products").
- Check the hub and every sub-page at 320, 390 and 1440 px.

## C. Customised-order notice period: small modal from the product editor

In the product editor's Availability card, show the current notice period as a line ("Customised orders need 48 hours notice. This applies to all products.") with an **Edit** button that opens a small glass modal containing only that setting (hours or days input with unit, clear label, Save and Cancel, 44 px close button, Escape closes, focus trapped and returned). It saves the same setting the Settings → Ordering page edits, immediately, without leaving the product and without losing unsaved product changes; show a toast on success. If a per-product lead time exists, show it too with its own field. The Settings → Ordering page stays the main place for it.

## D. Blocked Active toggle: lead her to the field, marked in red (replaces Bug 2 of the 4m file)

When she turns **Active** on (in the list or in the editor) and the product cannot be shown yet:
- **Allergen check missing:** navigate straight to the product editor (if she is on the list), scroll the **Allergens** card into view under the bars, mark the unticked "I have checked the allergen and ingredient information" box with a red outline, a red icon and the text "Tick this to show the product", and focus it. The red mark stays until she ticks it.
- **No price:** same, to the Price field ("Set a price to show the product").
- After she ticks and saves, Active is on, the red mark is gone, and Back returns to the list. Show a short toast only as a secondary cue, never the only message. On the list card also keep a quiet text chip ("Needs allergen check" or "Set a price first") that does the same when tapped, and keep the toggle visibly reflecting the real state (never silently snapping back).
- Verify that nothing else blocks the toggle (a failed request, row-level security, a stale value) and say what you verified. Frozen veg momo and the two sauces are the current examples.

## E. Order "More" menu

Do Bug 1 of `step-4m-order-menu-and-activation-fixes.md` exactly as written (only sensible next actions per status; Reopen order takes stock again once and refuses with a clear message; Cancel asks a confirm; the menu does not cover the order text).

## F. Publish

On the live site, Publish shows "Publishing is not set up yet." because the owner has not yet added the function secrets (`GITHUB_DISPATCH_TOKEN`, `BUILD_STATUS_TOKEN`); that is expected. Improve only the wording and states: when the function returns 503, show "Publishing needs a one-time setup. Ask the developer to finish it (see backend README, section 4)." in the banner instead of a vanishing toast; when it works, the banner goes Publishing, then Live with the time of the last publish. Do not change the function logic.

## Do not

Change the database (except Reopen's stock logic if needed, as a new forward-only migration with a test), the public site, the order rules or the allergen safeguard; add libraries; show demo wording.

## Report

Under 25 lines: what changed per section A to F, what you checked in your own screenshots and did not (Supabase), where else you found the unsized-icon bug, and what the owner should test (product editor is one page again; Settings hub looks right and the back arrow returns to Products; edit notice period from the product without leaving; toggle the veg momo on and be taken to the red allergen check; Cancelled order menu; Publish message).
