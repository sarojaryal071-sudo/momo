# Step 4i — Admin sales summary (decision D-064)

Prerequisite: Steps 4bc, 4d and 4f are merged. Merge `origin/main` first. Read `CLAUDE.md`, D-051, D-052, D-059, D-061, D-064, `backend/README.md`, and the `orders` table and `set_order_status` function. Owner rules for the session: write the code, run the build once and only the tests for files you changed; look at your own 390 px screenshots of Home and Sales and say what you saw; no visible demo, sample or TODO wording; use the 4f admin look.

## Rules for the numbers

- **Sales total** = sum of order totals for orders with status **Collected**, in pounds (integer pence in code and database). **Order count** = number of those orders. Cancelled, New, Confirmed and Ready orders are not counted.
- Attribute an order to the day it was collected (UK time, `Europe/London`) if the table stores a collected timestamp; otherwise to its pickup date. Say which you used.
- Weeks start on Monday. Periods: **Today, This week, This month, Custom** (two date fields appear only for Custom; validate From not after To).

## Database

A new forward-only migration (do not edit older ones): an **admin-only** SQL function `sales_summary(from_date date, to_date date)` returning, per day in the range, the total in pence and the number of Collected orders (days with no sales return zero). Same access pattern as `set_order_status` (admins only; anonymous users and non-admins get nothing); add it to the policy tests only if the existing tests make that cheap, otherwise state that you did not run them. Do not expose customer details through it.

## Home (`admin/`)

Add a compact **This week** strip below the main tiles: two figures, "Sales £xx.xx" and "Orders n", the label "Collected orders, Mon to Sun", and a "See sales" link to the Sales page. A real empty state ("No collected orders yet this week"). It refreshes with the Home data; no extra polling.

## Sales page (`admin/sales`, clean URL, not in the tab bar)

- Reachable from the Home strip and from a link on the Orders title row; back arrow to Home; the tab bar highlights Home.
- Glass top bar and solid cards as in 4f. A **period picker** (chips or a dropdown: Today, This week, This month, Custom), the choice remembered for the session.
- Two large figures: **Sales** (£) and **Orders** (count), each with the period dates under it.
- A **simple bar chart** by day for the chosen period (hand-written inline SVG or CSS bars, no library): bars use emerald, each bar has a visible value label or is reachable by keyboard/tap with its date and amount, y-axis starts at zero, works at 320 px (for a month show weekly bars if daily bars would be too thin), text alternative provided (a visually hidden table of the same numbers). Chart colours meet 3:1 against the background.
- Empty state for periods with no sales.
- Money formatted £10 or £10.50; dates in UK format; tabular figures.

## Do not

Add best sellers, averages, repeat-customer, expected-sales or per-product figures; add libraries; change order statuses or order logic; touch the public site.

## Report

Under 20 lines: migration file name, what was built, which date attribution you used, what you checked (mock backend) and did not check (Supabase unreachable from your sandbox), and what the owner should test after the deploy workflow applies the migration (collect a test order, see it in the Home strip and Sales for Today, This week, This month and Custom; cancel an order and confirm it is not counted).
