# Architecture rulebook

Status: v1, 2026-11-10. Instructions for the coding agent. Names and paths below are the intended starting point; refine details if needed but keep the structure and report any change.

## 1. System at a glance

```
Visitor browser ──► GitHub Pages (static files from dist/)
     │                    ▲
     │ order              │ deploy (GitHub Actions)
     ▼                    │
Edge function place-order ──► Postgres ◄── Admin pages (Supabase Auth)
     │                          │
     └─► email to owner         └─ database webhook ► Edge function trigger-rebuild ► workflow ► build.mjs ► Pages
```

- The public site is static. It reads products from HTML, and pickup rules, the notice banner and public settings from Supabase over plain `fetch` using the anon key.
- Orders reach the database only through the `place-order` edge function. The browser never inserts into `orders`.
- The admin panel is static HTML and JS that talks to Supabase as a logged-in admin. Row-level security is the real protection, not hidden pages.

## 2. Repository layout

```
momo/
  CLAUDE.md                     agent instructions (auto-loaded)
  README.md
  PROJECT_NOTES.md              overview for humans
  package.json                  scripts only; devDependency: sharp
  .gitignore                    node_modules, dist, .env*
  frontend/                     public site, hand-written
    index.html  shop.html  cart.html  done.html  how-to-cook.html
    css/  theme.css base.css components.css
    js/   site-config.js cart.js pickup.js order-gateway.js whatsapp.js notice.js
    assets/  img/ (hero and mood images, WebP)  icons/
    content/products/<slug>.json    developer-owned product copy
    data/  products.seed.json pickup.seed.json   local-dev fallbacks only
  admin/                        owner's panel, hand-written, noindex
    index.html (orders)  login.html  products.html  pickup.html  settings.html
    js/  vendor/supabase-js.<pinned>.js  auth.js orders.js products.js pickup.js settings.js
  backend/
    supabase/
      migrations/  0001_init.sql 0002_rls.sql ...   numbered, forward-only
      functions/   place-order/  trigger-rebuild/
      seed.sql                  launch products, default pickup rules, settings
    README.md                   manual setup steps for the owner
  scripts/
    build.mjs                   the only build tool
    dev.mjs                     tiny local static server
  .github/workflows/deploy.yml  build and deploy to Pages
  docs/                         these rulebooks, decisions log, instructions/
```

The existing `css/` folder at the repo root moves into `frontend/css/` in Step 0. Keep its tokens.

Conventions: files and folders `kebab-case`; database tables and columns `snake_case`; JS `camelCase`; CSS classes `kebab-case`. No cross-imports between `frontend/` and `admin/` except through the build script copying shared files.

## 3. Who owns what

| Thing | Owner | Lives in | Reaches the page |
|---|---|---|---|
| Brand text, hero, story, how it works, how to cook, FAQ | Developer | HTML in `frontend/` | as written |
| Page titles, meta, structured-data shape | Developer | HTML and `build.mjs` | as written |
| Product copy (descriptions, SEO text) | Developer | `frontend/content/products/<slug>.json` | merged at build |
| Product name, price, photo, availability, new items, order of items | Owner | `products` table and storage | injected at build, rebuilt automatically |
| Pickup weekly pattern, exceptions | Owner | `pickup_rules`, `pickup_exceptions` | browser `fetch` at runtime |
| Notice banner | Owner | `site_notice` | browser `fetch` at runtime |
| Orders and status | Owner | `orders` | admin only |
| Order number prefix, lead time, limits | Owner | `settings` | runtime and edge function |

## 4. Database (Postgres on Supabase)

All tables have `created_at`. Use `uuid` ids unless noted. Money is `integer` pence.

- `products` — id, slug (unique), name, kind (`pack` or `addon`), category (nullable text, for filter chips once the catalogue grows, decision D-028), unit_label (for example "40 pieces"), price_pence, available (bool), photo_path (nullable), sort_order, active (bool), updated_at.
- `pickup_rules` — id, weekday (0 to 6, Sunday is 0), start_time, end_time, slot_minutes (default 60), active.
- `pickup_exceptions` — id, date, kind (`closed` or `extra`), start_time, end_time (null when closed all day), note.
- `site_notice` — single row (id = 1): message, active, updated_at.
- `settings` — key (text pk), value (jsonb). Keys: `order_prefix` ("SS"), `min_lead_hours`, `max_days_ahead`, `max_qty_per_item`.
- `orders` — id, order_number (unique), order_date (UK date), pickup_date (nullable), pickup_time (nullable), customer_name (nullable), customer_phone (nullable), notes (nullable), items (jsonb snapshot: slug, name, unit_label, qty, unit_price_pence), total_pence, status (`new`, `confirmed`, `ready`, `collected`, `cancelled`), updated_at.
- `order_counters` — order_date (pk), last_number. Touched only inside the order function, with row locking so two orders never get the same number.
- `admins` — user_id (pk, references `auth.users`).

