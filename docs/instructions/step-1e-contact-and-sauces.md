# Step 1e — Contact links and sauce corrections (decision D-030)

Prerequisite: Step 1d is merged (it is). Merge `origin/main` first (new docs and possibly new sauce images). Read `CLAUDE.md`, then `docs/decisions-log.md` D-029 and D-030 and `docs/design/image-manifest.md`. Do only this step; do not start Step 3. Add the checklist at the bottom to `docs/progress-tracker.md` first. Keep it small: no redesign.

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

Two new cut-outs are coming from the owner, same style as the others: `cutout-chutney.webp` (turmeric-yellow chutney, replaces the old file) and `cutout-hot-sauce.webp` (red, oily, with chilli seeds), each with a `-400` variant, 800 x 800, real transparency, light backgrounds only. If they are in `frontend/assets/img/` after you merge `origin/main`, use them. If not, use the drawn sage placeholder and note it in the report.

- Seed products: `chutney-pot` uses photo `cutout-chutney`, `hot-sauce-pot` uses photo `cutout-hot-sauce`. These are real cut-outs: show them on the `--green-tint` square normally. Do **not** apply `mix-blend-mode: multiply` to them (that is only for the two opaque pack shots).
- The sauce tile on the home page shows `cutout-chutney` (peach background), alt text from the manifest.
- Alt texts: "A small pot of turmeric-yellow chutney" and "A small pot of red hot sauce with chilli seeds".

## Do not

Change ordering logic, data structure, tests, or the build validations beyond filling the Instagram line. Add libraries, brand logos, or social icons for accounts that do not exist (only Instagram is allowed, and only as the placeholder until the URL exists). Start Step 3.

## Verify (once each)

- Home, shop, cart, done at 360 px: contact links present, no horizontal overflow, focus visible, links keyboard-reachable.
- The WhatsApp link opens `https://wa.me/447413069241` (check the `href`; the owner tests on a phone).
- Instagram placeholder shows with `data-todo`; with a temporary non-empty value (not committed) it becomes a real link.
- `grep -ri tomato frontend` shows no claim about her chutney. `npm test` and `npm run build` pass.
- Merge to `main`, push, confirm the deploy ran.

## Tracker checklist to add

- [ ] Phone, WhatsApp and Instagram links (placeholder for Instagram)
- [ ] Sauce tile copy and alt text corrected
- [ ] Sauce images wired (or placeholders noted)
- [ ] Verified, merged to `main`, deploy confirmed

## Report

Use the report format in `CLAUDE.md`. Include every file that contains the phone number, and say whether the sauce images were present.
