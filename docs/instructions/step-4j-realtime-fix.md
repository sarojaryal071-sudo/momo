# Step 4j — Make the live order feed connect (Realtime shows "Reconnecting…")

Prerequisite: Steps 3, 4bc, 4d are merged. Merge `origin/main` first. Read `CLAUDE.md`, D-056, D-057 and `admin/js/api-supabase.js` (`subscribeOrders`), `admin/js/home.js`, `admin/js/orders.js`. Owner rules for the session: write the code, run the build once and only the tests for files you changed; your sandbox cannot reach Supabase, so you cannot reproduce this: do not pretend to; say plainly what is checked and what is not.

## Observed on the live site (owner, iPhone and laptop)

Orders work end to end (placed on the shop, saved in Supabase, shown in the admin, "New order" toast appears, one-minute refresh works). The migration 0005 has run and `public.orders` is in the `supabase_realtime` publication (owner confirmed with a query). But the admin Home and Orders pages show the red **"Reconnecting…"** label permanently, so the channel never reports `SUBSCRIBED` (or flips away from it).

## Do

1. **Authenticate the realtime socket with the admin's session.** After sign-in, on `onAuthStateChange` (SIGNED_IN, TOKEN_REFRESHED) and before subscribing, call `sb.realtime.setAuth(session.access_token)`; subscribe only once a session exists; re-subscribe after a token refresh. The project uses the new publishable key (`sb_publishable_...`, not a JWT); confirm the pinned supabase-js version supports Realtime with it and say which version and why.
2. **Subscription details:** one channel, `postgres_changes` for `INSERT` and `UPDATE` on `public.orders` (schema `public`), no filters that need extra privileges; handle every status: `SUBSCRIBED` -> live; `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED` -> show "Reconnecting…", remove the channel and re-subscribe with a capped exponential backoff (for example 2, 4, 8, 16, 30 seconds, then every 30 s); stop retrying when the page is hidden and resume on `visibilitychange`.
3. **Make the failure visible without devtools:** log each status and any error to `console.warn` with a `[live]` prefix, and put a small **Live feed** line in Settings (admin only, quiet text) showing the last status, the last error text, the time of the last event, and the time of the last refresh. No secrets in it.
4. **Indicator logic:** the "Reconnecting…" label is shown only when the status is not `SUBSCRIBED` for more than about 3 seconds (avoid flicker during the first connect); when connected it shows nothing. Check the logic in `home.js` and `orders.js` so a late `SUBSCRIBED` hides it.
5. **If the cause turns out to be elsewhere** (for example Realtime not enabled for the project, or RLS), add a clear note in `backend/README.md` and in your report with the exact owner action.

## Do not

Add socket.io or any server, change order logic, or touch the public site.

## Report

Under 15 lines: the most likely cause you found and why, what you changed, what you could not check, and what the owner should check on the live site (Home shows no "Reconnecting…", the Settings "Live feed" line says connected, and a new test order appears within about a second without a refresh).
