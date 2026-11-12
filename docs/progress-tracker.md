# Progress tracker

The coding agent updates this file at the end of every phase (see `docs/usage-rules.md` section 7). Trust it instead of re-exploring the repository. Edit only the lines that changed.

- Last updated: 2026-11-12 (Step 3b, coding agent)
- Current step: **Step 3 code built and merged; waiting for the owner actions in `backend/README.md` section 2 to 4. The site still runs on demo data (`SITE_BACKEND` unset)**
- Next action: owner follows `backend/README.md` section 3 (a to g), then the live checks and `SITE_BACKEND=supabase`; then Step 4bc.

Legend: `[ ]` not done, `[x]` done. For every ticked item add: commit hash, one-line evidence.

## Planning (done by the planning chat)

- [x] `CLAUDE.md`, decisions log, four rulebooks, step files 0 to 5, usage rules, this tracker — pushed to `main`

## Step 0 — Scaffold and deploy pipeline

- [x] `css/` moved into `frontend/css/` with `git mv`, tokens unchanged — 1a8763b, `git mv` rename, files unchanged
- [x] Folder tree created (`frontend/`, `admin/`, `backend/supabase/{migrations,functions}`, `scripts/`, `.github/workflows/`) — 1a8763b, folders present; `.gitkeep` in empty ones; `backend/README.md` one line
- [x] `package.json` (scripts `dev`, `build`, `test`; devDependency `sharp` only) and `.gitignore` — 1a8763b, `npm install` ok, lockfile committed
- [x] `scripts/dev.mjs` static server works — 1a8763b, `/`, `/css/theme.css`, `/css/base.css` return 200; path traversal returns 404
- [x] `scripts/build.mjs` v1: copy to `dist/`, `sitemap.xml`, `robots.txt`, `noindex` logic via `SITE_INDEXABLE` — 1a8763b, `dist/` has index.html, css/, sitemap.xml, robots.txt, admin/
- [x] Placeholder `frontend/index.html` (valid, `lang="en-GB"`, one `h1`) — 1a8763b, body background rgb(246,235,211), heading font from token
- [x] `.github/workflows/deploy.yml` (Pages via Actions, concurrency group `pages`) — 1a8763b, written; not yet run (needs Pages source switch and merge to `main`)
- [x] `README.md` updated with run and build commands — 1a8763b
- [x] Verified: dev server, build output, noindex behaviour (see log) — 1a8763b, see log
- [ ] Owner switched Pages source to GitHub Actions and set variables; live deploy confirmed

## Step 1 — Static pages

- [x] Fluid tokens (D-022): `theme.css` type, space, layout and control scales; `base.css` token-only — 40f5af1, 360 px and 1280 px render fine, no horizontal overflow
- [x] Shared header and footer, `components.css` — 40f5af1
- [x] `index.html` (hero, taste-of-home passage, packs, how ordering works, contact) — 40f5af1
- [x] `shop.html` with `<!-- build:products -->` region and chalkboard menu panel — 40f5af1
- [x] `how-to-cook.html` with `TODO:` for steam time — 40f5af1
- [x] `products.seed.json` and `content/products/<slug>.json` for the two momo packs — 40f5af1
- [x] Placeholder images in place; list of image slots delivered in the report — 40f5af1
- [x] SEO basics on every page, JSON-LD, build validations (title, description, canonical, one `h1`) — 40f5af1
- [ ] Verified (partial: local only): 360 px and desktop, source shows content without JS, Lighthouse, contrast ratios

## Step 1b — Visual upgrade ("Made together", D-024, D-025)

- [x] Fluid tokens extended — 2ec61ed, theme.css: display step, band/ridge/fold/steam/numeral/tag/motion tokens, ring colours
- [x] Display font self-hosted with licence — 2ec61ed, Young Serif (SIL OFL), 26,992 bytes woff2 + OFL text, swap, Times-matched fallback (size-adjust 120.6%)
- [x] SVG motifs (fold, ridge line, steam, kraft tag) — 2ec61ed, fold, ridge, steam, kraft-tag: 1,554 bytes total, used as masks on currentColor
- [x] Home page rebuilt to the copy spine — 2ec61ed, exact brand-direction strings; [CONFIRM] items are `data-todo`
- [x] Shop, how to cook, cart, done, header and footer updated — 2ec61ed, fold-bordered chalkboard, kraft price tags, ridge above footer, wordmark; behaviour and markup hooks unchanged
- [x] Image slots wired — 2ec61ed, srcset + fixed aspect-ratio + width/height; placeholders kept
- [x] Motion (two effects, reduced-motion safe) — 2ec61ed, steam drift + scroll-driven fade-in; both off under reduced motion
- [x] Verified and merged to `main` — 2ec61ed, see log; deploy status recorded in the log

## Step 1c — Rebuild the look to the approved reference (D-026)

- [x] White page, cream demoted, grain removed — 03a6944, `--white` page, cream only on the ordering and how-to-cook bands, grain removed (now only on chalkboard and kraft tags)
- [x] Header and footer to the reference — 03a6944, white header with wordmark, Shop, How to cook, cart icon and red badge; charcoal footer bar with phone glyph and ridge above
- [x] Hero band with overlapping cut-out slot and ridge line — 03a6944, turmeric band, charcoal ridge line, cut-out slot bleeds right and overlaps the charcoal band, steam wisps
- [x] Made together band, steps, chutney band, statement, chalkboard with kraft tag, ordering — 03a6944, charcoal band, red numerals row (container query), turmeric chutney band, centred statement, board with overlapping kraft tag, centred ordering
- [x] Other pages aligned — 03a6944, shop, how to cook, cart, done on white with the same header and footer; fields white with charcoal border
- [x] Cut-out image slots with honest placeholders — 03a6944, cutout-hero 1200x1200, cutout-momo 800x800, cutout-chutney 800x800 (transparent placeholders with labels); kitchen slot kept on how-to-cook
- [x] Verified, merged to `main`, deploy confirmed — 03a6944, see log

## Step 1d — Hybrid premium rebuild (D-027, D-028)

