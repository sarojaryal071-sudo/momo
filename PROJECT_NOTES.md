# Steam & Spice (placeholder name) — Project Notes

Single source of truth for the homemade frozen momo website. Everything marked *placeholder* can change.

- Repo: https://github.com/sarojaryal071-sudo/momo
- Live (GitHub Pages): https://sarojaryal071-sudo.github.io/momo/
- Last updated: 2026-11-10

## 1. The business

- Homemade frozen momo, UK-wide wording, **pickup only** for now (delivery may be added later as an option).
- Possibly more dishes later; momo only at launch.
- Audience: Nepalis in the UK who miss the taste of home, plus curious people who want a taste of the Himalayas.
- Tagline: **"Taste like Nepal"** (from her sign).
- Phone (public wherever needed): **+44 7413 069241**. Confirm this is also her WhatsApp number.
- No recipes on the site. A short "how to cook your frozen momo" section is wanted.

## 2. Products and prices

| Item | Size | Price |
|---|---|---|
| Frozen chicken momo | 40 pieces | £10 |
| Frozen veg momo | 40 pieces | £10 |
| Spicy tomato chutney (small pot) | add-on | price to be confirmed |
| Hot sauce (small pot) | add-on | price to be confirmed |

- Launch packs: only the two 40-piece packs. No mixed or smaller packs for now.
- Sauces are sold separately, like in burger shops.
- Write prices as £10 (the sign says "10£").

## 3. Brand (all placeholder)

- Name: **Steam & Spice**
- Feel: **Himalayan and earthy**
- Tone of copy: **simple and direct**; warmth comes from the hero writing and images, not long text.
- Story: sharing the taste of home. No personal life story required.
- Logo: none yet.

### Palette (taken from the food)

| Role | Name | Hex |
|---|---|---|
| Accent | Turmeric | `#E3A018` |
| Secondary | Coriander green | `#5E7D3A` |
| Buttons / highlights | Chutney red | `#B8321F` |
| Background | Steamed-dough cream | `#F6EBD3` |
| Text / dark sections | Chalkboard charcoal | `#23211E` |
| Details | Clay brown | `#8A5A3B` |

### Avoid the "AI-generated site" look

- No purple, no gradients, no glow effects.
- No grids of identical rounded cards with emoji icons.
- Flat colours, paper grain, chalk-style underlines, warm serif headings, plain sans body text.
- Uneven, editorial layouts instead of repeated blocks.

## 4. Pages

- `index.html` — hero, short story, how it works, call-to-order
- `shop.html` — two packs, sauce pots, add to cart
- `cart.html` — cart and order form
- `done.html` — order confirmation with order number
- Later: how to cook, allergens, privacy, contact details in footer

## 5. Order flow (launch version)

1. Cart is stored in the browser (localStorage). Prices are stored in pence.
2. Order form fields, **all optional**: name, phone, pickup day, pickup time, notes. Phone gets a friendly hint (so she can arrange pickup).
3. On "Confirm order": create an order number (format like `SS-1110-4F2K`, random, not sequential).
4. Send order details to a free form service (Web3Forms or Formspree) which emails her instantly.
5. Then open WhatsApp pre-filled to her number with the order (customer taps send; websites cannot send WhatsApp messages automatically).
6. If the email step fails, WhatsApp still opens so no order is lost.
7. Confirmation page shows order number and "pay cash on pickup".

- Payment: **cash on pickup**. Card payments possibly much later.
- Needed from her: email address for alerts, pickup time slots.

## 6. Technical plan

- Plain HTML, CSS and a little JavaScript. No framework.
- `css/theme.css` for palette and fonts.
- `js/config.js` for shop name, phone, WhatsApp number, products, prices, currency.
- `assets/` for images (compressed WebP).
- Relative paths everywhere (site lives under `/momo/` now, and moves to a custom domain later).
- Mobile-first, accessible, fast.

## 7. Admin panel (phase 2)

- Backend: **Supabase** (database and admin login, no server to maintain). The public site stays static on GitHub Pages.
- Customers can only add orders. Only her admin login can read them.
- Admin page (`/admin/`, noindex): orders listed by pickup date, with status new / confirmed / ready / collected.
- "Message customer" button opens WhatsApp pre-filled to that customer's number; she taps send. Fully automatic sending would need the WhatsApp Business API (later, optional).
- With no phone number there is nobody to message, so the phone field stays prominent even though optional.
- Spam protection on the order form (honeypot, possibly Cloudflare Turnstile).
- Customer data in the UK is covered by UK GDPR: add a privacy note and check ICO registration. To be confirmed with her and the council; not legal advice.

## 8. SEO plan

- All page content in plain HTML, not built by JavaScript.
- Unique title and description per page, social preview tags, `sitemap.xml`, `robots.txt`.
- Structured data for the business and products (no address needed).
- `noindex` on cart, done and admin pages.
- Image alt text, lazy loading, WebP, good mobile speed.
- Custom domain (for example a `.co.uk`) bought **after the first version works**; do not push for Google indexing before then. `github.io/momo` is weak for SEO.
- Target phrases: homemade frozen momo UK, Nepali momo UK.

## 9. Images

- AI images for mood now (hero: steam over a bamboo steamer, folded momo close-up, chutney bowl, brick-and-wood kitchen corner), realistic and imperfect, Himalayan feel.
- Replace with her real product photos once available. Show real packs on the shop page.
- Her AI sign image has garbled text on the veg tag; use it for reference only, not as final artwork.
- Do not present the AI kitchen scene as her real kitchen.

## 10. Phases

1. **Launch version:** home, shop, cart, order by email plus WhatsApp, how to cook, SEO basics.
2. **Admin panel:** Supabase, orders by pickup date, WhatsApp message button.
3. **Later:** custom domain, allergens and legal pages after council registration, Instagram and Facebook, real photos, delivery option, optional card payments, WhatsApp Business API.

## 11. Open items

- [ ] Her email for order alerts
- [ ] Confirm +44 7413 069241 is her WhatsApp number
- [ ] Pickup time slots to offer
- [ ] Sauce pot prices
- [ ] Final brand name and logo
- [ ] Cooking instructions (steam time from frozen)
- [ ] Council registration, allergens, privacy wording
