# Progress tracker

The coding agent updates this file at the end of every phase (see `docs/usage-rules.md` section 7). Trust it instead of re-exploring the repository. Edit only the lines that changed.

- Last updated: 2026-11-10 (by the planning chat)
- Current step: **Step 0 — not started**
- Next action: Do Step 0 (`docs/instructions/step-0-scaffold-and-deploy.md`). Move the root `css/` folder into `frontend/css/` first.

Legend: `[ ]` not done, `[x]` done. For every ticked item add: commit hash, one-line evidence.

## Planning (done by the planning chat)

- [x] `CLAUDE.md`, decisions log, four rulebooks, step files 0 to 5, usage rules, this tracker — pushed to `main`

## Step 0 — Scaffold and deploy pipeline

- [ ] `css/` moved into `frontend/css/` with `git mv`, tokens unchanged
- [ ] Folder tree created (`frontend/`, `admin/`, `backend/supabase/{migrations,functions}`, `scripts/`, `.github/workflows/`)
- [ ] `package.json` (scripts `dev`, `build`, `test`; devDependency `sharp` only) and `.gitignore`
- [ ] `scripts/dev.mjs` static server works
- [ ] `scripts/build.mjs` v1: copy to `dist/`, `sitemap.xml`, `robots.txt`, `noindex` logic via `SITE_INDEXABLE`
- [ ] Placeholder `frontend/index.html` (valid, `lang="en-GB"`, one `h1`)
- [ ] `.github/workflows/deploy.yml` (Pages via Actions, concurrency group `pages`)
- [ ] `README.md` updated with run and build commands
- [ ] Verified: dev server, build output, noindex behaviour (see log)
- [ ] Owner switched Pages source to GitHub Actions and set variables; live deploy confirmed

## Step 1 — Static pages

- [ ] Shared header and footer, `components.css`
- [ ] `index.html` (hero, taste-of-home passage, packs, how ordering works, contact)
- [ ] `shop.html` with `<!-- build:products -->` region and chalkboard menu panel
- [ ] `how-to-cook.html` with `TODO:` for steam time
- [ ] `products.seed.json` and `content/products/<slug>.json` for the two momo packs
- [ ] Placeholder images in place; list of image slots delivered in the report
- [ ] SEO basics on every page, JSON-LD, build validations (title, description, canonical, one `h1`)
- [ ] Verified: 360 px and desktop, source shows content without JS, Lighthouse, contrast ratios

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
| `css/base.css`, `css/theme.css` | Base styles and tokens (moves to `frontend/css/` in Step 0) | agent, pre-step |

## Test and run commands (agent fills in once they exist)

- Dev server: _not yet_
- Build: _not yet_
- Unit tests: _not yet_
- Backend tests: _not yet_

## Verification log (append one line per check: date, step, what was run, what was seen)

- 2026-11-10, planning: docs pushed, no code yet.

## Known issues

- _none_

## TODO placeholders in content (agent lists every `TODO:` left on public pages)

- _none yet_
