# Steam & Spice (placeholder name) — instructions for the coding agent

Homemade frozen momo shop, UK, pickup only. A public static website plus a small admin panel backed by Supabase.
This file is loaded automatically. Read it fully, then read the docs below before changing anything.

The planning chat (claude.ai) never writes code. It writes these docs and instructions. You write all code.

## Read first, in this order

1. `docs/decisions-log.md` — what is decided, and why. Never reverse a decision silently.
2. `docs/architecture-rulebook.md` — folders, data ownership, build pipeline, backend.
3. `docs/technical-rulebook.md` — rules for code, orders, security, testing.
4. `docs/ui-rulebook.md` — look and feel, palette, copy tone.
5. `docs/seo-rulebook.md` — what Google must be able to read, and launch gates.
6. `docs/instructions/step-N-*.md` — build steps. Do only the step you are given, never work from a later step.

## Hard rules

- **Hand-written code.** Plain HTML, CSS and JavaScript written directly in the repo. No frontend framework, no templating engine, no static-site generator, no CSS framework or UI kit. The only tooling is a small Node build script (`scripts/build.mjs`) that fills clearly marked regions, plus `sharp` for images.
- **Content must exist in the HTML.** Everything Google should index is real HTML in the file. JavaScript may enhance a page, never create its main content.
- **Money is integer pence** everywhere in code and the database. Show as £10 or £10.50.
- **No secrets in the repo.** The repo is public. The Supabase URL and anon key are allowed. The service-role key, GitHub tokens, email API keys and the owner's email never are.
- **Never invent facts.** No cooking times, allergen details, reviews, ratings, addresses, hygiene ratings, awards, or story details. Where content is missing, put a visible `TODO:` placeholder, mark it `data-todo`, and list it in your report.
- **Do not look AI-generated.** See the UI rulebook: no purple, no gradients, no emoji icons, no rows of identical rounded cards.
- **UK English only.** One language. Currency £.
- **Relative paths** or paths built from `SITE_URL`. The site lives under `/momo/` now and moves to a custom domain later.
- **Stay in scope.** No delivery, card payments, customer accounts, WhatsApp Business API, analytics or tracking unless a step says so.
- **Pickup only, cash on pickup.** Say so wherever an order is placed.

## Working method

- Small commits with clear messages. Run the step's verification before pushing to `main`.
- Pushing to `main` triggers a deploy once Step 0 has set up the Pages workflow.
- Do a real live run of every flow you build (open it in a browser or call it for real). Unit tests alone do not count.
- If a rule, a step or a decision looks wrong, stop, explain, and ask. Do not work around it.

## Report at the end of every step

1. What was built (short).
2. Files added, moved or changed.
3. How it was verified, and what you actually saw.
4. Deviations from the docs, with reasons.
5. Every `TODO:` placeholder left in the content.
6. Questions for the owner.

## Facts you may use

- Products: frozen chicken momo and frozen veg momo, 40 pieces each, £10 each. Sauce pots (chutney, hot sauce) are add-ons with prices still to be confirmed.
- Tagline: "Taste like Nepal". Public phone: +44 7413 069241 (confirm it is also her WhatsApp number).
- Audience: Nepalis in the UK who miss the taste of home, and curious people who want a taste of the Himalayas.
