# Step 5 — SEO, hardening and launch checks

Prerequisite: Steps 0 to 4 done. Read `CLAUDE.md`, the SEO rulebook and the technical rulebook first. Do only this step. Going live (setting `SITE_INDEXABLE` to `true`) is the owner's decision, not yours.

## Goal

Everything that must be true before the owner turns indexing on and shares the site publicly.

## Do

1. **SEO audit of every public page** against `docs/seo-rulebook.md`: title and description uniqueness and length, canonical, one `h1`, Open Graph and Twitter tags with a real 1200 by 630 image, `lang`, favicon, internal links, alt text, structured data. Fix what fails.
2. **Structured data**: validate Organization and Product JSON-LD with Google's Rich Results Test and report the result. Confirm availability and price match the visible shop and the database.
3. **Social preview image** and favicon, using flat brand colours and the placeholder name. Keep them easy to replace.
4. **Spam and abuse**: review the honeypot and rate limiting under test. If it is easy to bypass, add Cloudflare Turnstile to the order form and verify it in `place-order` (owner creates the Turnstile keys).
5. **Performance**: run Lighthouse on mobile for home, shop, cart. Meet the budget in the technical rulebook section 8; report numbers and what you changed. Ensure responsive images, lazy loading, no layout shift.
6. **Accessibility pass**: keyboard, focus, labels, contrast, reduced motion, screen-reader announcements for the cart and form errors. Report the tool results.
7. **Security review**: re-run the row-level security tests, confirm no secrets in the repo history (`git log -p` search for keys and the owner's email), confirm CORS, confirm admin sign-ups are disabled, confirm the admin CSP.
8. **Privacy and legal placeholders**: add `privacy.html` and `terms.html` as clearly marked drafts (`TODO:` text, `noindex` until the owner supplies approved wording after council registration, decision D-018). Add `allergens.html` the same way. Link them from the footer only when they have real content; until then, the shop shows a visible "Allergen information coming soon" note with a `TODO:` marker.
9. **Custom domain readiness**: write `docs/domain-move.md`: the exact steps to add a custom domain in Pages, update the `SITE_URL` variable, rebuild, and set canonicals. Do not buy or configure a domain.
10. **Launch checklist**: write `docs/launch-checklist.md` with every item the owner must confirm before turning indexing on: no `TODO:` text, real photos, sauce prices, cooking times, allergen and privacy pages approved, council registration done, order number format, WhatsApp number, test order passes, backups understood.

## Do not

Set `SITE_INDEXABLE` to `true`, submit anything to Search Console, buy a domain, invent legal wording, or add analytics.

## Verify (live run)

- A full test order from a phone, start to finish, with the owner's email, the admin panel entry and her WhatsApp message to the customer checked.
- Rich Results Test and Lighthouse reports pasted into the report (scores and any remaining issues).
- `npm run build` with `SITE_INDEXABLE=true` in a scratch environment fails while any `TODO:` remains and passes when none do. Do not leave that variable set to true in the repo's variables.

## Report

Use the report format in `CLAUDE.md`, and end with the exact list of things still blocking launch.
