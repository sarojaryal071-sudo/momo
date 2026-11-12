# Backend (Supabase): setup, secrets and tests

This folder is the whole real backend. Nothing in it contains a secret. The site keeps working on its demo data until you flip the
one switch in section 6, so you can do these steps in any quiet moment.

```
backend/supabase/migrations/   0001 tables, security, grants   0002 order and admin functions   0003 photo bucket   0004 starting data   0005 live order feed
backend/supabase/functions/    place-order   trigger-rebuild   build-status   (+ _shared)
backend/supabase/config.toml   turns the default JWT check off for the three functions (see "Keys" below)
backend/tests/                 database tests that run on a throw-away PostgreSQL (section 7)
```

## 1. What is already done (by you)

- Supabase project "Steam & Spice", URL `https://mohkrxpdqtwnhzzmcxdw.supabase.co`, Europe region, Data API on,
  "Automatically expose new tables" off, "Automatic RLS" on.
- Public sign-ups disabled and one admin user created.
- Repository variables `SITE_URL`, `SITE_INDEXABLE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (the `sb_publishable_...` key) are set.

## 2. What is still needed from you (exactly)

| # | What | Where it goes | Why |
|---|---|---|---|
| 1 | **GitHub fine-grained token**: only this repository, permission *Actions: Read and write*, nothing else | Supabase function secret `GITHUB_DISPATCH_TOKEN` | the Publish button starts the build |
| 2 | **A random string** you make up (30+ characters), used twice | Supabase function secret `BUILD_STATUS_TOKEN` **and** GitHub repository *secret* (not variable) `BUILD_STATUS_TOKEN` | lets the build report "Live" or "Failed" to the admin. It can do nothing else |
| 3 | The site's web address(es), for example `https://sarojaryal071-sudo.github.io` (no path) | Supabase function secret `ALLOWED_ORIGINS` (comma separated, add your own domain later) | only your site may call the order function |

There is **no email service** (D-056): no email key and no owner email anywhere. New orders reach you through the admin panel (it refreshes
every minute and, from Step 4bc, shows new orders live). Optional secrets: `GITHUB_REPO`, `GITHUB_WORKFLOW`.

Never paste the Supabase **secret key** (`sb_secret_...`) or the service-role key anywhere in the repo, in GitHub variables or in chat.
Supabase gives it to the functions itself.

## 3. Create the database (once)

Easiest, no tools: open the Supabase dashboard, SQL Editor, and run the five files **in order**, each one as a new query:
`0001_core_tables.sql`, `0002_order_functions.sql`, `0003_storage.sql`, `0004_seed_shop_data.sql`, `0005_realtime.sql`. Each must finish with "Success".
(With the CLI instead: `supabase link --project-ref mohkrxpdqtwnhzzmcxdw` then `supabase db push`.)

The files are forward-only and written to be re-run on a new project. `0004` can be run again safely (it never overwrites). The others
create things and will stop with "already exists" if run twice, which is correct.

**Make your admin user an admin** (and later the second one, with the same statement; replace the email):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'owner@example.com';
```

**Check:** Table editor shows 4 products, `settings`, `pickup_rules` (Saturday and Sunday 10:00 to 18:00) and `admins` with your row.

## 4. Deploy the three functions and set their secrets

With the Supabase CLI (`npm i -g supabase`, or `npx supabase`), logged in (`supabase login`) and linked as above:

```
supabase functions deploy place-order trigger-rebuild build-status --no-verify-jwt
supabase secrets set GITHUB_DISPATCH_TOKEN=github_pat_xxx BUILD_STATUS_TOKEN=your-random-string \
  ALLOWED_ORIGINS=https://sarojaryal071-sudo.github.io
```

Or in the dashboard: Edge Functions, create each function and paste the code from `backend/supabase/functions/<name>/index.ts`
(and `_shared/validate.ts`), then Edge Functions, Secrets. Turn **off** "Verify JWT" for all three (see Keys).

**Keys.** This project uses the new key format. The public key is the *publishable key* (`sb_publishable_...`). It is public, may be
in the repo, and is not a JWT, so the default JWT check cannot protect anonymous endpoints. The functions do their own checks:
`place-order` (origin, honeypot, rate limit, every rule in the database), `trigger-rebuild` (the caller must hold a signed-in admin
session), `build-status` (the secret token).

## 5. How orders and publishing work

- The shop calls `place-order`. The function validates the shape, applies a per-IP rate limit and calls the SQL function
  `place_order`, which recomputes every price from the tables, checks options, stock, pickup day and time, notice period, pause and the
  daily limit, then takes the next number (`SS-DDMM-NN`) and lowers stock, all in one locked transaction. No email is sent (D-056).
- Live feed (D-057): `0005_realtime.sql` publishes `orders` to Supabase Realtime. Row-level security applies, so only a signed-in admin
  receives events; the admin's live view is built in Step 4bc. Check in Database, Replication, that `orders` is listed.
- Status changes (confirm, cancel, ...) go only through `set_order_status` (stock returns once on cancel, is taken again on re-open).
- Product, option and photo edits mark "unpublished changes". Publishing (a button in the admin, built in Step 4bc) calls
  `trigger-rebuild`, which starts the GitHub workflow; the workflow reports Live or Failed through `build-status`.
  Stock, settings, pickup rules and orders never rebuild the site.
- Product photos: upload to the `product-images` bucket (public read, admin write, 5 MB, jpeg/png/webp). A photo needs alt text before the build accepts it.

## 6. Switch the live site to the real backend (last step)

Do this only after sections 2 to 4 are done and a test order works.

1. GitHub, Settings, Secrets and variables, Actions, **Variables**: add `SITE_BACKEND` = `supabase`. (To go back to the demo data, delete it.)
2. Run the deploy workflow (Actions, "Deploy to GitHub Pages", Run workflow). The build now reads the products from Supabase.
   If Supabase cannot be read or has no products, the build **fails** and the live site keeps its last good version.
3. Place a real order on the site; check the row in Supabase (Table editor, `orders`) and the admin Orders page.

## 7. Tests

- `npm test` includes the database tests when PostgreSQL server programs are installed (`backend/tests/run-local.sh`): it creates a
  throw-away database, applies the migrations, and checks row-level security for every table, the order rules, stock, the daily
  limit, status changes and two simultaneous orders. It needs no Supabase account.
- To run `backend/tests/policies.test.sql` against a **disposable** Supabase test project instead, connect with `psql` as the
  `postgres` user and run it. Never run it on the real project: it creates test users, orders and settings.
- The functions' request checks are tested in `tests/functions.test.mjs`; the build against a fake Supabase in `tests/build-supabase.test.mjs`.
- Not testable without your accounts: the GitHub dispatch, Supabase Auth login. Section 6 step 3 covers them.
