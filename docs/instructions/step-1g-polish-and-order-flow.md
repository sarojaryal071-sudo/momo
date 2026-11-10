# Step 1g — UI polish and the new order flow (decisions D-036, D-038, D-039)

Prerequisite: Step 1f is merged (it is). Merge `origin/main` first. Read `CLAUDE.md`, `docs/decisions-log.md` D-036 to D-039, `docs/technical-rulebook.md` sections 2 to 4, and `docs/ui-rulebook.md` sections 2, 2b and 5. Do only this step; do not start Step 3. Add the checklist at the bottom to `docs/progress-tracker.md` first. This is a polish step on the existing screens: no new pages, no new data model.

## 1. Glass and motion tokens (D-039)

Add to `frontend/css/theme.css` (fluid, token-only, D-022; the only place raw values live):
- Glass: `--glass-bg` (white at high alpha), `--glass-bg-strong`, `--glass-border` (hairline, white at low alpha plus a faint dark edge), `--glass-blur`, `--glass-shadow`.
- Raised and pressed shadows for tactile controls: `--shadow-raised`, `--shadow-pressed`.
- Motion: `--dur-fast`, `--dur-base`, `--dur-slow`, `--ease-out`, `--ease-spring`.
- **Rules:** no gradients anywhere. Glass is used only on: the modal and its backdrop, the sticky header, the menu panel, the checkout bar and notice strips. Cards, forms and text areas stay solid. Text on glass must still meet the contrast ratios (report them; use the stronger background where the content behind varies). Wrap `backdrop-filter` in `@supports`, with a solid token fallback. Honour `prefers-reduced-motion` (no movement, only instant or opacity changes).

## 2. Product details window (modal) proportions

The current sheet is badly proportioned and the whole content scrolls with the photo cut off. Rebuild the layout:
- **Phone:** a bottom sheet, about `85dvh` high (token), rounded top corners, a small drag handle, glass backdrop that blurs the page and a slide-up with the spring easing (fade only under reduced motion). Swipe down or tap the backdrop closes it; Escape and the close button too.
- Three zones: a **fixed header** (close button, product name, price), a **scrolling middle** (photo, ingredients and allergens `TODO`, option groups, notes), and a **fixed footer** with the quantity stepper and the "Add to cart · £total" button, always visible. Only the middle scrolls; the page behind does not scroll (`overscroll-behavior: contain`, body lock).
- The photo is a **compact thumbnail** (about the size of the card image, `--green-tint` square) beside the name and price, not a full-width block that eats the screen.
- **Tablet and wide:** a centred dialog with a maximum width token, same three zones, fade and scale in.
- Keep everything from Step 1f (focus handling, options, stock line, customised note, allergy line).

## 3. Tactile option buttons

Option rows (radio and checkbox) become raised tiles: soft `--shadow-raised`, a clear selected state (emerald border, `--green-tint` fill, an animated tick or filled dot that springs in), and a press-down state (`translateY` and `--shadow-pressed`) with `--dur-fast`. Keep them accessible: real inputs, visible labels, 44 px targets, visible keyboard focus. Apply the same press feel to the card "Add" button, the stepper buttons and primary buttons across the site (subtle, not toy-like). Reduced motion: no transforms.

## 4. Menu panel

- The menu panel uses the glass surface and opens with a short slide and fade.
- **Bug:** when the menu opens, the first link ("Home") shows a heavy focus box. Move focus to the panel container (not the first link) when opened by touch or mouse, and show the focus ring only for keyboard users (`:focus-visible`). Keep the ring visible when opened with the keyboard.
- Even row heights and spacing for Home, Shop, How to cook, phone, WhatsApp and Instagram.

## 5. Pickup time: hour and minute lists (D-038)