- [x] Emerald & Copper tokens in; retired tokens removed — 3826637, theme.css rebuilt on the D-027 palette plus radius, shadow, card and motif tokens; coriander, clay, cream, cream-light, chalk and chutney-dark removed (grep finds none)
- [x] Header and footer rebuilt (footer columns, ridge line) — 3826637, white header with fold mark, nav, phone, cart badge; emerald four-column footer with sage ridge line above and (c) line
- [x] Hero panel with cut-out slot, trust row — 3826637, green-tint rounded panel, cut-out overlaps its base with drop shadow, steam wisps, sage ridge, four-item trust row with drawn icons
- [x] Product cards on home and shop; `HOME_PRODUCT_LIMIT`, `SEARCH_MIN_PRODUCTS` constants; chips and search thresholds — 3826637, cards from data with photo or drawn placeholder; constants in site-config.js (HOME_PRODUCT_LIMIT 8, SEARCH_MIN_PRODUCTS 8, KIND_LABELS); chips with 2+ kinds, search at 8+, empty state, ?kind= from footer links
- [x] Two tiles, Made together band, steps with illustration, statement, ordering row — 3826637, emerald Pickup tile + peach chutney tile, emerald Made together band with kitchen photo, copper-numeral flow with step cut-outs and drawn arrows, statement, peach-tint ordering row with kraft tag
- [x] Cart, done, how to cook aligned — 3826637, same header, footer and palette; fields white with emerald border; how-to-cook uses the kitchen photo
- [x] Image slots and intentional placeholders — 3826637, all manifest images wired (hero, momo packs with multiply, chutney, steps, kitchen, plate on shop); sauce pots use drawn sage placeholders; old placeholder-kitchen files deleted
- [x] Verified, merged to `main`, deploy confirmed — 3826637, see log

## Step 1e — Contact links, sauce corrections and mobile fixes (D-029, D-030)

- [x] Mobile header: one line with menu button; cart icon always visible — b0c3ec2, 53 px single line at 360 px on all five pages; cart icon and badge outside the menu; menu button opens, closes on Escape, link tap and outside tap, focus moves in and back; wide header unchanged
- [x] Compact product cards on phones — b0c3ec2, image-left rows (about 190 px) below 48em, vertical grid cards from 48em; classes and data hooks unchanged
- [x] "Added" state and sticky checkout bar — b0c3ec2, button says Added for 1.6 s, live region announces it; fixed bar "N items · £X" (count only if a price is unknown) with Go to checkout; absent on cart and done
- [x] Home section spacing — b0c3ec2, one --section-gap between sections via .flow; coloured bands pad their own content; sauce tile no longer touches Made together
- [x] Phone, WhatsApp and Instagram links (placeholder for Instagram) — b0c3ec2, wa.me/447413069241 in menu, footer, home ordering row, cart and done; Instagram line filled by build.mjs from siteConfig.socialLinks.instagram (empty = data-todo placeholder; tested with a temporary value)
- [x] Sauce tile copy and alt text corrected — b0c3ec2, "The sauces", copy from brand-direction item 4; no tomato claims left (grep clean); shop photo alt says red sauce
- [x] Sauce tile uses `photo-sauce`; product cards keep placeholders unless sauce cut-outs exist — b0c3ec2, framed rounded photo-sauce.webp, max 16rem; old red cutout-chutney files deleted; cutout-chutney (yellow) and cutout-hot-sauce were NOT present after the merge, so sauce cards keep drawn placeholders
- [x] Verified, merged to `main`, deploy confirmed — b0c3ec2, see log

## Step 1f — Product details window, options, stock and custom lead time (D-031)

- [x] Small cards with Add and compact stepper — 38debc9, 108 px cards at 360 px (six fit one screen); one small Add; plain items swap to a compact - 1 + stepper and back at 0; sold-out card has no button; also fixed: home cards had no script before (shop.js now loads on home)
- [x] Details dialog (info, options, stock line, live total, allergy line) — 38debc9, native dialog per product, bottom sheet on phones and centred panel from 48em; focus in and back, Escape and backdrop close, page scroll locked, live total, customised note with earliest pickup, Only N left, stock cap, allergy line
- [x] Seed data for options and stock; constants `LOW_STOCK_THRESHOLD` and `CUSTOM_MIN_LEAD_HOURS` — 38debc9, stock_quantity and option_groups in products.seed.json (sample, flagged); LOW_STOCK_THRESHOLD 5 and CUSTOM_MIN_LEAD_HOURS 48 in site-config.js; products.json carries both; launch gate also catches stock_placeholder
- [x] Cart lines with options, customised lead time in the pickup picker, WhatsApp message with options — 38debc9, options stored as non-default ids per line, separate lines per option set, Customised label, compact stepper, stock cap message, date list uses the 48 h notice only for customised carts (checked with a fake Friday clock), WhatsApp and done page list options
- [x] Verified, merged to `main`, deploy confirmed — 38debc9, see log

## Step 1g — UI polish and the new order flow (D-036, D-038, D-039)

- [x] Glass and motion tokens — d0ae572, theme.css: glass, raised/pressed shadow, motion and sheet tokens; glass only on header, menu, dialog and backdrop, checkout bar; solid fallback behind @supports; no gradients
- [x] Modal sheet: fixed header and footer, compact photo, scrolling middle, animation — d0ae572, 85dvh bottom sheet on phones, fixed header (thumbnail, name, price, close), only the middle scrolls, fixed footer with notes, stepper and Add to cart; swipe, backdrop, Escape and close button close it; centred 34rem dialog from 48em
- [x] Tactile option buttons and press states — d0ae572, raised tiles with spring tick or dot, press-down on tiles, buttons, steppers and chips; movement only under prefers-reduced-motion: no-preference
- [x] Menu glass panel and focus fix — d0ae572, glass panel with slide and fade; focus goes to the panel on touch (no ring) and to the first link on keyboard (ring); even 53 px rows
- [x] Hour and minute pickup lists, `PICKUP_STEP_MINUTES` — d0ae572, two selects after the date, window text, minutes follow the hour, PICKUP_STEP_MINUTES = 1 and seed slot_minutes 1, customised notice still applied
- [x] Name and phone required, phone echoed back, "Place order" — d0ae572, inline errors, aria-invalid, UK phone check, "We will message you on 07413 069241", button reads Place order
- [x] "Order received" screen, failure path, no automatic WhatsApp — d0ae572, drawn check, Order received, not-confirmed highlight, summary, three steps, contact; no automatic WhatsApp and no Open WhatsApp order button; failure shows the WhatsApp message button and keeps the cart
- [x] Verified, merged to `main`, deploy confirmed — d0ae572, see log

