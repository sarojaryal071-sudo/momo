# Technical rulebook

Status: v1, 2026-11-10. Rules and behaviour. Structure lives in `architecture-rulebook.md`.

## 1. Code rules

- Plain HTML, CSS and JavaScript (ES modules). No framework, template engine, CSS framework or UI kit.
- Public site: no libraries at all. Use `fetch`, `localStorage` and the DOM. Admin: one vendored, version-pinned copy of `supabase-js` in `admin/js/vendor/`, no CDN.
- Semantic HTML first. One `h1` per page. Landmarks: `header`, `nav`, `main`, `footer`.
- Write user-supplied text into the page with `textContent`, never `innerHTML`. This matters most in the admin, which displays customer names and notes.
- Small files, one job each. No dead code, no commented-out blocks, no unused CSS.
- Colours, sizes, spacing, radii and timings only through tokens in `frontend/css/theme.css`. No hex values and no pixel values in other CSS files (see `ui-rulebook.md` section 2b). Layouts are fluid, not fixed.
- **No magic numbers.** Quantity limits, text-length limits, timeouts, pickup lead times, the WhatsApp link length cap, retry counts and similar values are named constants in one config place: `frontend/js/site-config.js` in the browser, the `settings` table where the owner should be able to change them, and one constants file inside each edge function. The browser and the function must read the same limits (the function is the authority). Business content (prices, product names, pickup times, notices) is data, never code.
- Text for people is written in the HTML, not assembled in JavaScript, except order messages and error messages.

## 2. Money and orders

- Integer pence in code, JSON and the database. Format with one helper: `formatPrice(pence)` gives "£10" or "£10.50".
- A cart holds slug and quantity only. Names and prices come from `data/products.json`. If a slug is missing or unavailable, show it as unavailable and drop it at checkout.
- Quantity per item: 1 to `max_qty_per_item` (default 10).
- The server recomputes every price and the total. The total shown in the browser is a convenience, not a source of truth.
- Field limits (enforced in the browser and again in the function): name 80 characters, phone 20, notes 500, at most 20 line items.
- Order number: `<prefix>-<date>-<counter>`, date in UK time, for example `SS-1011-01` (DDMM, decision D-032). Assigned only by the backend. 

## 3. Order flow, step by step (decision D-036)

1. Customer adds items; the cart shows the count and the sticky checkout bar.
2. Cart page lists items, options, quantities and the total, then the form: **name (required), phone (required)**, pickup date, pickup time (hour and minute lists inside her window), notes (optional). The phone is checked for UK format and shown back ("We will message you on 07xxx xxxxxx"). Pickup only and "pay cash on pickup" are stated next to the button.
3. Clicking "Place order" disables the button and calls `submitOrder()`.
4. The gateway returns `{ orderNumber, totalPence }`, or fails.
5. The site moves the customer to `done.html?o=<orderNumber>`: an animated "Order received" screen with the order number, the summary, the three next steps ("We will message you on WhatsApp to confirm", "Pick up at <date> <time>; we send the address then", "Pay cash on pickup") and the call and WhatsApp contact links for questions. It never says "confirmed" or "sent". There is **no automatic WhatsApp opening** and no required WhatsApp step.
6. The cart is cleared only after a successful save.

If the backend fails or takes longer than 8 seconds:
- No order number exists. Say so plainly: "We couldn't place your order online. Please send us the WhatsApp message instead, so we receive it."
- Show the pre-filled WhatsApp message button (the order is not lost, because the customer sends it by hand). Keep the cart so they can retry.

In `mock` mode the gateway returns a clearly fake number such as `SS-TEST-01` and nothing is emailed.

## 4. WhatsApp rules (the customer link is optional; the admin message is the main use)

