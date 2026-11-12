-- Real starting data (D-055). Idempotent: running it again changes nothing. No personal data and no orders.
-- Values the owner has not confirmed yet are starting values she changes in the admin: sauce prices (unset, hidden),
-- pickup hours, the daily limit (none) and stock (not tracked until she sets it).

insert into public.products (slug, name, kind, unit_label, price_pence, available, photo_path, sort_order, active) values
  ('chicken-momo', 'Frozen chicken momo', 'pack', '40 pieces', 1000, true, 'pack-chicken', 1, true),
  ('veg-momo',     'Frozen veg momo',     'pack', '40 pieces', 1000, true, 'pack-veg',     2, true),
  ('chutney-pot',  'Chutney pot',         'addon', '1 pot', null, false, null, 3, false),
  ('hot-sauce-pot','Hot sauce pot',       'addon', '1 pot', null, false, null, 4, false)
on conflict (slug) do nothing;

-- Option groups the shop already shows (leave out, spice level). The owner can edit them in the admin.
insert into public.product_option_groups (product_id, label, kind, sort_order)
select p.id, g.label, g.kind, g.sort_order from public.products p
cross join (values ('Leave out', 'multiple', 1), ('Spice level', 'single', 2)) as g(label, kind, sort_order)
where p.slug in ('chicken-momo', 'veg-momo')
on conflict (product_id, label) do nothing;
insert into public.product_option_groups (product_id, label, kind, sort_order)
select p.id, 'Spice level', 'single', 1 from public.products p where p.slug in ('chutney-pot', 'hot-sauce-pot')
on conflict (product_id, label) do nothing;

insert into public.product_options (group_id, label, price_delta_pence, is_default, sort_order)
select g.id, o.label, 0, o.is_default, o.sort_order
from public.product_option_groups g join public.products p on p.id = g.product_id
join (values ('Leave out', 'No onion', false, 1), ('Leave out', 'No coriander', false, 2),
             ('Spice level', 'Mild', false, 1), ('Spice level', 'Medium', true, 2), ('Spice level', 'Hot', false, 3)) as o(glabel, label, is_default, sort_order)
  on o.glabel = g.label
on conflict (group_id, label) do nothing;

insert into public.settings (key, value) values
  ('order_prefix', '"SS"'), ('min_lead_hours', '24'), ('max_days_ahead', '14'), ('max_qty_per_item', '10'),
  ('custom_min_lead_hours', '48'), ('low_stock_threshold', '5'),
  ('ordering_open', 'true'), ('ordering_closed_message', '"We are not taking orders right now. Please check back soon."'),
  ('max_orders_per_day', 'null'),
  ('wa_template_confirmed', to_jsonb('Hi {name}, your order {order_number} is confirmed.' || E'\n' || '{items}' || E'\n' || 'Pickup: {pickup}' || E'\n' || 'Address: {address}' || E'\n' || 'Pay cash when you pick up. Thank you!'::text)),
  ('wa_template_ready', to_jsonb('Hi {name}, your order {order_number} is ready for pickup.' || E'\n' || '{items}' || E'\n' || 'Address: {address}' || E'\n' || 'Pay cash when you pick up.'::text)),
  ('wa_template_cancelled', to_jsonb('Hi {name}, sorry, we had to cancel your order {order_number}. Please message us if you would like to order again.'::text)),
  ('pickup_address_text', '""')
on conflict (key) do nothing;

insert into public.pickup_rules (weekday, start_time, end_time, slot_minutes, active)
select w, '10:00', '18:00', 1, true from (values (6), (0)) as d(w)
where not exists (select 1 from public.pickup_rules);

insert into public.site_notice (id, message, active) values (1, '', false) on conflict (id) do nothing;
insert into public.site_status (id, state, unpublished) values (1, 'live', false) on conflict (id) do nothing;
