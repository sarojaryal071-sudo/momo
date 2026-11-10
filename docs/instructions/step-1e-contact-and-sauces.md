# Step 1e — Contact links, sauce corrections and mobile fixes (decision D-030)

Prerequisite: Step 1d is merged (it is). Merge `origin/main` first (new docs and possibly new sauce images). Read `CLAUDE.md`, then `docs/decisions-log.md` D-029 and D-030 and `docs/design/image-manifest.md`. Do only this step; do not start Step 3. Add the checklist at the bottom to `docs/progress-tracker.md` first. Keep it small: no redesign, but section 4 (mobile fixes found by the owner on a real phone) comes first, because it affects every page.

## 1. Contact: phone, WhatsApp, Instagram

The phone number `+44 7413 069241` is also her WhatsApp number (confirmed). Show all three ways to reach her:

- **Phone**: already in the header and footer. Keep.
- **WhatsApp**: a link `https://wa.me/447413069241` (no pre-filled text needed). Add it in the footer "Get in touch" column and next to the phone number on the cart and done pages as "Message us on WhatsApp". On the home page add it once, in the "How ordering works" row, as a calm secondary text link or small outline button. It must work without JavaScript (a real `href` in the HTML). Draw a small single-stroke WhatsApp-style chat bubble glyph as SVG (no brand logo, no icon set); the visible text carries the meaning.
- **Instagram**: the URL is not known yet. Add `socialLinks: { instagram: '' }` to `siteConfig` in `frontend/js/site-config.js` (one named place). In the footer "Get in touch" column add an Instagram line: when the constant is empty it shows a visible placeholder `<span data-todo>TODO: Instagram link</span>`; when set, it is a normal external link (`rel="noopener"`). The build script, not runtime JS, must fill it, so it exists in the HTML for search engines. If wiring the build to read the constant is more than a few lines, use a clearly marked region in the HTML and tell me in the report. A small single-stroke Instagram-style glyph (rounded square, circle, dot) as SVG, no logo.
- Static HTML cannot import `site-config.js`. Keep the number identical everywhere (`tel:`, `wa.me`, `siteConfig.whatsappNumber`) and list in the report every file that contains it. Remove the old `TODO: confirm with owner` comment in `site-config.js`.
- Remove nothing else. The existing WhatsApp order flow is unchanged.

## 2. Sauce copy (the chutney tile)

Her chutney is **turmeric yellow** and her hot sauce is **red with chilli seeds** (D-030). The old copy "spicy tomato chutney" and the red-tomato bowl alt text are wrong. Update, using `docs/brand-direction.md` section 4 item 4:

- Tile heading "The sauces" (was "The chutney"). Text: "Momo is traditionally served with a spicy dip." then "Add our chutney or hot sauce to your order." Keep the `data-todo` for her own flavour words.
- Button text and links stay pointing at the shop.
- Search the whole `frontend/` for "tomato" and "red" claims about the chutney (including `content/products/*.json`, alt text and JSON-LD) and fix them. Describe only what can be seen. Never claim a taste or ingredient.

## 3. Sauce images

**A real photo now exists:** `frontend/assets/img/photo-sauce.webp` (335 x 335, opaque, supplied by the owner, a bowl of her orange-red sauce in a black bowl on a wooden board). It is a **scene** photo, not a cut-out: show it as a framed image with the rounded-corner token, never multiplied, never stretched, and not larger than about 16rem wide (it is small and would look soft). Alt text: "A bowl of homemade red-orange sauce". It is not yet known whether this is the chutney or the hot sauce, so do not label it as either; do not put it on a specific product card.

- **Home sauce tile (peach):** show `photo-sauce` in a framed, rounded container beside the text. Replace the old red bowl cut-out there; the old `cutout-chutney.webp` (red tomato bowl with baked shadow) must no longer appear anywhere. Delete the old `cutout-chutney*.webp` files once nothing uses them, unless new ones with the same name have arrived from the owner after you merge `origin/main`.
- **Product cards for `chutney-pot` and `hot-sauce-pot`:** keep the drawn sage placeholder with "Photo coming soon" until real or AI product images exist. If `cutout-chutney.webp` (turmeric yellow) and `cutout-hot-sauce.webp` (red, with seeds) are in `frontend/assets/img/` after you merge, use them as normal cut-outs on the `--green-tint` square (no `mix-blend-mode: multiply`; that is only for the two opaque pack shots), with the alt texts "A small pot of turmeric-yellow chutney" and "A small pot of red hot sauce with chilli seeds".
- Report which of these files were present.

## 4. Mobile fixes (owner tested on a phone; do these first)

