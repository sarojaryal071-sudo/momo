# Step 4p — New logo everywhere (D-068) and sauce pictures (D-069)

Prerequisite: merge `origin/main` first. Any earlier step may already be merged. Read `CLAUDE.md`, D-068, `docs/ui-rulebook.md` (header and image rules) and `docs/design/logo/logo-source-transparent.png` (look at it). Session rules from the owner: write the code, run the build once and only the tests for files you changed; look at your own screenshots.

The source is one transparent PNG of the full lockup (mark on top, wordmark, tagline). It is a rendered image, not a vector. Do not trace it by hand and do not redraw it.

## Make the assets (in `scripts/build.mjs` or a one-off script run by the build, with `sharp`; commit the outputs only if the build does not make them)

1. **Full lockup:** trim transparent edges, then export `logo-full.webp` at widths 240, 480 and 960 px plus a PNG fallback only if a surface needs one. Keep transparency.
2. **Mark only:** crop the dumpling, steam and wave (everything above the wordmark, with a little padding) and export `logo-mark.webp` at 64, 128 and 256 px.
3. **Icons:** from the mark build `favicon-32.png`, `favicon-180.png` (apple touch, on a solid off-white or emerald square, centred with padding, no transparency) and `icon-512.png`; keep `favicon.svg` only if it is still correct, otherwise remove it and its links. If the cropped mark is not crisp at 32 px, say so in the report and use it at the largest size that stays clear (do not invent a new drawing).
4. **Share image:** rebuild the Open Graph / share image (1200x630) with the full lockup centred on the page's off-white; keep its existing size rules.

## Place them

- **Header:** the mark at small widths (phones) next to nothing else, or the mark plus the lockup at wide widths, whichever stays within the fixed header height and tap-target rules; the logo links home and has the accessible name of the shop. Header height must not grow.
- **Footer and the full-screen menu:** full lockup, sized with fluid tokens.
- **Receipt / done page:** a small mark or lockup at the top; it must print clean (no tint behind it).
- **Admin:** login page (full lockup above the form, replacing the old one), admin header or Home (mark only).
- **Browser tab and home-screen icons**, `<meta name="theme-color">` stays the emerald, and the structured data `logo` field (if any) points at the new full-size file on `SITE_URL`.
- Every image has real width and height attributes (no layout shift), `alt` text is the shop name, and nothing is lazy-loaded above the fold.

## Rules

Relative paths or `SITE_URL`; no pixel sizes outside token definitions; no new colours; do not alter the logo's colours, spelling or shape; the blurred patch background from Step 4o must not clash (check the logo sits cleanly on it if 4o is merged). Remove the old logo files and any references once nothing uses them.

## Verify and report

Look at screenshots at 390 and 1440 px of home (header, footer, menu open), the receipt and the admin login; check the favicon renders in a tab. Under 15 lines: files made, where each is used, anything not crisp at small size, old files removed. Merge to `main` and confirm the deploy.

## Part 2 — Sauce pictures (decision D-069)

`photo-sauce.webp` is the owner's real photo of the **hot sauce** (red-orange). The normal momo sauce, the chutney, is **turmeric yellow** and has no picture yet. Today the red photo is wrongly used as a generic sauce picture. Fix:

1. **Home Sauces tile:** keep the red photo but make it honest: alt text "A bowl of homemade red hot sauce", and a short visible caption under or beside it ("Hot sauce"). If `frontend/assets/img/photo-chutney.webp` exists (see 3), show it beside the red one as a second framed photo with the caption "Chutney", both within the tile without growing the tile height or causing horizontal scroll at 390 px.
2. **Admin add-on fallback** (`admin/js/products.js`, `SAUCE_PICTURE`): the red photo must not be the fallback for every add-on. Remove that fallback. Add-ons without their own photo show the same neutral drawn placeholder as the public shop. Make the seed `hot-sauce-pot` use `photo-sauce.webp` as its picture (public card, dialog and admin list), and `chutney-pot` keep the placeholder until it has its own picture.
3. **Chutney picture:** the owner will add `frontend/assets/img/photo-chutney.webp` (turmeric yellow chutney) later, through this step or through the admin photo upload. Write the code so that when that file exists it is used for `chutney-pot` in the home tile and the public card with no other change; when it does not exist, nothing breaks and no red picture appears for the chutney. Do not draw or generate a yellow picture yourself.
4. `docs/design/image-manifest.md`: correct the `photo-sauce.webp` row (hot sauce, red, tied to `hot-sauce-pot`) and add a `photo-chutney.webp` row marked "owner to supply, turmeric yellow".
5. Alt text must match what is in the picture; no invented claims about ingredients or spice level.
