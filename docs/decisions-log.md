# Decisions log

Status: v1, 2026-11-10. Add new decisions at the bottom with the next number. Changing a decision needs a new entry that says so.
"Placeholder" means it is deliberately temporary.

| # | Decision | Notes |
|---|---|---|
| D-001 | Homemade frozen momo, UK-wide wording, **pickup only**, **cash on pickup**. | Delivery may be added later as an option. |
| D-002 | Launch products: frozen chicken momo and frozen veg momo, 40 pieces, £10 each. Chutney and hot sauce are separate small-pot add-ons, price to be confirmed. | No mixed or smaller packs at launch. Write £10, not 10£. |
| D-003 | Brand name **Steam & Spice** is a placeholder. Feel: Himalayan and earthy. Copy tone: simple and direct. | Warmth comes from hero writing and images, not long text. No personal life story. |
| D-004 | Palette taken from the food: turmeric, coriander green, chutney red, steamed-dough cream, chalkboard charcoal, clay brown. | Exact values in `docs/ui-rulebook.md`. |
| D-005 | Order flow: cart, then confirm. Confirming saves the order, emails the owner automatically, then opens WhatsApp with the order pre-filled. | A website cannot send WhatsApp messages by itself, so the customer taps send. The email is the reliable record. |
| D-006 | Every order-form field is optional (name, phone, pickup date, pickup time, notes). Phone gets a visible, friendly hint. | Without a phone number the admin cannot message the customer. |
| D-007 | Order numbers look like `SS-1110-01`: prefix, date, daily counter. Assigned by the backend in UK time. | Example is MMDD (10 Nov = 1110). **To confirm:** UK customers may expect DDMM (1011). Prefix comes from a setting. Counter widens past 99 (`SS-1110-100`). |
| D-008 | Static vs admin split. **Static, developer-owned (in repo):** brand, tagline, hero, story, how it works, how to cook, FAQ, page titles and meta, structured data, footer, public phone, legal pages. **Admin-owned (database):** products and add-ons (price, photo, availability, new items), pickup rules and exceptions, orders and their status, notice banner. | Anything Google must read is HTML. Anything that changes often or is private lives in the database. |
| D-009 | Product text is "mixed": the developer owns descriptions, the owner controls price, photo, availability and can add items. | Descriptions live in `frontend/content/products/<slug>.json`. An item the owner adds without such a file shows name, price and photo only. Revisit if she wants to write descriptions. |
| D-010 | Pickup times: a weekly pattern (for example Sat and Sun, 10:00 to 18:00) plus exceptions (closed dates, extra dates). | Slots are computed in the browser from these rules. |
| D-011 | Notice banner (for example "Closed this week") is admin-controlled and **live**, no rebuild. | Small script on every public page. Fails silently. |
| D-012 | Saving a product change in admin **automatically triggers a rebuild** of the static pages. | Database webhook, then an edge function, then a GitHub workflow. Takes a minute or two. |
| D-013 | The owner wants to code directly in the repo, **not through a template system or generator**. Pages are hand-written HTML. A small Node script injects data only between marked regions and generates `sitemap.xml`. | No Eleventy, Astro, Next, or template language. The brand name and phone are written plainly in the HTML; renaming is a project-wide find and replace. |
| D-014 | Backend is **Supabase** (Postgres, auth, storage, edge functions). The admin panel is plain HTML and JavaScript. | No server to maintain. |
| D-015 | Custom domain comes **after the first version works**. Until then the site must not be indexable. | Build flag `SITE_INDEXABLE` controls `noindex` and `robots.txt`. Default is not indexable. |
| D-016 | A short "how to cook your frozen momo" section is wanted. It is not a recipe. | Cooking times are not known yet, so the page uses a `TODO:` placeholder. |
| D-017 | AI images are used for mood now and replaced with her real photos later. Show real packs on the shop page once they exist. | Never present the AI kitchen as her real kitchen. Alt text describes the scene honestly. |
| D-018 | Legal items wait for council registration: allergen information, privacy notice, ICO check, food business registration. | Not legal advice. Check with her and the council. Ordering must not go public without a privacy notice. |
| D-019 | The planning chat never writes code. It writes docs and pushes them to the repo. The coding agent writes all code. | Same working agreement as the other projects. |
| D-020 | GitHub Pages deploys from a **GitHub Actions workflow**, not from the branch root. | Needed for the build step and for automatic rebuilds. The owner switches Settings, Pages, Source to "GitHub Actions" after Step 0. |
| D-021 | Order alerts go to the owner by email through a provider called from the `place-order` edge function. | Provider not chosen yet (Resend free tier is the suggestion). Email address never goes in the repo. |
| D-022 | **Soft-coded and fluid, never hard-coded.** Sizes, spacing, type and widths are fluid (`clamp()`, `rem`, `%`, `ch`, viewport and container units) and defined once as tokens in `theme.css`, used by name. Limits, timeouts and business values are named constants in one config place or in the `settings` table, not literals scattered in code. | Added 2026-11-10 by the owner. Rules in `docs/ui-rulebook.md` section 2b and `docs/technical-rulebook.md` section 1. Interpretation: "soft-coded" means defined once and configurable; "fluid" means layouts adapt continuously instead of snapping between fixed sizes. |
| D-023 | **Owner-approved sample values.** Until she confirms real figures, sauce pot prices, steam time and pickup hours may use obvious fake sample values so the pages and flows can be built and tested. | Each is marked `data-placeholder` in HTML (or `"placeholder": true` in seed JSON) and shows a visible "sample" label. Does **not** cover allergens, storage or food-safety advice, pickup location, or any legal or health wording: those stay `TODO:`. The database seed keeps sauce pots unavailable until real prices are set in admin. An indexable build and the launch checklist fail while any `data-placeholder` or `TODO:` remains. Added 2026-11-10 by the owner. |
| D-024 | **Story world: "Made together."** The site is built around momo as a shared ritual and the table brought to wherever home is now. Visual direction: warm craft, illustrated, professional and plain, in the spirit of Dishoom's one-story-world approach. | Real meaning comes only from sourced facts (table in `docs/brand-direction.md` section 2) and the owner's friend's own answers. Never claim an origin (it is disputed), and never use "authentic" or similar unconfirmed words. No religious symbols or national flag as decoration. Inspiration only, nothing copied. Added 2026-11-10 by the owner. |
| D-025 | One self-hosted open-licence serif for headings is allowed (Latin subset, `woff2`, about 80 KB at most, `font-display: swap`, licence file included). Body text stays on the system stack. | Supersedes "no web-font downloads" for this one font. Added 2026-11-10 to make the type feel designed. |

## Open items

- [ ] Owner's email for order alerts (goes in a Supabase function secret, never in the repo)
- [ ] Confirm +44 7413 069241 is also her WhatsApp number
- [ ] Order number date format: MMDD or DDMM (D-007)
- [ ] Pickup slots to start with, and whether each slot has a capacity limit
- [ ] Sauce pot prices
- [ ] Cooking instructions (steam time from frozen)
- [ ] Final brand name and logo
- [ ] Her answers to the five story questions (`docs/brand-direction.md` section 7)
- [ ] Email provider choice (D-021)
- [ ] Council registration, allergens, privacy wording, data retention period for orders
