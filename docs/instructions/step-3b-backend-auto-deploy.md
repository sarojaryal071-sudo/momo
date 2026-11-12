# Step 3b — Backend deploys itself (decision D-058)

Prerequisite: Step 3 is merged (it is). Merge `origin/main` first. Read `CLAUDE.md`, D-055 to D-058 and `backend/README.md`. Do only this step; do not start 4bc.

## Goal

Pushing to `main` with changes under `backend/supabase/` applies the new database migrations and deploys the three edge functions to the Supabase project, with no manual SQL or CLI work by the owner. The owner has NOT run any migration by hand, so the first run applies 0001 to 0005 on a fresh database.

## Do

1. **Workflow `.github/workflows/backend-deploy.yml`:** triggers on push to `main` for paths `backend/supabase/**` and on `workflow_dispatch`. Never on pull requests. Uses the Supabase CLI action (pinned version) with `environment: production`. Steps: link the project (`SUPABASE_PROJECT_REF`), `supabase db push` (using `SUPABASE_DB_PASSWORD`), `supabase functions deploy place-order trigger-rebuild build-status --no-verify-jwt`. Concurrency group so two runs never overlap. A clear summary of what was applied.
2. **Destructive-change guard:** a small script `scripts/check-migrations.mjs` that fails the job if a migration newer than the last applied one contains `drop table`, `drop column`, `truncate`, or `delete from` without `where`, unless its file name contains `-approved-destructive`. Add a test for it.
3. **Secrets:** the workflow reads `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` and `SUPABASE_PROJECT_REF` from GitHub repository secrets only. Nothing secret in the repo or logs. Function secrets (`GITHUB_DISPATCH_TOKEN`, `BUILD_STATUS_TOKEN`, `ALLOWED_ORIGINS`) are not set by the workflow; they stay a one-time owner action in Supabase.
4. **Admin row stays manual** (it contains the owner's email): keep the one SQL statement in the README, to run once in the SQL Editor after the first successful deploy.
5. **Update `backend/README.md`:** replace "run the five files by hand" and "deploy the functions" with the owner actions for this workflow, in plain language, exactly where each value goes: (a) create a Supabase access token (account page, Access Tokens), (b) reset or set the database password (Project Settings, Database) and note it, (c) add the three repository secrets, (d) create the GitHub Environment `production` (optionally with the owner as required reviewer), (e) run the workflow once by hand, (f) set the function secrets, (g) run the admin SQL, (h) set `SITE_BACKEND=supabase`. Keep the manual SQL route as a fallback paragraph.
6. Tracker and report as usual.

## Do not

Run anything against the live project from your sandbox (it is blocked); do not ask for or store the secret/service-role key; do not weaken the RLS or tests; do not make the site build depend on this workflow.

## Verify

`npm test` passes including the guard test. Validate the workflow YAML (actionlint if available, or a syntax check). State plainly that the real run happens when the owner adds the secrets and runs it. Merge to `main`, push, and confirm the deploy workflow for the site still succeeds (the new workflow will fail or skip until secrets exist: it must skip cleanly with a clear message when the secrets are missing, not show a red failure).