## Step 1h — Receipt, full-screen menu and pill options (owner request after Step 1g)

- [x] Paper receipt on the Order received screen, with print / save as PDF and download — 527c5fc, white paper with zigzag edges, typewriter face, dashed rules, order number, placed time, name, pickup, option lines, total; Print or save as PDF (window.print with a print-only receipt) and Download receipt (.txt)
- [x] Full-screen animated menu with 3D pills (emerald palette) — 527c5fc, phone menu is a full-screen emerald overlay that opens with a circle reveal, staggered 3D pills, ridge line, X button; focus bug fixed (keyboard vs pointer tracked); wide header unchanged
- [x] Compact 3D pill options in the product window — 527c5fc, options are wrapped compact pills with a solid edge, tick that springs in, tap again to remove; press-down state
- [x] Verified, merged to `main`, deploy confirmed — 527c5fc, see log

## Step 1i — Glass pills fix: menu, product sheet, options (D-040, D-041)

- [x] Glass pill tokens and press state — 3bdb668, theme.css: on-light and on-dark pill fills, borders, highlight, shadows, glass-emerald layer, scrim, close size; no thick edges; press moves down --depth (movement only under no-preference)
- [x] Full-screen menu: tinted glass layer, visible X and wordmark, centred pills, contact group — 3bdb668, emerald-tinted glass layer (90%, blur), own top bar with wordmark, cart and 48 px glass X, centred on-dark pills (min(100%, 22rem)), current page marked with a dot, Get in touch group, ridge; Tab stays inside the layer; X, Escape, link tap and tap outside close it
- [x] Product sheet: focus fix, light glass, content height, pinned footer — 3bdb668, panel gets focus on touch (no ring on X), keyboard goes to X; light glass sheet sized to content up to 85dvh, pinned footer, light emerald scrim with blur
- [x] Option pills and stepper restyled — 3bdb668, on-light glass pills, selected solid emerald with spring tick, pill stepper with round 44 px buttons and dimmed disabled minus
- [x] Filter chips and card controls match — 3bdb668, chips, card Add to cart and stepper share the glass pill and press feel
- [x] Checked in own screenshots, merged to `main`, deploy confirmed — 3bdb668, see log

## Step 1j — Cart on desktop and the ambient background (D-042)

- [x] Stepper content width; cart line grid and two-column wide cart — 5e30314, `.cart-info` is the only growing block, `.stepper` is flex none; lines are a 4-column grid from 30rem of list width (name / stepper / price / Remove); two-column cart (lines and total left, solid details card right, max 70rem) from 52rem of page width; checked at 1440, 1024, 768 and 390 px
- [x] Ambient background layer with tokens and kill switch — 5e30314, body::before fixed layer, three radial spots from palette tokens, `--ambient-opacity` 0.18 (set to 0 to turn off); hidden for print, prefers-reduced-transparency and prefers-contrast: more
- [x] Checked in own screenshots, merged to `main`, deploy confirmed — 5e30314, see log

## Step 1k — Typography and a calmer look (D-043, D-044)

- [x] Fonts self-hosted with fallbacks and preloads; Young Serif removed — a2d6d55, Instrument Serif (21,032 B) and Hanken Grotesk variable (34,704 B) with measured fallbacks (81.6% and 99.7% size-adjust), preloaded on every page; Young Serif and its licence deleted
- [x] Roles, bigger display scale, section labels — a2d6d55, serif only for h1, h2, statements and numerals; sans for body, h3, product names, prices (tabular), forms and buttons; display tokens 3.5-8rem hero, 2.4-4.5rem h2; uppercase labels above each section
- [x] Section rhythm and calmer cards and buttons — a2d6d55, section gap clamp(4rem..8rem); hairline cards with shadow on hover only (hover: hover); flat emerald buttons; tags, copper rules and kraft tag file removed
- [x] Ambient layer and extra glass removed (glass only on menu and sheet) — a2d6d55, ambient layer and tokens gone; header, checkout bar, chips, Add and stepper solid; backdrop-filter only on the menu layer and pills, the sheet, its backdrop and its option pills; unused tokens deleted
- [x] Checked in own screenshots, merged to `main`, deploy confirmed — a2d6d55, see log

## Step 1l — Klandestina typography, density and no visible placeholders (D-050, D-051, D-052)

- [x] Fonts switched to Bebas Neue and Space Grotesk, old fonts removed (public and admin) — 96c6bab, Bebas Neue 400 + Space Grotesk variable (36 kB woff2), OFL texts added, Instrument Serif and Hanken removed; computed fonts checked on public and admin
- [x] Visible placeholders and demo data removed; `data-pending` gate in place — 96c6bab, all visible sample/demo/TODO wording removed from 5 public and 6 admin pages (text scan clean); `data-pending` and `"pending": true` gate checked by the indexable build; admin starts empty with "No orders yet"
- [x] Audit table and new type and spacing tokens; old `--step-*` removed — 96c6bab, audit before/after in the report; `--text-*`, `--section-space`, admin tokens in theme.css; `--step-*`, `--display-*`, `--band-pad`, `--section-gap` removed
- [x] All public components switched to the tokens — 96c6bab, header, menu, hero, trust row, cards, sheet, tiles, steps, statement, footer, shop, cart, done, how to cook, receipt switched (screenshots at 390 and 1440)
- [x] Hero and sections at the new density — 96c6bab, hero 538 px at 390 (first card name ends at 1013 px = 1.2 screens); hero panel 433 px at 1440; section gaps 40 to 80 px
- [x] Buttons, inputs, focus rings, loading state per spec — 96c6bab, buttons 0.9375rem, inputs 16px, 2px focus ring, "Placing order..." with aria-busy and disabled while saving
- [x] `--muted` token and contrast checked; `overflow-x` hacks removed — 96c6bab, `--muted` 7.2:1 on white and 6.3:1 on tints; no `overflow-x` hacks; no horizontal scroll at 320 to 1440
- [x] Checked in own screenshots, merged to `main`, deploy confirmed — 96c6bab, own screenshots checked; merge and deploy recorded in the log

