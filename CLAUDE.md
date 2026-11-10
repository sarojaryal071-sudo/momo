# Steam & Spice (placeholder name) — instructions for the coding agent

Homemade frozen momo shop, UK, pickup only. A public static website plus a small admin panel backed by Supabase.
This file is loaded automatically. Read it fully, then follow "Start of every session" below.

The planning chat (claude.ai) never writes code. It writes these docs and instructions. You write all code.

## Start of every session (keep it cheap)

1. Read this file, then `docs/progress-tracker.md` (current step, next action, file map, what is already verified).
2. Read the step file you were given: `docs/instructions/step-N-*.md`. Do only unchecked items of that step, never work from a later step.
3. Read rulebook sections only when the work needs them, using the doc map below. Read all rulebooks in full only in the first session of Step 0, or if the owner asks.
4. Follow `docs/usage-rules.md`. It limits re-checking, regression runs and exploration. Do not re-audit finished work.
5. As the last action of every phase, update `docs/progress-tracker.md` (rules in usage-rules section 7).

## Doc map (read only what the task touches)

| If the work involves | Read |
|---|---|
| Whether something is decided, open items | `docs/decisions-log.md` |
| Folders, database tables, security policies, edge functions, build script | `docs/architecture-rulebook.md` |
| Orders, money, WhatsApp, security rules, accessibility, testing, git | `docs/technical-rulebook.md` |
| Colours, type, layout, images, copy tone | `docs/ui-rulebook.md` |
| Titles, meta, structured data, sitemap, noindex, launch gate | `docs/seo-rulebook.md` |
| What to skip, how much to check, how to record progress | `docs/usage-rules.md` |

## Hard rules

- **Hand-written code.** Plain HTML, CSS and JavaScript written directly in the repo. No frontend framework, no templating engine, no static-site generator, no CSS framework or UI kit. The only tooling is a small Node build script (`scripts/build.mjs`) that fills clearly marked regions, plus `sharp` for images.
- **Content must exist in the HTML.** Everything Google should index is real HTML in the file. JavaScript may enhance a page, never create its main content.
- **Money is integer pence** everywhere in code and the database. Show as £10 or £10.50.
- **No secrets in the repo.** The repo is public. The Supabase URL and anon key are allowed. The service-role key, GitHub tokens, email API keys and the owner's email never are.
- **Never invent facts.** No cooking times, allergen details, reviews, ratings, addresses, hygiene ratings, awards, or story details. Where content is missing, put a visible `TODO:` placeholder, mark it `data-todo`, and list it in your report. **Exception (decision D-023):** for **prices, steam time and pickup hours only**, use obvious sample values instead, mark them `data-placeholder` (or `"placeholder": true` in seed data) with a visible "sample" label, and list them in your report. Allergens, storage and food-safety advice, pickup location and legal or health wording always stay `TODO:`.
- **Do not look AI-generated.** See the UI rulebook: no purple, no gradients, no emoji icons, no rows of identical rounded cards.
- **UK English only.** One language. Currency £.
- **Relative paths** or paths built from `SITE_URL`. The site lives under `/momo/` now and moves to a custom domain later.
- **Soft-coded and fluid, never hard-coded** (decision D-022). Sizes, spacing and type are fluid tokens in `theme.css`; pixel values live only in token definitions. Limits, timeouts and business values are named constants in one config place or the `settings` table. Details: `docs/ui-rulebook.md` section 2b and `docs/technical-rulebook.md` section 1.
- **Stay in scope.** No delivery, card payments, customer accounts, WhatsApp Business API, analytics or tracking unless a step says so.
- **Pickup only, cash on pickup.** Say so wherever an order is placed.

## Working method

- Small commits with clear messages. Run the step's verification before pushing to `main`.
- Pushing to `main` triggers a deploy once Step 0 has set up the Pages workflow.
- Do a real live run of every flow you build (open it in a browser or call it for real). Unit tests alone do not count. Check only what the change touched (regression table in `docs/usage-rules.md`); never re-run earlier steps' checks.
- If a rule, a step or a decision looks wrong, stop, explain, and ask. Do not work around it.

## Report at the end of every step

1. What was built (short).
2. Files added, moved or changed.
3. How it was verified, and what you actually saw.
4. Deviations from the docs, with reasons.
5. Every `TODO:` placeholder left in the content.
6. Questions for the owner.
7. Confirmation that `docs/progress-tracker.md` is updated.

Keep the report under about 40 lines. No recap of earlier steps, no pasted file contents.

## Facts you may use

- Products: frozen chicken momo and frozen veg momo, 40 pieces each, £10 each. Sauce pots (chutney, hot sauce) are add-ons with prices still to be confirmed.
- Tagline: "Taste like Nepal". Public phone: +44 7413 069241 (confirm it is also her WhatsApp number).
- Audience: Nepalis in the UK who miss the taste of home, and curious people who want a taste of the Himalayas.
