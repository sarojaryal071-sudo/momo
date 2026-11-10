# Progress tracker

The coding agent updates this file at the end of every phase (see `docs/usage-rules.md` section 7). Trust it instead of re-exploring the repository. Edit only the lines that changed.

- Last updated: 2026-11-10 (Step 2 build, coding agent)
- Current step: **Step 1b done and merged to `main`; Steps 0 to 2 live-URL checks still open**
- Next action: After the owner switches Pages and merges to `main`: open the pages on the live URL, run Lighthouse on `index.html` and `shop.html`, check the WhatsApp link on a phone, then tick the open Step 0, 1 and 2 verify items. Step 3 needs the owner's Supabase actions first.

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

## Step 3 — Supabase backend and real orders

- [ ] Owner actions listed and completed (Supabase project, admin user, email key, GitHub token, variables)
- [ ] Migrations: tables, indexes, `is_admin()`, row-level security, storage bucket, `place_order` function
- [ ] `seed.sql`
- [ ] `place-order` edge function
- [ ] `trigger-rebuild` function and database webhook
- [ ] Frontend wired to the real gateway and pickup rules
- [ ] `build.mjs` fetches products, merges content, fills regions, writes `products.json`, converts photos
- [ ] `notice.js` banner
- [ ] Backend test script passes (anonymous access, tampered price, concurrent numbers, sold out, empty fields)
- [ ] Verified: real order saved, owner email received, WhatsApp opens, price edit triggers rebuild

## Step 4 — Admin panel

- [ ] Login and session guard
- [ ] Orders by pickup date with status buttons
- [ ] Message customer (WhatsApp templates)
- [ ] Products: edit, availability, order, photo upload, add item
- [ ] Pickup rules and exceptions with preview
- [ ] Settings and notice banner
- [ ] CSV export
- [ ] Verified: phone-size login, order lifecycle, product change reaches the shop, anonymous and non-admin refused

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
- [ ] Supabase project, admin user, email provider key, GitHub token, `SUPABASE_*` variables (Step 3)
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
| `frontend/css/motifs.css` | Step 1b: motif masks, bands, display type, steam, fold steps, reveal | 1b |
| `frontend/assets/fonts/` | Young Serif latin woff2 (27 KB) and its OFL licence | 1b |
| `frontend/assets/svg/` | fold, ridge, steam, kraft-tag SVG motifs | 1b |
| `frontend/css/components.css` | Buttons, header, footer, forms, notice, chalkboard, layouts; tokens only | 1 |
| `frontend/data/products.seed.json`, `frontend/content/products/*.json` | Seed products and momo copy | 1 |
| `frontend/assets/img/placeholder-*.webp`, `assets/icons/favicon.svg` | Flat-colour placeholder images and favicon | 1 |
| `scripts/lib/render.mjs` | Renders the `build:products` regions (home: chalkboard rows with kraft price tags) and Product JSON-LD | 1, 1b |
| `tests/regions.test.mjs` | Checks the source fallback regions match the seed | 1 |
| `frontend/cart.html`, `frontend/done.html` | Cart with order form; confirmation with WhatsApp button; both `noindex` | 2 |
| `frontend/js/site-config.js` | Backend choice, WhatsApp number, limits, timeouts (single config place) | 2 |
| `frontend/js/cart.js`, `main.js` | Cart store, lines and totals, `formatPrice`, header count | 2 |
| `frontend/js/shop.js`, `cart-page.js`, `done.js`, `data.js` | Page scripts and data loading (products.json, seed fallback) | 2 |
| `frontend/js/pickup.js`, `data/pickup.seed.json` | Pickup dates and times; sample hours | 2 |
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
- 2026-11-10, step 1b: `npm test` 23 pass, `npm run build` passes. Five pages at 320, 360 and 1280 px: no horizontal overflow. Home CLS 0.0000; font loads; home transfer 65.9 KB raw / about 42.9 KB gzip over 17 requests (font 27.0 KB, SVGs 1.6 KB, CSS 20.9 KB raw). JS off: all home content present. Reduced motion: animations off, content visible. Focus ring visible on every band after switching it to charcoal (cream on dark). Contrast: cream/charcoal 13.57, charcoal/turmeric 7.12, cream-light/clay 5.31, chutney/cream 5.05, clay/cream 4.92, cream-light/chutney 5.45. Lighthouse not run (owner uses PageSpeed Insights).
- 2026-11-10, step 2: merged origin/main (D-023). `npm test` 23 pass. Dev server at 360 px: added both packs and a sauce pot (header count 4), edited qty, removed a line, reload kept cart (£40). Empty-field confirm -> `done.html?o=SS-TEST-01`, cart cleared. Filled confirm: pickup, name and notes appear in the message; notes with `<b>` shown as text. Forced failure (backend `broken`): plain error text, WhatsApp link without number opened, cart kept, button re-enabled. Keyboard: tab order sane, Enter adds and submits, focus ring visible. Only console errors: expected 404 for `data/products.json` on the dev server (seed fallback used). Not done: live URL, real WhatsApp on a phone.
- 2026-11-10, step 1: merged origin/main (D-022). `npm test` 3 pass; `npm run build` validations pass (3 pages, titles and descriptions in range, one h1, canonical); `SITE_INDEXABLE=true` build fails on the `TODO:` text as intended; 3 pages at 320, 360 and 1280 px had no horizontal overflow; screenshots checked for home and shop. Contrast ratios: charcoal/cream 13.57, chutney link/cream 5.05, cream-light/chutney 5.45, cream/charcoal 13.57, charcoal/turmeric 7.12, clay/cream 4.92, cream-light/clay 5.31. Lighthouse not run (not available).
- 2026-11-10, step 0: dev server 200s and styles applied at 360 px; build with `SITE_INDEXABLE` unset gives noindex + `Disallow: /`; with `true` gives no noindex, `Allow`, sitemap line; `npm test` runs clean. Live deploy not yet run.

## Known issues

- Dev server has no `data/products.json` (build writes it), so `data.js` falls back to the seed after one 404. Unpriced add-ons omit `data-price-pence`. Product JSON-LD skips sample-priced products and has no `image` yet. `dist/admin/` is an empty folder. Done page auto-opens WhatsApp once per order number per tab session. The mock total comes from the browser (`totalPenceHint`); the real backend recomputes (Step 3). Sample label wording is "sample".

## TODO placeholders in content (agent lists every `TODO:` left on public pages)

- `index.html`: pickup area/location wording. `shop.html`: allergen info. `how-to-cook.html`: storage advice. (Sauce pot prices, steam time and pickup hours are now sample values, not TODOs.)

## Sample values (D-023, block launch until replaced)

- `frontend/data/products.seed.json`: chutney pot £1.11, hot sauce pot £2.22 (`"placeholder": true`).
- `frontend/how-to-cook.html`: steam time 12 minutes (`data-placeholder`).
- `frontend/data/pickup.seed.json`: Saturday and Sunday 10:00 to 18:00, 24 h lead, 14 days (`"placeholder": true`); `cart.html` shows a sample-hours note (`data-placeholder`).
- Indexable build fails while any of these remain (tested).