## Step 2 — Cart and order flow (mock)

- [x] `site-config.js` (mock backend, WhatsApp number marked `TODO`) — 746822c, constants for limits, timeouts, mock; WhatsApp number comment `TODO` in code
- [x] `cart.js` with persistence and header count — 746822c, slug+qty in localStorage, header count on every page
- [x] Shop add-to-cart controls working — 746822c, qty control + add + live-region note; keyboard add worked
- [x] `cart.html` with totals, unavailable-item handling, empty state — 746822c, lines, totals, unavailable flagged and dropped, empty state
- [x] Optional order form with phone hint, honeypot, "Pickup only. Pay cash on pickup." — 746822c, all optional, hint, honeypot, pickup-only line
- [x] `pickup.js` and `data/pickup.seed.json` — 746822c, UK-time slots, lead time, max days, exceptions; seed is sample (D-023)
- [x] `order-gateway.js` (mock plus supabase stub, 8 s timeout) — 746822c, mock returns SS-TEST-01; supabase stub throws; 8 s timeout (tested)
- [x] `whatsapp.js` (message, link, UK phone conversion) — 746822c, message, wa.me link, trim notes, UK phone conversion
- [x] `done.html` with order number, summary, WhatsApp button — 746822c, order number, summary, big button, one auto-open after 1.5 s
- [x] `npm test` covers cart, price, pickup, WhatsApp, phone conversion — 746822c, 23 tests pass
- [ ] Verified (partial: local dev server only): full flow with empty and filled fields, failure path, keyboard run done locally; live URL and real-phone WhatsApp check pending

## Step 3 — Supabase backend and real orders (D-055)

- [x] Migrations: 5 files in (0005 publishes `orders` to Realtime, D-057) `backend/supabase/migrations/` (tables, indexes, `is_admin()`, RLS and grants on every table, `place_order`, `set_order_status`, `create_manual_order`, `full_pickup_dates`, storage bucket) — a3bcd18, applied on a local PostgreSQL 16 with a Supabase shim; not yet run on the real project
- [x] Seed data as migration 0004 (D-055 replaces `seed.sql`): 2 real products, sauces unpriced and hidden, option groups, settings, pickup rules, notice and site_status rows — a3bcd18, re-run is a no-op
- [x] `place-order` edge function (shape check, honeypot, per-IP rate limit, DB rules; no email, D-056) — a3bcd18, request checks tested; function itself not deployed
- [x] `trigger-rebuild` (admin session only) and `build-status` (token) functions; **no database webhook** (D-055: an explicit Publish action) — a3bcd18, not deployed
- [x] Frontend: Supabase gateway, runtime pickup rules, settings, stock and full dates, `notice.js` — a3bcd18, gateway tests with a faked fetch
- [x] `build.mjs` fetches products and photos, merges content, fills regions, writes `products.json`, injects public config; `SITE_BACKEND` variable is the one switch — a3bcd18, tested against a fake Supabase
- [x] Admin on Supabase: `api-supabase.js` (Auth, RLS reads, RPC status changes), vendored `supabase-js` 2.118.0, demo admin left out of a Supabase build — a3bcd18, not run against a real project
- [x] Backend tests: `backend/tests/run-local.sh` (158 checks: RLS per table, tampered prices and options, sold out, lead times, pause, daily limit, status and stock exactly once, simultaneous orders) — a3bcd18, passed locally before the last doc edits
- [ ] Owner actions: GitHub token, `BUILD_STATUS_TOKEN`, `ALLOWED_ORIGINS` (no email, D-056); run the 5 migrations; deploy the functions; add the admin row (see `backend/README.md`)
- [ ] Live checks (need the owner actions): real order saved, Publish rebuilds, then set `SITE_BACKEND=supabase`

## Step 3b — Backend deploys itself (D-058)

- [x] `.github/workflows/backend-deploy.yml` (push to main on `backend/supabase/**` and by hand; environment `production`; pinned CLI 2.122.0; link, guard, `db push`, functions deploy; skips cleanly without secrets) — fcfcbf0, YAML parses; the run itself happens when the owner adds the secrets (not testable here)
- [x] `scripts/check-migrations.mjs` guard and `tests/check-migrations.test.mjs` (4 tests; the real migrations pass) — fcfcbf0, 4 tests pass; migrations 0001 to 0005 contain nothing destructive
- [x] `backend/README.md` rewritten for the owner steps (access token, database password, three secrets, environment, first run, function secrets, admin SQL, `SITE_BACKEND`) — fcfcbf0, done; manual SQL route kept as a fallback
- [ ] First real run (needs the owner's three secrets; cannot be done from the agent's sandbox)

## Step 4 — Admin panel

- [ ] Login and session guard
- [ ] Orders by pickup date with status buttons
- [ ] Message customer (WhatsApp templates)
- [ ] Products: edit, availability, order, photo upload, add item
- [ ] Pickup rules and exceptions with preview
- [ ] Settings and notice banner
- [ ] CSV export
- [ ] Verified: phone-size login, order lifecycle, product change reaches the shop, anonymous and non-admin refused

## Step 4a — Admin: login, orders, prep list, messages, pause ordering (D-036, D-037, D-045, D-048)

- [x] Demo backend: `mock-backend.js` rules and store, `admin/js/api.js` with `mock` and a `supabase` stub, public mock gateway saves orders — 5f8da99, `frontend/js/mock-backend.js` (rules+store), `admin/js/api.js`, public gateway saves orders; order numbers SS-DDMM-NN
- [x] Admin shell (top bar, demo banner, bottom tabs and wide sidebar) and login with two demo accounts — 5f8da99, bottom tabs at 390 px, sidebar at 1440 px, demo banner; both demo logins work; logged-out URLs redirect
- [x] Orders by pickup date, new-order count and tab title, refresh every 60 s, status buttons through the rules — 5f8da99, live order from the shop appeared under its date; tab title "(4) Orders"; statuses walked through the rules
- [x] Message customer (editable template, address warning, phone check) — 5f8da99, texts read for confirmed, ready, cancelled; address warning; invalid phone disables the button
- [x] Prep list with totals per product and option, printable — 5f8da99, 14 Nov: chicken x4, veg x4, hot sauce x1, customised x2; prints on 1 A4 page
- [x] Settings: pause ordering, WhatsApp templates, pickup address text — 5f8da99, pause shown on public cart and order refused; address and templates save
- [x] Tests for the mock rules — 5f8da99, `npm test` 49 pass (12 mock rules, gateway, whatsapp templates)
- [x] Checked in own screenshots, merged to `main`, deploy confirmed — 5f8da99, screenshots at 390 and 1440 px opened and checked; merge/deploy recorded in the log

