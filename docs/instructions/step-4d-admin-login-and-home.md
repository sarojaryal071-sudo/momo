# Step 4d — Admin login page and Home (decision D-059)

Prerequisite: Steps 3 and 4bc are merged. Merge `origin/main` first. Read `CLAUDE.md`, D-051, D-052, D-056 to D-059, `docs/design/type-and-spacing-spec.md` sections 3 to 5. Do only this step. Owner rules for the session: write the code, no full test suite, no screenshot matrix; build once and run only the tests for files you changed; say plainly what you did and did not check. No credentials in the repo.

## 1. Login page (`admin/login.html`)

- Wordmark and the title "Admin". Email and password fields (16 px text, 44 px high, labels above), a show/hide password toggle (button with accessible name), one **Log in** button with a loading state, a neutral error ("Email or password is wrong") that never reveals whether an email exists, no sign-up link, `noindex`, autofill and password-manager friendly (`autocomplete` attributes), Enter submits.
- **Forgot password** link: asks for the email, calls Supabase reset, always shows the same neutral message ("If that email has an account, a reset link is on its way"). Add a reset-password page (`admin/reset.html`) that sets a new password from the link. Help text under the link is not needed; mention in the report that Supabase's built-in sender only delivers to organisation members until a custom sender exists (D-059).
- **Desktop (from the desktop token):** two columns. Left: an emerald brand panel with an existing momo photo from `frontend/assets/img` (no new images), the wordmark and the tagline. Right: the form, vertically centred, max width about 22 rem.
- **Phone:** no photo. Full-page background: white with two or three large, soft blurred emerald and sage colour patches (CSS only, `filter: blur`, behind everything, fixed position so they do not scroll, no gradients, no animation, `pointer-events: none`), the form card in front. At most these patches blur; no other element on the page blurs. Contrast of all text on the form is checked against 4.5:1.
- **Session:** about 30 days. Named constant `ADMIN_SESSION_DAYS = 30` in `admin-config.js`. Store the login time in the browser; when the limit passes, sign out and show the login page with a short message. Supabase refreshes the session meanwhile. Logging out clears it. A user who is already signed in and opens the login page goes straight to Home.

## 2. Home (`admin/index.html` becomes Home; Orders moves to `orders.html`)

After login she lands on Home. One screen, phone first, no scrolling needed for the key numbers:

- Greeting line with today's date; a **paused strip** when ordering is paused.
- **Tiles (compact, not identical decorative cards):** New orders (count, taps to Orders filtered New); Today's pickups (count and next pickup time); Tomorrow's pickups; Low or out of stock items (names); Orders waiting for confirmation older than a named constant (for example 30 minutes) highlighted in text, not colour alone.
- **Today's pickups list:** the next few pickups with time, name and status, tapping opens the order.
- **Shop status:** ordering open or paused with a toggle; the Publish status (Live, Publishing, Failed, Unpublished changes with a Publish button).
- Quick links: Prep list, Add manual order.
- Live updates through Realtime (D-057) with the same fallback refresh; no extra queries beyond what the tiles need.
- A real empty state when nothing is happening ("No orders yet today").

## 3. Navigation

Bottom tab bar (and the desktop sidebar): **Home, Orders, Products, Pickup, Settings**. Prep list leaves the tab bar and stays reachable from Home and from the Orders title row. Update every admin page's tab bar, titles, active states and links, and any test that depends on them.

## Do not

Add libraries; add gradients; blur anything other than the phone login patches; show any demo, sample or TODO wording; store credentials; change the database unless a new forward-only migration is truly needed.

## Report

Under 30 lines: what was built, files changed, what was and was not checked, what the owner should test (login on phone and laptop, forgot password with the owner's own email, 30-day setting, Home tiles with a placed test order, tab bar on every page).
