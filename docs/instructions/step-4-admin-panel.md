# Step 4 — Admin panel (overview)

The admin panel is built in **three sub-steps**, in this order. Each is merged and verified on a phone before the next starts. Decisions: D-009, D-021, D-031, D-034 to D-038, D-043 to D-047.

1. `step-4a-admin-orders.md` — login, orders, prep list, WhatsApp messages, pause ordering, templates.
2. `step-4b-admin-products.md` — products, photos, stock, options, ingredients and allergens.
3. `step-4c-admin-pickup-settings.md` — pickup windows, settings, notice, daily limit, export, manual orders, home screen.

**Order change (D-048):** the admin is built first on the demo backend (`mock`), so Step 3 is not a prerequisite. Step 3 afterwards connects Supabase to both the public site and the admin. Each sub-step file lists its own prerequisites, rules, verification and report. This file replaces the earlier single Step 4 and keeps nothing else.