## Step 4a2 — Admin UI polish (D-049, D-050)

- [x] Slim top bar with Log out icon and confirm (D-053, no hamburger), paused strip, bottom padding — 8063e98, 56 px bar with wordmark and menu (Log out inside), amber paused strip with Resume on every page, bottom padding 80 px above the 65 px tab bar
- [x] Form controls: no overflow, aligned fields, toggle switch — 8063e98, no overflow at 320, 375, 390, 414 and 1440; date fields equal width in a two-column grid; role="switch" toggle works by tap, Space and Enter
- [x] Orders: two dropdowns (Status, When with Custom range, saved across reloads), new card layout with primary next action and More menu — 8063e98, first order card with status badge and Confirm button fully visible at 390x844 (bottom 573, tab bar top 779); chips scroll inside their rows; More menu and in-page cancel confirmation work
- [x] Prep list: day chips, clear result layout, print — 8063e98, day chips with counts, opens on 14 Nov (first day with orders), quantities large, options indented, prints on 1 A4 page
- [x] Settings: toggle, readable card headings — 8063e98, switch, 1rem card headings, "Saved. Ordering is paused now." and the strip appears at once
- [x] Checked in own screenshots, merged to `main`, deploy confirmed — 8063e98, own screenshots at 390 and 1440 checked; merge and deploy recorded in the log

## Step 5 — SEO, hardening and launch checks

- [ ] SEO audit of every public page fixed
- [ ] Structured data validated
- [ ] Social preview image and favicon
- [ ] Spam protection reviewed (Turnstile if needed)
- [ ] Performance and accessibility passes
- [ ] Security review (policies, secrets history, CORS, sign-ups disabled, admin CSP)
- [ ] `privacy.html`, `terms.html`, `allergens.html` drafts (noindex, `TODO:`)
- [ ] `docs/domain-move.md` and `docs/launch-checklist.md`
- [ ] Verified: full test order, Rich Results Test, Lighthouse, indexable build fails on `TODO:`

## Owner actions

- [ ] Switch Settings, Pages, Source to **GitHub Actions** after Step 0 builds
- [ ] Add repository variables `SITE_URL` (`https://sarojaryal071-sudo.github.io/momo`) and `SITE_INDEXABLE` (`false`)
- [ ] Confirm +44 7413 069241 is also the WhatsApp number
- [ ] Decide order number date format: MMDD or DDMM (decision D-007)
- [ ] Real sauce pot prices, steam time, pickup hours and capacity (sample values in use, D-023; each marked `data-placeholder` or `"placeholder": true`)
- [x] Supabase project, one admin user, `SUPABASE_URL` and `SUPABASE_ANON_KEY` variables (done by the owner)
- [ ] GitHub dispatch token, `BUILD_STATUS_TOKEN` (Supabase secrets; and a GitHub secret for the last), `ALLOWED_ORIGINS`; run migrations, deploy functions, add the admin row; then set the `SITE_BACKEND` variable (`backend/README.md`)
- [ ] Generate AI mood images for the slots listed after Step 1

## File map (agent keeps current, one line per file or folder)