Indexes: `orders (pickup_date, status)`, `orders (created_at desc)`, `products (active, sort_order)`.

## 5. Security model (row-level security on every table)

- `is_admin()` is a SQL function: true when `auth.uid()` exists in `admins`.
- `products`, `pickup_rules`, `pickup_exceptions`, `site_notice`: anyone may `select` (products only where `active`); only admins write.
- `settings`: anyone may read only the public keys (`min_lead_hours`, `max_days_ahead`, `max_qty_per_item`); admins read and write all.
- `orders`: **no access for anonymous users at all**. Admins may select and update `status`. Inserts happen only inside the `place-order` function using the service role.
- `order_counters`, `admins`: no public access; an admin may read their own `admins` row.
- Storage bucket `product-photos`: public read, admin-only write, file size and type limits.
- The service-role key lives only in Supabase function secrets. It never appears in the repo, the browser, or GitHub variables.

## 6. Edge functions (Deno, TypeScript)

**`place-order`** — public endpoint, CORS limited to the site's origins.
1. Validate the body: items (slug and qty only), optional name, phone, notes, pickup date and time. Reject unknown slugs, unavailable products, qty outside 1 to `max_qty_per_item`, over-long text, and a filled honeypot field.
2. Recompute every price and the total from the `products` table. Never trust prices from the browser.
3. Check the pickup date and time against the rules, exceptions, `min_lead_hours` and `max_days_ahead` (only when a pickup date was supplied).
4. Rate-limit by IP.
5. Take the next number from `order_counters`, build the order number, insert the order, in one transaction.
6. Email the owner a plain summary. If the email fails, log it and still return success. The order is saved.
7. Return `{ orderNumber, totalPence, emailed }`.

**`trigger-rebuild`** — called by a database webhook on `products` changes. Calls the GitHub API to start the deploy workflow using a fine-grained token (actions permission on this repo only). The workflow's concurrency setting collapses a burst of edits into one build.

Function secrets: `OWNER_EMAIL`, `EMAIL_API_KEY`, `GITHUB_DISPATCH_TOKEN`, `ALLOWED_ORIGINS`.

## 7. Build pipeline (`scripts/build.mjs`)

Inputs: `frontend/`, `admin/`, environment `SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_INDEXABLE`.

1. Empty `dist/`. Copy `frontend/` into `dist/` and `admin/` into `dist/admin/`.
2. Fetch active products from Supabase over REST with the anon key. In CI, a failed or empty fetch **fails the build**, so the live site is never overwritten with stale prices. Local development may pass `--seed` to use `frontend/data/products.seed.json`.
3. Merge each product with `frontend/content/products/<slug>.json` if it exists.
4. Fill the marked regions: `<!-- build:products --> ... <!-- /build:products -->` in `shop.html` and `index.html`, and the product JSON-LD block. Each region already contains valid fallback HTML so files work unbuilt.
5. Download each product photo, resize it and write WebP into `dist/assets/products/`.
6. Write `dist/data/products.json` (slug, name, unit_label, price_pence, available, photo) for the cart page.
7. Generate `sitemap.xml` and `robots.txt` from `SITE_URL`. If `SITE_INDEXABLE` is not exactly `true`: add `<meta name="robots" content="noindex">` to every public page and make `robots.txt` disallow everything.
8. Validate: every indexable page has a unique title, a meta description, a canonical URL and exactly one `h1`; no `TODO:` text and no `data-placeholder` element remains when `SITE_INDEXABLE` is `true`. Fail the build otherwise.

The script is plain Node (ES modules). The only dependency is `sharp`. It must not template, minify-rewrite or restructure hand-written HTML outside the marked regions.

## 8. Deployment

`.github/workflows/deploy.yml`: runs on push to `main`, on manual start, and when `trigger-rebuild` starts it. Installs, builds, uploads `dist/` and deploys with the official Pages actions. Concurrency group `pages`. Repository variables (public values): `SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_INDEXABLE`.

## 9. Runtime modules (public site)

- `site-config.js` — public values only: Supabase URL and anon key, WhatsApp number, backend mode (`mock` or `supabase`).
- `cart.js` — cart in `localStorage` as slug and quantity only. Prices come from `data/products.json`.
- `pickup.js` — fetches rules and exceptions, returns available dates and times. Uses `data/pickup.seed.json` in mock mode.
- `order-gateway.js` — one function, `submitOrder(order)`, with a `mock` and a `supabase` implementation chosen by `site-config.js`.
- `whatsapp.js` — builds the pre-filled message and link.
- `notice.js` — shows the banner when active.

## 10. Things the agent must not do

- Add a framework, template engine, generator, CSS framework or analytics.
- Put any secret in the repo.
- Let the browser write to `orders`, or trust a price sent by the browser.
- Change a rule or decision silently. Flag deviations in the report.
