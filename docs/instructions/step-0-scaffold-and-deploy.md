# Step 0 — Scaffold and deploy pipeline

Read `CLAUDE.md` and the four rulebooks first. Do only this step.

## Goal

A clean project skeleton and a working deploy pipeline, so that every later step goes live automatically. No real page content yet.

## Do

1. Move the existing root `css/` folder (`base.css`, `theme.css`) into `frontend/css/` with `git mv`. Keep every token and rule.
2. Create the folder tree from `docs/architecture-rulebook.md` section 2: `frontend/`, `admin/`, `backend/supabase/` (with `migrations/` and `functions/`), `scripts/`, `.github/workflows/`. Put a one-line `README.md` in `backend/` only. Leave other folders with a `.gitkeep`.
3. `package.json`: `"type": "module"`, scripts `dev`, `build`, `test` (`node --test`), devDependency `sharp` only. `.gitignore`: `node_modules`, `dist`, `.env*`.
4. `scripts/dev.mjs`: a tiny static file server for `frontend/` (and `admin/` at `/admin/`), no dependencies.
5. `scripts/build.mjs`, first version: empty `dist/`, copy `frontend/` to `dist/` and `admin/` to `dist/admin/`, read `SITE_URL` and `SITE_INDEXABLE`, generate `sitemap.xml` and `robots.txt` as the SEO rulebook describes (not indexable unless `SITE_INDEXABLE` is exactly `true`; add the `noindex` meta to HTML pages in that case). Supabase fetching, marked regions and image work come in later steps; leave clear `// TODO(step-N)` markers only in code, not in page content.
6. One placeholder `frontend/index.html`: valid HTML, `lang="en-GB"`, title, description, one `h1` with the brand name and tagline, linking `css/theme.css` and `css/base.css`. A visible `TODO:` line is fine.
7. `.github/workflows/deploy.yml`: on push to `main` and manual start; Node 20; `npm ci`; `npm run build` with repository variables `SITE_URL`, `SITE_INDEXABLE` (no Supabase variables yet); upload `dist/` and deploy using the official Pages actions; concurrency group `pages`.
8. Update `README.md` with how to run `npm run dev` and `npm run build`.

## Do not

Add content, frameworks, or Supabase code. Do not touch `docs/` or `CLAUDE.md`.

## Owner action needed (tell the owner at the end)

In GitHub, open Settings, Pages, and set Source to **GitHub Actions**. Then add repository variables `SITE_URL` (`https://sarojaryal071-sudo.github.io/momo`) and `SITE_INDEXABLE` (`false`). Until the Source is switched, the deploy does not publish.

## Verify (live run)

- `npm run dev` serves the placeholder page at phone width; styles load; paper grain and fonts look right.
- `npm run build` produces `dist/` containing `index.html`, `css/`, `sitemap.xml`, `robots.txt`; with `SITE_INDEXABLE` unset the page has `noindex` and `robots.txt` disallows all.
- After the owner switches Pages, push to `main`, watch the workflow succeed, and open the live URL. Report what loaded.
- `git status` clean, no secrets, no `node_modules` committed.

## Report

Use the report format in `CLAUDE.md`.