| Path | Purpose | Step |
|---|---|---|
| `CLAUDE.md` | Agent instructions, auto-loaded | planning |
| `docs/` | Decisions log, rulebooks, usage rules, this tracker, `instructions/step-0` to `step-5` | planning |
| `PROJECT_NOTES.md` | Human overview | planning |
| `frontend/css/base.css`, `frontend/css/theme.css` | Base styles and tokens | 0 |
| `admin/` , `backend/supabase/{migrations,functions}` | Empty (`.gitkeep`); `backend/README.md` is one line | 0 |
| `package.json`, `package-lock.json`, `.gitignore` | Scripts dev/build/test, `sharp` only | 0 |
| `scripts/dev.mjs` | Static dev server (`frontend/` at `/`, `admin/` at `/admin/`, port 8080 or `PORT`) | 0 |
| `scripts/build.mjs` | Build v1: copy to `dist/`, noindex, sitemap, robots | 0 |
| `.github/workflows/deploy.yml` | Pages deploy on push to `main` and manual | 0 |
| `frontend/{index,shop,how-to-cook}.html` | The three public pages, hand-written, shared header/footer copied in | 1 |
| `frontend/js/shop.js` | Cards: Add, stepper, details dialog, chips and search (loaded on home and shop) | 1f |
| `frontend/js/menu.js`, `checkout-bar.js`, `js-flag.js` | Phone menu, sticky checkout bar, early `js` class (no flash) | 1e |
| `frontend/css/motifs.css` | Motif masks, hero panel, trust row, tiles, Made together, fold flow, ordering row, steam, reveal | 1b-1d |
| `frontend/assets/img/` | AI mood images per `docs/design/image-manifest.md` (cut-outs, two pack shots, two scenes) plus `placeholder-og.webp`; replace with real photos later | 1d |
| `frontend/assets/svg/` | fold, ridge, steam, kraft-tag, arrow motifs; art-momo and art-bowl placeholder drawings | 1d |
| `frontend/assets/fonts/` | Young Serif latin woff2 (27 KB) and its OFL licence | 1b |
| `frontend/assets/svg/` | fold, ridge, steam, kraft-tag SVG motifs | 1b |
| `frontend/css/components.css` | Buttons, header, footer, forms, notice, chalkboard, layouts; tokens only | 1 |
| `frontend/data/products.seed.json`, `frontend/content/products/*.json` | Seed products and momo copy | 1 |
| `frontend/assets/img/placeholder-*.webp`, `assets/icons/favicon.svg` | Flat-colour placeholder images and favicon | 1 |
| `scripts/lib/render.mjs` | Renders the `build:products` regions (product cards, shop chips and search, empty state) and Product JSON-LD | 1, 1d |
| `tests/regions.test.mjs` | Checks the source fallback regions match the seed | 1 |
| `frontend/cart.html`, `frontend/done.html` | Cart with order form; confirmation with WhatsApp button; both `noindex` | 2 |
| `frontend/js/site-config.js` | Backend choice, WhatsApp number, limits, timeouts (single config place) | 2 |
| `frontend/js/cart.js`, `main.js` | Cart store, lines and totals, `formatPrice`, header count | 2 |
| `frontend/js/shop.js`, `cart-page.js`, `done.js`, `data.js` | Page scripts and data loading (products.json, seed fallback) | 2 |
| `frontend/js/pickup.js`, `data/pickup.seed.json` | Pickup dates and times; sample hours | 2 |
| `frontend/assets/fonts/` | Bebas Neue 400 and Space Grotesk variable woff2 with OFL texts (D-051) | 1l |
| `.github/workflows/backend-deploy.yml`, `scripts/check-migrations.mjs` | Backend auto-deploy and the destructive-change guard (D-058) | 3b |
| `backend/` | `supabase/migrations` (4 files), `supabase/functions` (place-order, trigger-rebuild, build-status, _shared), `config.toml`, `tests/` (local PostgreSQL tests), `README.md` (owner guide) | 3 |
| `frontend/js/supabase-rest.js`, `notice.js` | Public REST and function calls with the publishable key; site notice strip | 3 |
| `admin/js/api.js`, `api-supabase.js`, `api-mock.js`, `vendor/` | Admin data layer picks Supabase or mock; pinned supabase-js | 3 |
| `scripts/lib/supabase.mjs` | Build-time product and photo fetch | 3 |
| `frontend/js/mock-backend.js` | Demo backend rules and localStorage store, shared by shop and admin (D-048) | 4a |
| `admin/` (`login/index/prep/settings/products/pickup.html`, `js/`, `css/admin.css`) | Admin on `api.js` (mock now, supabase stub); products and pickup are placeholders | 4a |
| `frontend/js/order-gateway.js`, `whatsapp.js` | Mock/supabase gateway with timeout; message, link, phone conversion | 2 |
| `scripts/lib/validate.mjs` | Launch blockers: `TODO:`, `data-placeholder`, `"placeholder": true` | 2 |
| `tests/{cart,pickup,whatsapp,gateway,launch-gate}.test.mjs` | Unit tests for Step 2 and the launch gate | 2 |

## Test and run commands (agent fills in once they exist)