Replace the one-hour time list in the cart with two controls after the customer picks a date: an **hour** list and a **minute** list (native `<select>` elements, shown as scrolling wheels on phones), only offering values inside that day's window (or an extra-date window), never on a closed date, never earlier than the lead time (standard or customised notice from Step 1f). The minute list steps by `PICKUP_STEP_MINUTES` (named constant in `site-config.js`, default 1; the seed rules' `slot_minutes` become 1). Show the window as text ("Available 09:00 to 12:00 on Saturday"). Changing the hour re-validates the minute list. The selected date and time keep the same shape in the order.

## 6. Cart form: name and phone required (D-036)

- Name and phone are **required**. Remove "Nothing is required" and "Add your phone number so we can arrange pickup" hints; label them plainly. Notes stay optional.
- Validate the phone as a UK number (the existing converter helper), with a clear inline error and an accessible message; after valid input show it back ("We will message you on 07xxx xxx xxx") so typos are caught.
- The main button reads "Place order". Keep "Pickup only, pay cash on pickup" beside it.
- Update field limits, the mock gateway, the messages and the tests for the required fields.

## 7. The "Order received" screen (D-036)

Rebuild `done.html` (keep the script hooks the tests use or update the tests and say so):
- An animated confirmation on arrival: a drawn single-stroke check inside a circle that draws itself, then a calm fade-in of the content. Reduced motion: shown instantly.
- Heading **"Order received"**, then "Your order number is SS-1011-01." Never write "confirmed" or "sent".
- Summary: lines with options and "Customised" labels, pickup date and time, name, total in pence formatted.
- **Three next steps** in a calm list: "We will message you on WhatsApp to confirm your order." / "Pick up at <date> <time>. We will send the full address then." / "Pay cash when you pick up."
- A highlighted line: "Your order is not confirmed until we message you." (this is the point of the screen, so it must be visible near the top).
- Contact: "Questions? Call +44 7413 069241 or message us on WhatsApp" (links as today). A "Back to the shop" link.
- **Remove the automatic WhatsApp opening and the big "Open WhatsApp" order button.** Keep the message builder helper for the failure case and for Step 4.
- **Failure case** (gateway failed or timed out): "We could not place your order online. Please send us the WhatsApp message instead so we receive it." with the pre-filled WhatsApp button and the cart kept, as in `docs/technical-rulebook.md` section 3.
- In `mock` mode the number is `SS-TEST-01` as before.

## Do not

Add gradients, new libraries, emoji, new pages, or claims; touch the product data model, options logic or stock logic beyond what these sections need; start Step 3. Do not hard-code values: tokens and named constants only.

## Verify (once each)

- Phone 360 px: modal opens as a sheet, only the middle scrolls, header and footer stay, the page behind does not scroll, swipe or backdrop closes it, option tiles press and select with animation, focus returns to the opener.
- Wide: modal is centred with a maximum width. Glass surfaces look right over the page and fall back to solid without `backdrop-filter`. Reduced motion run: no movement.
- Menu: no heavy box on the first link when opened by touch; keyboard still shows a ring.
- Cart: hour and minute lists respect the window and the lead times (try a customised line); name and phone required with clear errors; number echoed back; "Place order".
- Done: the animated check, "Order received", "not confirmed until we message you", three steps, no automatic WhatsApp, failure case works (turn the mock gateway to fail).
- Contrast ratios for every glass pair; focus visible on glass, white, tinted and emerald.
- `npm test` and `npm run build` pass (list tests changed). Merge to `main`, push, confirm the deploy ran.

## Tracker checklist to add

- [ ] Glass and motion tokens
- [ ] Modal sheet: fixed header and footer, compact photo, scrolling middle, animation
- [ ] Tactile option buttons and press states
- [ ] Menu glass panel and focus fix
- [ ] Hour and minute pickup lists, `PICKUP_STEP_MINUTES`
- [ ] Name and phone required, phone echoed back, "Place order"
- [ ] "Order received" screen, failure path, no automatic WhatsApp
- [ ] Verified, merged to `main`, deploy confirmed

## Report

Use the report format in `CLAUDE.md`, with contrast ratios for the glass pairs and every test you changed.
