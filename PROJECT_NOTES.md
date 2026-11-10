# Steam & Spice (placeholder name) — Project Notes

Overview for humans. The detailed, authoritative documents are in `docs/`:

- `docs/decisions-log.md` — every decision and open item
- `docs/architecture-rulebook.md`, `docs/technical-rulebook.md`, `docs/ui-rulebook.md`, `docs/seo-rulebook.md`
- `docs/instructions/` — build steps 0 to 5 for the coding agent
- `CLAUDE.md` — instructions the coding agent loads automatically

If this file and `docs/decisions-log.md` disagree, the decisions log wins.

- Repo: https://github.com/sarojaryal071-sudo/momo
- Live (GitHub Pages): https://sarojaryal071-sudo.github.io/momo/
- Last updated: 2026-11-10

## The business

- Homemade frozen momo, UK-wide wording, **pickup only**, **cash on pickup**. Delivery may come later.
- Audience: Nepalis in the UK who miss the taste of home, plus curious people who want a taste of the Himalayas.
- Tagline: **"Taste like Nepal"**. Public phone: **+44 7413 069241** (confirm it is also her WhatsApp number).
- Short "how to cook from frozen" section wanted; no recipes.

## Products

| Item | Size | Price |
|---|---|---|
| Frozen chicken momo | 40 pieces | £10 |
| Frozen veg momo | 40 pieces | £10 |
| Spicy tomato chutney (small pot) | add-on | price to be confirmed |
| Hot sauce (small pot) | add-on | price to be confirmed |

## Brand (placeholder)

Name **Steam & Spice**, Himalayan and earthy, simple and direct copy. Palette: turmeric `#E3A018`, coriander green `#5E7D3A`, chutney red `#B8321F`, cream `#F6EBD3`, charcoal `#23211E`, clay `#8A5A3B`. No purple, no gradients, no emoji icons. Details in `docs/ui-rulebook.md`.

## How it works

- **Public site:** hand-written static HTML, CSS and JS in `frontend/`, deployed to GitHub Pages by a GitHub Actions workflow. No frameworks, no templating.
- **Ordering:** cart, then confirm. The order is saved, the owner is emailed automatically, and WhatsApp opens with the order pre-filled (the customer taps send). All form fields are optional.
- **Order numbers:** `SS-1110-01` style, assigned by the backend (date format to be confirmed).
- **Backend:** Supabase (database, login, storage, edge functions) in `backend/`.
- **Admin panel:** `admin/`, for the owner. Orders by pickup date, WhatsApp message button, products (price, photo, availability, new items), pickup pattern and exceptions, live notice banner.
- **Static vs admin:** brand text, story, how to cook, FAQ, meta, legal pages are in the repo. Products, pickup times, notice and orders are in the admin. Saving a product change rebuilds the shop page automatically so Google still reads plain HTML.
- **SEO:** the site stays non-indexable until the owner turns it on, after a custom domain and the launch checklist.

## Build order

0. Scaffold and deploy pipeline. 1. Static pages. 2. Cart and order flow (mock). 3. Supabase backend and real orders. 4. Admin panel. 5. SEO, hardening and launch checks.

## Later

Custom domain, allergen and legal pages after council registration, Instagram and Facebook, real photos, delivery option, optional card payments, WhatsApp Business API.

## Open items

See the end of `docs/decisions-log.md`.