- Dev server: `npm run dev` (http://localhost:8080/)
- Build: `npm run build` (env `SITE_URL`, `SITE_INDEXABLE`)
- Unit tests: `npm test` (23 tests: regions, cart, pickup, whatsapp, gateway, launch gate; the launch-gate test runs two builds)
- Backend tests: _not yet_

## Verification log (append one line per check: date, step, what was run, what was seen)

- 2026-11-10, planning: docs pushed, no code yet.
- 2026-11-11, step 1k: `npm test` 33 pass, `npm run build` passes (no test changed). Own screenshots of home, shop, cart, done and how to cook at 390 and 1440 px, plus the open menu and sheet at 390 px, opened and checked. Hero h1 fits at 360 px (269 of 318 px panel, no horizontal overflow, 60.8 px). Forms and buttons use Hanken Grotesk. With the font files delayed 1.8 s the h1, lead and hero heights are identical before and after load (390: 120 / 94 / 713 px, 1440: 243 / 74 / 501 px) and CLS is 0.0000. backdrop-filter appears only in the menu, the sheet and its option pills. Fonts 21,032 B + 34,704 B = 55,736 B. Home at 390 px: 311 KB raw before scrolling over 26 requests (326 KB after a full scroll, 27 requests); gzip estimate is meaningless for the WebP images. Labels: emerald on white 9.88, on green-tint 8.73, on peach-tint 8.67, on peach 5.22; peach on emerald 5.22.
- 2026-11-10, step 1j: `npm test` 33 pass, `npm run build` passes (no test changed). Cart: steppers are 137 px wide and share one x per column at 1440 (518), 1024 (234) and 768 (400); at 390 the lines wrap as before; two columns at 1440 and 1024 (form card 352 px with the card shadow), single column at 768 and 390; h1 sits 58, 53, 45 and 34 px below the header; no horizontal overflow; form inputs now fill the card. Ambient: fixed layer, opacity 0.18, pointer-events none, z-index -1; with `--ambient-opacity: 0` computed opacity is 0; hidden in print and with prefers-contrast: more; CLS 0.0000 after a full scroll at 360 px. Contrast of charcoal on the strongest spot centre (emerald 18% over white): 11.70 (emerald text 7.20, chutney errors 4.35, only where an error sits on bare page in the top-left corner).
- 2026-11-10, step 1i: `npm test` 33 pass, `npm run build` passes (no test changed). Own 390 px screenshots opened and checked. Menu: wordmark, cart and a 48 px glass X at the top; pills centred (gaps about 180 px above and 200 px below the group, none of it flat colour); blurred page shows faintly through the 90% emerald layer; pills have hairline light borders and soft shadows, no thick edges; white text 5.61 (pill), 5.06 (hover), 4.75 (current page), 7.52 on the layer over a white page. Sheet: touch open leaves focus on the panel and X outline none; light glass, 545 px tall for its content (not 85dvh), footer pinned at the bottom edge, no empty gap; option pills are on-light glass, selected pill is solid emerald with a tick; stepper is a glass pill with round buttons and dimmed minus. Keyboard: rings on menu pills (peach), X, option pills, stepper, Add and chips (emerald); Tab wraps inside the open menu. Reduced motion: menu opens instantly (transition 0s), sheet animation none, pill translate none. Without backdrop-filter (simulated): menu layer solid emerald, pills solid (white 5.44), sheet solid white, all readable. No horizontal overflow at 360, 390 and 1280 px; wide header unchanged.
- 2026-11-10, step 1h: `npm test` 33 pass, `npm run build` passes (no test changed). 360 px: menu overlay covers 360x740, focus on the panel with no ring after a tap, first link focused with a ring after Enter, Escape and link tap close it and return state, page scroll locked while open, pills have a sage solid edge, current page pill is peach; wide header still inline with plain links. Options: five compact pills in rows (63 to 137 px wide, 44 px high), tap selects with tick, tap again removes, note and total update. Receipt: edges, number, time, name, pickup, option line, total, Download gives steam-and-spice-SS-TEST-01.txt, print emulation hides header, footer, buttons and next steps and leaves the receipt (PDF 34 KB), Print button calls window.print. No horizontal overflow on five pages at 360 and 1280 px; reduced motion opens the menu instantly.
- 2026-11-10, step 1g: `npm test` 33 pass (tests changed: pickup extra-exception test now sets slot_minutes 60 because the default step is 1; 3 added in pickup and whatsapp), `npm run build` passes. At 360 px: sheet is 85% of the screen (629 of 740 px), head 123 px, foot 61 px, only the body scrolls, page behind does not move, swipe down and backdrop tap close it and focus returns, option tile selects with the spring tick; menu opened by touch leaves focus on the panel with no outline, by keyboard focuses the first link with a ring, six rows all 53 px; reduced motion: no dialog animation. Wide: dialog 544 px wide (34rem) and centred. Cart: Place order, empty submit gives both errors and focuses name, bad phone error, echo "We will message you on 07413 069241", hour and minute lists disabled until a date, window text, 60 minutes listed for 10:xx, a customised line shows the 2 days' notice sentence. Done: Order received, not-confirmed highlight, summary with pickup and name, three steps, 0 WhatsApp requests, no Open WhatsApp button. Failure (broken backend): error text, Send the WhatsApp message button with name and phone in the text, no auto open, cart kept, Place order enabled again. No horizontal overflow on five pages at 360 and 1280 px. Glass contrast: strong glass (94% white) over white, emerald, charcoal, turmeric and peach gives emerald text 8.83 to 9.88 and charcoal text 14.34 to 16.06; dialog glass (82%) over the dimmed page gives emerald 6.86 to 8.44 and charcoal 11.15 to 13.72; solid fallback emerald 9.88, charcoal 16.06.
- 2026-11-10, step 1f: `npm test` 30 pass (7 new; no existing assertion changed), `npm run build` passes. With a temporary test set (removed): at 360 px cards are 108 px, six visible in one screen; momo Add opens the dialog first; dialog focus in, Escape and backdrop close and return focus; options change the total live; customised note appears ("Customised: needs 2 days' notice. Earliest pickup: ..."); plain item Add becomes a stepper, caps at stock, back to Add at 0; sold-out card has no button; low stock shows "Only 4 left" and caps qty, customised choice lifts the cap and hides the stock line; cart keeps separate lines, shows Customised label, caps over-stock and flags sold-out lines; date list on a fake Friday: standard cart starts Saturday 14, customised cart starts Sunday 15 with the sentence; WhatsApp text lists "Customised: Hot". JS off: card name, size, price and the name link are present. Keyboard-only: Add, options, add to cart, checkout bar to cart. No horizontal overflow on five pages at 360 and 1280 px.
- 2026-11-10, step 1e: `npm test` 23 pass, `npm run build` passes. At 360 px all five pages: header 53 px (one line), no horizontal overflow, cart icon visible; menu opens/closes by button, Escape, link tap and outside tap, focus moves in and returns, tab order skip > brand > cart > menu. Shop: compact rows (about 190 px), Added state for 1.6 s, bar "1 item" then "2 items · £11.11" linking to cart.html; bar visible on home and how-to-cook, absent on cart and done. Instagram: placeholder with data-todo (2 places per page); with a temporary URL (reverted) both became real links with rel=noopener. `grep -ri tomato frontend` finds nothing. Phone number is in: cart.html, done.html, how-to-cook.html, index.html, shop.html, frontend/js/site-config.js, scripts/build.mjs, tests/whatsapp.test.mjs. Sauce images present after merge: photo-sauce.webp only. Kept the button label "Confirm order" on the cart page (the step says keep it as it is today).
- 2026-11-10, step 1d: `npm test` 23 pass, `npm run build` passes. Five pages at 320, 360 and 1280 px: no horizontal overflow; CLS 0.0000; JS off shows all home content and all 12 test cards, chips and search hidden; reduced motion stops steam and shows all sections; focus rings emerald on white, peach on emerald. Shop with the 2 real products: chips yes (2 kinds), no search; temporary 12-item set (deleted): chips and search appear, chip and search filtering work, a no-match shows the message; 0 products shows "New items are coming soon."; 1 product shows no chips. `?kind=addon` preselects Sauces. Home transfer after scrolling the whole page: 230.7 KB raw / 197 KB gzip over 22 requests (images 173 KB, font 27 KB); above the fold only about 105 KB. Fixed a Step 2 bug: shop.js did not update the header count on load (now imports main.js).
- 2026-11-10, step 1c: `npm test` 23 pass, `npm run build` passes. Home, shop, how-to-cook, cart, done at 320, 360 and 1280 px (home also at 768 and 1600): no horizontal overflow; headline on two lines at every width; hero image overlaps the charcoal band; CLS 0.0000; JS off shows all home content; reduced motion stops steam and shows all sections; cart badge updates (1 item). Home transfer about 94.7 KB raw / 70.4 KB gzip over 17 requests (cut-out placeholders 31 KB of that). Contrast: charcoal/white 16.06, chutney/white 5.98, white/chutney 5.98, charcoal/turmeric 7.12, cream/charcoal 13.57, white/clay 5.82, clay/white 5.82, charcoal/cream 13.57; chutney button against turmeric edge 2.65 (text inside passes). Focus ring checked on white (charcoal), turmeric (charcoal), charcoal board (cream).
- 2026-11-10, step 1b: `npm test` 23 pass, `npm run build` passes. Five pages at 320, 360 and 1280 px: no horizontal overflow. Home CLS 0.0000; font loads; home transfer 65.9 KB raw / about 42.9 KB gzip over 17 requests (font 27.0 KB, SVGs 1.6 KB, CSS 20.9 KB raw). JS off: all home content present. Reduced motion: animations off, content visible. Focus ring visible on every band after switching it to charcoal (cream on dark). Contrast: cream/charcoal 13.57, charcoal/turmeric 7.12, cream-light/clay 5.31, chutney/cream 5.05, clay/cream 4.92, cream-light/chutney 5.45. Lighthouse not run (owner uses PageSpeed Insights).
- 2026-11-10, step 1b deploy: pushed to `main` (3f473e7); Actions run 4 build and deploy jobs both succeeded (npm ci, build, upload, deploy-pages). The agent sandbox cannot reach github.io (proxy refuses the connection), so the live pages were not opened by the agent: the owner should open https://sarojaryal071-sudo.github.io/momo/ and check them.
- 2026-11-10, step 2: merged origin/main (D-023). `npm test` 23 pass. Dev server at 360 px: added both packs and a sauce pot (header count 4), edited qty, removed a line, reload kept cart (£40). Empty-field confirm -> `done.html?o=SS-TEST-01`, cart cleared. Filled confirm: pickup, name and notes appear in the message; notes with `<b>` shown as text. Forced failure (backend `broken`): plain error text, WhatsApp link without number opened, cart kept, button re-enabled. Keyboard: tab order sane, Enter adds and submits, focus ring visible. Only console errors: expected 404 for `data/products.json` on the dev server (seed fallback used). Not done: live URL, real WhatsApp on a phone.
- 2026-11-10, step 1: merged origin/main (D-022). `npm test` 3 pass; `npm run build` validations pass (3 pages, titles and descriptions in range, one h1, canonical); `SITE_INDEXABLE=true` build fails on the `TODO:` text as intended; 3 pages at 320, 360 and 1280 px had no horizontal overflow; screenshots checked for home and shop. Contrast ratios: charcoal/cream 13.57, chutney link/cream 5.05, cream-light/chutney 5.45, cream/charcoal 13.57, charcoal/turmeric 7.12, clay/cream 4.92, cream-light/clay 5.31. Lighthouse not run (not available).
- 2026-11-10, step 0: dev server 200s and styles applied at 360 px; build with `SITE_INDEXABLE` unset gives noindex + `Disallow: /`; with `true` gives no noindex, `Allow`, sitemap line; `npm test` runs clean. Live deploy not yet run.

- 2026-11-12, step 4a (demo mode): `npm test` 49 pass; build validation passes. Browser run: both demo logins, logout, 5 admin URLs redirect when logged out; public cart order appeared in admin; statuses new>confirmed>ready>collected>new; cancel returned stock (19>21), re-open took it (19), re-open with 0 stock refused with a message; WhatsApp texts for 3 statuses, address-empty warning, invalid phone disabled; pause refused on public cart; prep totals correct and 1 A4 page; 390 and 1440 px screenshots checked, no overflow. Not tested: a real phone, real WhatsApp, the 60 s refresh by waiting (storage-event path used).

- 2026-11-12, step 1l: `npm test` 50 pass; build validation passes; `SITE_INDEXABLE=true` build fails on `data-pending` and `"pending": true` as intended. Playwright at 390x844 and 1440x900 on home, shop, product sheet, cart, done, how to cook, menu and the admin; body 16px on both (admin 15px); h1 49px/96px, h2 38px/60px; no horizontal scroll at 320, 375, 390, 414, 768, 1280, 1440; only font files requested: bebas-neue and space-grotesk; Place order showed "Placing order..." disabled with aria-busy. Home page 305 kB uncompressed on a full scroll (fonts 36 kB, images 157 kB, CSS 56 kB, JS 28 kB).

- 2026-11-12, step 4a2: `npm test` 50 pass; build passes. Playwright at 390x844 and 1440x900 with the developer seed (orders in every status): no overflow at 320, 375, 390, 414, 1440; first order card and its main button visible without scrolling; switch toggles by tap, Space, Enter; strip shows after saving a pause and hides on Resume; day chips and counts correct; print preview 1 page; focus ring visible on chips. Badge and chip contrast 5.98 to 14.09.

- 2026-11-12, step 4a2 update for D-053 (0fae91d): `npm test` 50 pass; build passes. Playwright 390 and 1440: Log out icon 44x44, confirm opens with focus on Cancel, Escape closes, Log out leads to login; Status and When selects 16px and 44px high side by side; Custom range reveals From and To (stacked at 390, no overflow), shows the 15 Nov orders; choices survived a reload; first order action button ends at 472 px at 390x844.

- 2026-11-12, step 3 (code only; the Supabase project is not reachable from the agent's sandbox): `backend/tests/run-local.sh` on a local PostgreSQL 16: migrations apply, seed re-runs, 158 checks pass (RLS for every table, order rules, stock, status changes, simultaneous orders). Fast tests `functions` and `gateway` pass (16). The build tests against a fake Supabase were written but not run in the final session at the owner's request; the default demo build passes. Not tested: real email, GitHub dispatch, Supabase Auth, the deployed functions.

## Known issues

- Dev server has no `data/products.json` (build writes it), so `data.js` falls back to the seed after one 404. Unpriced add-ons omit `data-price-pence`. Product JSON-LD skips sample-priced products and has no `image` yet. `dist/admin/` is an empty folder. Done page auto-opens WhatsApp once per order number per tab session. The mock total comes from the browser (`totalPenceHint`); the real backend recomputes (Step 3). Sample label wording is "sample".

## TODO placeholders in content (agent lists every `TODO:` left on public pages)

- `index.html`: pickup area/location wording. `shop.html`: allergen info. `how-to-cook.html`: storage advice. (Sauce pot prices, steam time and pickup hours are now sample values, not TODOs.)

## Sample values (D-023, block launch until replaced)

- `frontend/data/products.seed.json`: chutney pot £1.11, hot sauce pot £2.22 (`"placeholder": true`).
- `frontend/how-to-cook.html`: steam time 12 minutes (`data-placeholder`).
- `frontend/data/pickup.seed.json`: Saturday and Sunday 10:00 to 18:00, 24 h lead, 14 days (`"placeholder": true`); `cart.html` shows a sample-hours note (`data-placeholder`).
- Indexable build fails while any of these remain (tested).