- Link: `https://wa.me/<number>?text=<encodeURIComponent(message)>`. The number is digits only in international format, for example `447413069241`. Confirmed by the owner as the same number as the public phone (D-030).
- A website cannot send the message. Never write "sent" or "your order has been sent via WhatsApp." The customer-side link is only for questions and the failure backup.
- Navigate in the same tab (`location.href`) after the gateway returns. Opening a new window after an async call is often blocked by browsers. The done page always has a visible button as the fallback.
- Message layout (plain text, UK English):
  ```
  Hi! Order <orderNumber>
  - 1 x Frozen chicken momo (40 pieces) £10
  - 2 x Chutney pot £...
  Total £...
  Pickup: <date> <time>   (omit the line if empty)
  Name: <name>            (omit if empty)
  Notes: <notes>          (omit if empty)
  Pay cash on pickup.
  ```
- Keep the encoded link well under 2000 characters; trim notes first if needed.
- The admin's "Message customer" button uses the same link style with the customer's phone and a short template (confirmed, ready for pickup). Convert UK numbers: strip spaces, a leading `0` becomes `44`, remove `+`. If the phone is empty or invalid, disable the button with a clear reason.

## 5. Security

- Row-level security on every table. Test it (section 9).
- The browser never writes to `orders`. The service-role key is only in Supabase function secrets.
- The order form has a hidden honeypot field; a filled field is dropped silently. The function rate-limits by IP. Add Cloudflare Turnstile in Step 5 if spam appears.
- CORS on `place-order` is limited to the site's origins.
- Admin login uses Supabase Auth with an allowlist table (`admins`). No public sign-up. Disable sign-ups in the Supabase project settings.
- No personal data in logs. Log order numbers and error codes only.
- Add a `Content-Security-Policy` meta tag on the admin pages (scripts from self only). On public pages, allow only self and the Supabase URL for `connect-src`.
- No cookies at launch. The cart in `localStorage` is strictly necessary. Do not add analytics or tracking without a consent decision.

## 6. Privacy and data

- Collect only what the form asks for: name and phone are required (D-036), everything else is optional.
- Orders hold personal data (name, phone). A privacy notice is required before ordering goes public (decision D-018). The retention period is not set yet. Build the admin so old orders can be exported and deleted later; do not delete automatically.
- No legal claims in the code or content. The owner confirms legal wording with the council.

## 7. Accessibility

- Every input has a visible `label`. Errors are announced and linked to their field.
- Keyboard works everywhere, with a visible focus ring (already in `base.css`).
- Contrast at least 4.5:1 for body text, 3:1 for large text and UI parts. Coriander green and turmeric are decoration or large text only on cream.
- Touch targets at least 44 by 44 px. Honour `prefers-reduced-motion`.
- Images have honest alt text. Decorative images use `alt=""`.

## 8. Performance budget (mobile)

- Largest Contentful Paint under 2.5 s on a mid-range phone with a normal connection. Lighthouse performance 90 or better on `index.html` and `shop.html`.
- Public JavaScript under 50 KB gzipped in total. One self-hosted heading font is allowed (decision D-025, about 80 KB at most); body text uses the system stack and no other web fonts are downloaded.
- Images: WebP, explicit `width` and `height`, `loading="lazy"` below the fold, hero image sized for mobile first.

## 9. Testing and verification

- Pure logic (cart totals, price formatting, pickup slots, WhatsApp link and phone conversion) gets small tests using Node's built-in test runner (`node --test`). No test framework.
- Backend: SQL or script checks that an anonymous user cannot read or write `orders`, cannot read inactive products, cannot read non-public settings; that a tampered price is ignored; that two simultaneous orders get different numbers.
- Every step ends with a live run: open the pages in a real browser at phone width and desktop width, do the flow, and record what you saw. Include the live URL.
- Before each push: no secrets (search for keys and emails), no `TODO:` left unlisted, no hex values outside `theme.css`.

## 10. Git

- Commit small and often. Message: imperative, one line, for example `Add cart page with quantity controls`.
- Merge into `main` at the end of every step, after that step's verification passes and the tracker is updated, so the owner can see the result live. Never force-push.
- Never commit `node_modules`, `dist`, or any `.env` file.
