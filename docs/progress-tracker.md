# Progress tracker

The coding agent updates this file at the end of every phase (see `docs/usage-rules.md` section 7). Trust it instead of re-exploring the repository. Edit only the lines that changed.

- Last updated: 2026-11-10 (Step 0 build, coding agent)
- Current step: **Step 1 — code done locally; deployed-URL checks and Lighthouse pending (Step 0 live deploy still waiting on owner)**
- Next action: Once the owner has switched Pages and merged to `main`, open the three pages on the live URL, run Lighthouse on `index.html` and `shop.html` (no Lighthouse in the agent sandbox), tick the last Step 0 item and the Step 1 verify item. Do not start Step 2 before then unless the owner says so.

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

- [x] Fluid tokens (D-022): `theme.css` type, space, layout and control scales; `base.css` token-only — COMMIT, 360 px and 1280 px render fine, no horizontal overflow
- [x] Shared header and footer, `components.css` — COMMIT
- [x] `index.html` (hero, taste-of-home passage, packs, how ordering works, contact) — COMMIT
- [x] `shop.html` with `<!-- build:products -->` region and chalkboard menu panel — COMMIT
- [x] `how-to-cook.html` with `TODO:` for steam time — COMMIT
- [x] `products.seed.json` and `content/products/<slug>.json` for the two momo packs — COMMIT
- [x] Placeholder images in place; list of image slots delivered in the report — COMMIT
- [x] SEO basics on every page, JSON-LD, build validations (title, description, canonical, one `h1`) — COMMIT
- [ ] Verified (partial: local only): 360 px and desktop, source shows content without JS, Lighthouse, contrast ratios

## Step 2 — Cart and order flow (mock)

- [ ] `site-config.js` (mock backend, WhatsApp number marked `TODO`)
- [ ] `cart.js` with persistence and header count
- [ ] Shop add-to-cart controls working
- [ ] `cart.html` with totals, unavailable-item handling, empty state
- [ ] Optional order form with phone hint, honeypot, "Pickup only. Pay cash on pickup."
- [ ] `pickup.js` and `data/pickup.seed.json`
- [ ] `order-gateway.js` (mock plus supabase stub, 8 s timeout)
- [ ] `whatsapp.js` (message, link, UK phone conversion)
- [ ] `done.html` with order number, summary, WhatsApp button
- [ ] `npm test` covers cart, price, pickup, WhatsApp, phone conversion
- [ ] Verified: full flow with empty and filled fields, failure path, keyboard run

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
- [ ] Sauce pot prices, cooking times, pickup slots and capacity
- [ ] Supabase project, admin user, email provider key, GitHub token, `SUPABASE_*` variables (Step 3)
- [ ] Generate AI mood images for the slots listed after Step 1

## File map (agent keeps current, one line per file or folder)

| Path | Purpose | Step |
|---|---|---|
| `CLAUDE.md` | Agent instructions, auto-loaded | planning |
| `docs/` | Decisions log, rulebooks, usage rules, this tracker, `instructions/step-0` to `step-5` | planning |
| `PROJECT_NOTES.md` | Human overview | planning |
| `frontend/css/base.css`, `frontend/css/theme.css` | Base styles and tokens | 0 |
| `frontend/index.html` | Placeholder home page with a `TODO:` line | 0 |
| `admin/` , `backend/supabase/{migrations,functions}` | Empty (`.gitkeep`); `backend/README.md` is one line | 0 |
| `package.json`, `package-lock.json`, `.gitignore` | Scripts dev/build/test, `sharp` only | 0 |
| `scripts/dev.mjs` | Static dev server (`frontend/` at `/`, `admin/` at `/admin/`, port 8080 or `PORT`) | 0 |
| `scripts/build.mjs` | Build v1: copy to `dist/`, noindex, sitemap, robots | 0 |
| `.github/workflows/deploy.yml` | Pages deploy on push to `main` and manual | 0 |
| `frontend/{index,shop,how-to-cook}.html` | The three public pages, hand-written, shared header/footer copied in | 1 |
| `frontend/css/components.css` | Buttons, header, footer, forms, notice, chalkboard, layouts; tokens only | 1 |
| `frontend/data/products.seed.json`, `frontend/content/products/*.json` | Seed products and momo copy | 1 |
| `frontend/assets/img/placeholder-*.webp`, `assets/icons/favicon.svg` | Flat-colour placeholder images and favicon | 1 |
| `scripts/lib/render.mjs` | Renders the `build:products` regions and Product JSON-LD | 1 |
| `tests/regions.test.mjs` | Checks the source fallback regions match the seed | 1 |

## Test and run commands (agent fills in once they exist)

- Dev server: `npm run dev` (http://localhost:8080/)
- Build: `npm run build` (env `SITE_URL`, `SITE_INDEXABLE`)
- Unit tests: `npm test` (no tests yet)
- Backend tests: _not yet_

## Verification log (append one line per check: date, step, what was run, what was seen)

- 2026-11-10, planning: docs pushed, no code yet.
- 2026-11-10, step 1: merged origin/main (D-022). `npm test` 3 pass; `npm run build` validations pass (3 pages, titles and descriptions in range, one h1, canonical); `SITE_INDEXABLE=true` build fails on the `TODO:` text as intended; 3 pages at 320, 360 and 1280 px had no horizontal overflow; screenshots checked for home and shop. Contrast ratios: charcoal/cream 13.57, chutney link/cream 5.05, cream-light/chutney 5.45, cream/charcoal 13.57, charcoal/turmeric 7.12, clay/cream 4.92, cream-light/clay 5.31. Lighthouse not run (not available).
- 2026-11-10, step 0: dev server 200s and styles applied at 360 px; build with `SITE_INDEXABLE` unset gives noindex + `Disallow: /`; with `true` gives no noindex, `Allow`, sitemap line; `npm test` runs clean. Live deploy not yet run.

## Known issues

- Cart link points at `shop.html` (`data-cart-link`) until Step 2 adds `cart.html`. Add-to-cart buttons are inert. Unpriced add-ons omit `data-price-pence`. Product JSON-LD has no `image` yet. `dist/admin/` is an empty folder.

## TODO placeholders in content (agent lists every `TODO:` left on public pages)

- `index.html`: pickup area/location wording. `shop.html`: allergen info; sauce pot prices (x2). `how-to-cook.html`: steam time, storage advice.