**4a. Header: one slim line on phones.** At narrow widths the header currently wraps to three lines (wordmark, nav links, phone and cart). Make it a single line: the wordmark on the left; on the right the **cart icon with its count badge (always visible, outside the menu)** and a **menu button (hamburger)**. The menu panel holds Home, Shop, How to cook, the phone number, the WhatsApp link and the Instagram line (section 1). Rules:
- The menu button is a real `<button>` with an accessible name ("Menu"), `aria-expanded`, `aria-controls`; at least 44 px target; closes on Escape, on choosing a link and on tapping outside; focus moves into the panel and back to the button on close. Hamburger icon drawn as SVG, single stroke, no icon set.
- No JavaScript fallback: the links must still be reachable (for example the nav simply shows as a wrapped row when scripts are off).
- The panel opens over the content (or pushes it down) with no layout shift of the page below it when closed. Calm style: white panel, emerald text, clear dividers, large tap rows. Respect reduced motion.
- At wide widths keep the current inline header (nav, phone, cart); the menu button is hidden there. Switch with a named breakpoint token, not a magic number.

**4b. Product cards are far too big on phones.** One card currently fills the whole screen. On narrow screens use a **compact horizontal card**: the image on the left (a fixed fluid size token, roughly a quarter to a third of the card width, still on the `--green-tint` tile), and on the right the name, size, price, the quantity control and "Add to cart" in a tight stack. Two or three cards must be visible on one phone screen. From the tablet breakpoint up, return to the vertical card in a grid with a maximum card width. All existing classes, `data-*` attributes and IDs stay. Use tokens only (D-022).

**4c. A clear path to checkout.** Customers currently add to cart and see no next step except a small cart icon.
- After "Add to cart", the button briefly shows "Added" (announced to screen readers with a polite live region) and returns to normal.
- Add a **sticky checkout bar** at the bottom of every shop-related page (home, shop, how to cook) that appears only when the cart has items: "N items · £X" on the left and a primary emerald button "Go to checkout" on the right, linking to `cart.html`. The total comes from `data/products.json` / the seed through the existing cart code; if a price is unknown (unpriced sauce) show only the item count. Hide it on `cart.html` and `done.html`. Respect the phone's safe area (`env(safe-area-inset-bottom)`), leave bottom padding so it never covers content or the footer, and hide it without JavaScript (the cart needs JavaScript anyway).
- Name the cart page's main action "Place order" as it is today; the header cart icon gets an accessible name "Cart, N items".

**4d. Spacing between home sections.** On the home page the peach sauce tile touches the emerald "Made together" band with no gap (and sections run into each other elsewhere). Give every home section a consistent vertical rhythm from one spacing token (a larger space between major sections than inside them), so no two coloured blocks touch unless they are meant to (the hero panel and trust row, the footer ridge line). Check at 360 px and wide.

**4e. Alt text on the shop page photo.** `photo-plate` shows a bowl of red sauce; the alt text must say "A plate of steamed momo with a small bowl of red sauce" (D-030), not "tomato chutney". Same wording in the manifest, which I have already updated.

## Do not

Change ordering logic, data structure, tests, or the build validations beyond filling the Instagram line. Add libraries, brand logos, or social icons for accounts that do not exist (only Instagram is allowed, and only as the placeholder until the URL exists). Start Step 3.

## Verify (once each)

- Header at 360 px is one line on every page; the menu opens, closes (button, Escape, link tap, outside tap) and is usable by keyboard; wide header unchanged.
- Shop at 360 px shows two or more compact cards on screen; add an item and confirm the "Added" state and the sticky "Go to checkout" bar appear, show the right count and total, link to the cart, and are absent on cart and done.
- Home at 360 px: clear spacing between the sauce tile, Made together band and the other sections.
- Home, shop, cart, done at 360 px: contact links present, no horizontal overflow, focus visible, links keyboard-reachable.
- The WhatsApp link opens `https://wa.me/447413069241` (check the `href`; the owner tests on a phone).
- Instagram placeholder shows with `data-todo`; with a temporary non-empty value (not committed) it becomes a real link.
- `grep -ri tomato frontend` shows no claim about her chutney. `npm test` and `npm run build` pass.
- Merge to `main`, push, confirm the deploy ran.

## Tracker checklist to add

- [ ] Mobile header: one line with menu button; cart icon always visible
- [ ] Compact product cards on phones
- [ ] "Added" state and sticky checkout bar
- [ ] Home section spacing
- [ ] Phone, WhatsApp and Instagram links (placeholder for Instagram)
- [ ] Sauce tile copy and alt text corrected
- [ ] Sauce tile uses `photo-sauce`; product cards keep placeholders unless sauce cut-outs exist
- [ ] Verified, merged to `main`, deploy confirmed

## Report

Use the report format in `CLAUDE.md`. Include every file that contains the phone number, and say whether the sauce images were present.
