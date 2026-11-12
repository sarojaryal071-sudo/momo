# Step 4e — Admin tactile and glass look, one-row buttons, clean URLs (decision D-060)

Prerequisite: Step 4d is merged (it is). Merge `origin/main` first. Read `CLAUDE.md` (rules still apply), D-039, D-041, D-044, D-050, D-060 and `docs/design/type-and-spacing-spec.md` section 5. Owner rules for the session: write the code, run the build once and only the tests for files you changed, no screenshot matrix; own check at 390 px for the admin pages you touched, and say plainly what you did and did not check. No visible demo, sample or TODO wording.

## 1. Buttons on one row

On every admin page, groups of actions that fit sit **on one row**: for example Save and Delete on each pickup row, the Save and Cancel pairs in forms and dialogs, order card actions. Use a flex row with a small gap and wrap only when it does not fit; never leave one full-width button under another on a phone when both fit side by side. Equal height, labels centred, 44 px tap targets, destructive action visually secondary. Check the Pickup page first (Day, From, To, In use, then Save and Delete in one row).

## 2. Tactile 3D buttons and toggles (admin only)

- **Primary buttons:** emerald face with a slightly lighter top edge highlight, a darker emerald bottom edge (about 0.2rem, as a token) and a soft shadow, so the button looks raised. Pressed: moves down about 2 px, the bottom edge shrinks, shadow tightens. **Secondary buttons:** white face, emerald text, hairline border plus a light raised bottom edge. **Destructive:** same raised style with a red-tinted edge. Disabled: flat, muted, no edge. Loading: keep the label and add a spinner.
- **Toggle switches:** a track with an inset shadow and a raised round thumb with a soft shadow and a hairline highlight; on state emerald, off state grey, with the On or Off text beside it so colour is never alone; thumb slides 0.18 s.
- Segmented controls, chips, dropdown triggers and the icon buttons (Log out) get the same raised treatment at a lighter strength.
- All values are tokens in the admin token layer (edge height, edge colours, shadow, press distance). Movement only under `prefers-reduced-motion: no-preference`; under reduce, colour change only. Text and edge contrast at least 4.5:1 and 3:1 for the control boundary. Keyboard focus ring stays visible (2 px, offset).

## 3. Glass in the admin

Use the existing glass tokens from the customer site (translucent surface, blur, hairline border, soft inner highlight): top bar, bottom tab bar (content scrolls under it; keep the bottom padding), More menu, confirm dialogs and sheets (with a dimmed blurred backdrop), toasts and the paused strip. Order, product and settings cards and all form areas stay **solid white** with hairline borders so text stays readable. At most one blurred layer is visible at a time except the two bars. Add the same soft light background the customer site has behind the admin content only if it can be done without gradients or blur on the content; otherwise skip it and say so. Provide a solid fallback when `backdrop-filter` is not supported.

## 4. Clean URLs (public site and admin)

- No visible `index.html` or `.html` anywhere: pages are `/momo/`, `/momo/shop`, `/momo/cart`, `/momo/done`, `/momo/how-to-cook`, `/momo/admin/`, `/momo/admin/orders`, `/momo/admin/prep`, `/momo/admin/products`, `/momo/admin/pickup`, `/momo/admin/settings`, and so on for the other admin pages (login, reset). GitHub Pages serves `shop.html` at `/shop`; keep the files as they are and change the links.
- Update every internal link (`href`, form actions, `location` assignments, redirects after login and logout, service-worker or manifest `start_url` if present) to the clean form using relative paths (`./`, `shop`, `../`) or paths built from `SITE_URL`. Home links go to `./` (or the folder), never `index.html`.
- Update canonical URLs, Open Graph URLs, JSON-LD, `sitemap.xml` and `robots.txt` generation in `scripts/build.mjs` to the clean form; make the build fail if any output page still links to `index.html` or `.html` (add a small check).
- If someone opens an old `.html` or `index.html` address, a tiny shared script strips it with `history.replaceState` so the address bar shows the clean form (no redirect loop, no flash).
- Make sure local preview and the tests serve the clean URLs the same way (extensionless), and that the 404 page still works.

## Do not

Change the public site's look (D-044 stays), add libraries or gradients, touch the database, or start Step 5.

## Report

Under 25 lines: what changed, files changed, what was and was not checked, and anything the owner should test (Pickup page buttons on one row; toggles and buttons feel raised and press down; glass bars and menu; open `/momo/`, `/momo/shop`, `/momo/admin/`, `/momo/admin/orders` and an old `.html` address).
