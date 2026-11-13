-- Database tests (Step 3). Run by run-local.sh on a local PostgreSQL, or against a Supabase test project with psql as the postgres role
-- (see backend/README.md). Every check prints "ok - ..." and the first failure stops the run.
-- Fixed clock: Friday 13 Nov 2026 12:00 UK time (GMT). Rules seeded: Saturday and Sunday 10:00 to 18:00, 1-minute steps.
\set ON_ERROR_STOP on
create schema t;
create function t.chk(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin if p_cond is not true then raise exception 'FAILED: %', p_msg; end if; raise notice 'ok - %', p_msg; end $$;
-- outcome of running SQL as a role: ok, denied (no privilege or row-level security) or error:<sqlstate>
create function t.try(p_role text, p_uid uuid, p_sql text) returns text language plpgsql as $$
declare r text;
begin
  begin
    perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
    execute format('set local role %I', p_role);
    execute p_sql;
    r := 'ok';
  exception when insufficient_privilege then r := 'denied';
            when others then r := 'error:' || sqlstate || ':' || sqlerrm;
  end;
  reset role;
  return r;
end $$;
create function t.count(p_role text, p_uid uuid, p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute format('set local role %I', p_role);
  execute 'select count(*) from (' || p_sql || ') q' into n;
  reset role;
  return n;
end $$;
-- rows changed by an INSERT, UPDATE or DELETE run as a role
create function t.affected(p_role text, p_uid uuid, p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute format('set local role %I', p_role);
  execute p_sql;
  get diagnostics n = row_count;
  reset role;
  return n;
end $$;
-- runs an action, THEN checks a condition, strictly in that order (a single SELECT may not see its own function's writes)
create function t.seq(p_action text, p_check text) returns boolean language plpgsql as $$
declare r boolean;
begin execute p_action; execute p_check into r; return coalesce(r, false); end $$;
create function t.order_json(p_slug text, p_qty integer, p_opts jsonb default '[]', p_extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('items', jsonb_build_array(jsonb_build_object('slug', p_slug, 'qty', p_qty, 'options', p_opts)), 'name', 'Test Buyer', 'phone', '07700 900123') || p_extra $$;
create function t.opt(p_slug text, p_group text, p_label text) returns text language sql as $$
  select o.id::text from product_options o join product_option_groups g on g.id = o.group_id join products p on p.id = g.product_id
  where p.slug = p_slug and g.label = p_group and o.label = p_label $$;
create function t.stock(p_slug text) returns integer language sql as $$ select quantity from product_stock s join products p on p.id = s.product_id where p.slug = p_slug $$;
create function t.place(p jsonb, p_now timestamptz default '2026-11-13 12:00:00+00') returns jsonb language sql as $$ select public._place_order(p, false, p_now) $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'admin@test'), ('00000000-0000-0000-0000-00000000000b', 'plain@test');
insert into admins (user_id) values ('00000000-0000-0000-0000-00000000000a');
insert into product_stock (product_id, quantity) select id, 10 from products where slug in ('chicken-momo', 'veg-momo');

-- ===== anonymous visitors =====
select t.chk(t.try('anon', null, 'select * from orders') = 'denied', 'anon cannot read orders');
select t.chk(t.try('anon', null, 'insert into orders (order_number, order_date, items, total_pence) values (''x'', now(), ''[]'', 0)') = 'denied', 'anon cannot insert orders');
select t.chk(t.try('anon', null, 'update orders set status = ''cancelled''') = 'denied', 'anon cannot update orders');
select t.chk(t.try('anon', null, 'delete from orders') = 'denied', 'anon cannot delete orders');
select t.chk(t.count('anon', null, 'select 1 from products') = 2, 'anon sees only the 2 active products (4 exist)');
select t.chk(t.count('anon', null, 'select 1 from settings where key in (''pickup_address_text'', ''max_orders_per_day'', ''wa_template_ready'', ''order_prefix'')') = 0, 'anon cannot read private settings');
select t.chk(t.count('anon', null, 'select 1 from settings where key in (''ordering_open'', ''min_lead_hours'', ''custom_min_lead_hours'')') = 3, 'anon can read the public settings');
select t.chk(t.count('anon', null, 'select 1 from product_options') = 10, 'anon sees active options of active products only (2 momo x 5)');
select t.chk(t.try('anon', null, 'select * from order_counters') = 'denied', 'anon cannot read order_counters');
select t.chk(t.try('anon', null, 'select * from rate_limits') = 'denied', 'anon cannot read rate_limits');
select t.chk(t.try('anon', null, 'select * from admins') = 'denied', 'anon cannot read admins');
select t.chk(t.try('anon', null, 'select * from site_status') = 'denied', 'anon cannot read site_status');
select t.chk(t.try('anon', null, 'select public.place_order(''{}''::jsonb)') = 'denied', 'anon cannot call place_order');
select t.chk(t.try('anon', null, 'select public.set_order_status(gen_random_uuid(), ''ready'')') = 'denied', 'anon cannot call set_order_status');
select t.chk(t.try('anon', null, 'select public.create_manual_order(''{}''::jsonb)') = 'denied', 'anon cannot call create_manual_order');
select t.chk(t.try('anon', null, 'select public.set_site_status(''live'')') = 'denied', 'anon cannot call set_site_status');
select t.chk(t.try('anon', null, 'select public.check_rate_limit(''k'', 1, 60)') = 'denied', 'anon cannot call check_rate_limit');
select t.chk(t.try('anon', null, 'select * from public.full_pickup_dates()') = 'ok', 'anon can call full_pickup_dates');
select t.chk(t.try('anon', null, 'insert into storage.objects (bucket_id, name) values (''product-images'', ''x.webp'')') = 'denied', 'anon cannot upload a photo');
select t.chk(t.count('anon', null, 'select 1 from storage.buckets where id = ''product-images'' and public') = 1, 'the photo bucket is public read');

-- ===== one write policy test per table: anon and a signed-in non-admin are refused, an admin is allowed =====
\set a '00000000-0000-0000-0000-00000000000a'
\set b '00000000-0000-0000-0000-00000000000b'
create function t.table_policy(p_table text, p_insert text, p_update text, p_delete text) returns void language plpgsql as $$
begin
  perform t.chk(t.try('anon', null, p_insert) = 'denied', p_table || ': anon cannot insert');
  perform t.chk(t.try('anon', null, p_update) = 'denied', p_table || ': anon cannot update');
  perform t.chk(t.try('anon', null, p_delete) = 'denied', p_table || ': anon cannot delete');
  perform t.chk(t.try('authenticated', '00000000-0000-0000-0000-00000000000b', p_insert) = 'denied', p_table || ': a non-admin cannot insert');
  perform t.chk(t.affected('authenticated', '00000000-0000-0000-0000-00000000000b', p_update) = 0, p_table || ': a non-admin updates nothing');
  perform t.chk(t.try('authenticated', '00000000-0000-0000-0000-00000000000a', p_insert) = 'ok', p_table || ': an admin can insert');
  perform t.chk(t.affected('authenticated', '00000000-0000-0000-0000-00000000000a', p_update) >= 1, p_table || ': an admin can update');
  perform t.chk(t.try('authenticated', '00000000-0000-0000-0000-00000000000a', p_delete) = 'ok', p_table || ': an admin can delete');
end $$;
select t.table_policy('products', $$insert into products (slug, name, kind) values ('tp', 'Policy test', 'pack')$$, $$update products set name = 'Policy test 2' where slug = 'tp'$$, $$delete from products where slug = 'tp'$$);
select t.table_policy('product_option_groups', $$insert into product_option_groups (product_id, label, kind) select id, 'TP', 'single' from products where slug = 'chicken-momo'$$, $$update product_option_groups set sort_order = 9 where label = 'TP'$$, $$delete from product_option_groups where label = 'TP'$$);
select t.table_policy('product_options', $$insert into product_options (group_id, label) select g.id, 'TP' from product_option_groups g join products p on p.id = g.product_id where p.slug = 'chicken-momo' and g.label = 'Leave out'$$, $$update product_options set sort_order = 9 where label = 'TP'$$, $$delete from product_options where label = 'TP'$$);
select id as chutney from products where slug = 'chutney-pot' \gset
select t.table_policy('product_stock', format('insert into product_stock (product_id, quantity) values (%L, 3)', :'chutney'), format('update product_stock set quantity = 4 where product_id = %L', :'chutney'), format('delete from product_stock where product_id = %L', :'chutney'));
select t.table_policy('pickup_rules', $$insert into pickup_rules (weekday, start_time, end_time) values (3, '09:00', '10:00')$$, $$update pickup_rules set slot_minutes = 5 where weekday = 3$$, $$delete from pickup_rules where weekday = 3$$);
select t.table_policy('pickup_exceptions', $$insert into pickup_exceptions (date, kind, note) values ('2030-01-01', 'closed', 'tp')$$, $$update pickup_exceptions set note = 'tp2' where note = 'tp'$$, $$delete from pickup_exceptions where date = '2030-01-01'$$);
-- site_notice has a single row (id = 1), so it is tested with update and delete-and-recreate
select t.chk(t.try('anon', null, 'update site_notice set message = ''x''') = 'denied', 'site_notice: anon cannot update');
select t.chk(t.affected('authenticated', '00000000-0000-0000-0000-00000000000b', 'update site_notice set message = ''x''') = 0, 'site_notice: a non-admin updates nothing');
select t.chk(t.try('authenticated', '00000000-0000-0000-0000-00000000000b', 'insert into site_notice (id, message) values (3, ''x'')') = 'denied', 'site_notice: a non-admin cannot insert');
select t.chk(t.affected('authenticated', '00000000-0000-0000-0000-00000000000a', 'update site_notice set message = ''tp'', active = true') = 1, 'site_notice: an admin can update');
select t.chk(t.count('anon', null, 'select 1 from site_notice where active') = 1, 'site_notice: anon can read the notice');
select t.table_policy('settings', $$insert into settings (key, value) values ('tp', '1')$$, $$update settings set value = '2' where key = 'tp'$$, $$delete from settings where key = 'tp'$$);
update site_notice set message = '' where id = 1;
select t.chk(t.try('authenticated', :'b', 'select * from site_status') = 'ok' and t.count('authenticated', :'b', 'select 1 from site_status') = 0, 'a non-admin sees no site_status row');
select t.chk(t.count('authenticated', :'a', 'select 1 from site_status') = 1, 'an admin reads site_status');
select t.chk(t.try('authenticated', :'a', 'update site_status set state = ''failed''') = 'denied', 'an admin cannot write site_status directly');
select t.chk(t.count('authenticated', :'a', 'select 1 from admins') = 1, 'an admin reads only their own admins row');
select t.chk(t.count('authenticated', :'b', 'select 1 from admins') = 0, 'a non-admin reads no admins row');
select t.chk(t.try('authenticated', :'a', 'insert into admins (user_id) values (gen_random_uuid())') = 'denied', 'an admin cannot add admins from the browser');
select t.chk(t.try('authenticated', :'a', 'select * from order_counters') = 'denied', 'an admin cannot read order_counters');
select t.chk(t.try('authenticated', :'a', 'insert into storage.objects (bucket_id, name) values (''product-images'', ''a.webp'')') = 'ok', 'an admin can upload a photo');
select t.chk(t.try('authenticated', :'b', 'insert into storage.objects (bucket_id, name) values (''product-images'', ''b.webp'')') = 'denied', 'a non-admin cannot upload a photo');

-- ===== live order feed (D-057) =====
select t.chk((select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') = 1, 'orders are published to Realtime');
select t.chk((select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename not in ('orders')) = 0, 'no other table is published to Realtime');
select t.chk(not has_table_privilege('anon', 'public.orders', 'select') and not exists (select 1 from pg_policies where tablename = 'orders' and 'anon' = any (roles)), 'an anonymous client can read no orders, so Realtime sends it no events');

-- ===== allergens and ingredients as data (D-062) =====
select t.chk((select count(*) from allergens) = 14, 'the 14 UK allergens are seeded as ordinary rows');
select t.chk(t.count('anon', null, 'select 1 from allergens') = 14, 'anon can read the allergen names');
select t.table_policy('allergens', $$insert into allergens (name, sort_order) values ('TP allergen', 99)$$, $$update allergens set sort_order = 98 where name = 'TP allergen'$$, $$delete from allergens where name = 'TP allergen'$$);
select t.table_policy('product_allergens', $$insert into product_allergens (product_id, allergen_id) select p.id, a.id from products p, allergens a where p.slug = 'chicken-momo' and a.name = 'Milk'$$, $$update product_allergens set created_at = now() where allergen_id = (select id from allergens where name = 'Milk')$$, $$delete from product_allergens where allergen_id = (select id from allergens where name = 'Milk')$$);
select t.table_policy('product_ingredients', $$insert into product_ingredients (product_id, name, sort_order) select id, 'TP tag', 1 from products where slug = 'chicken-momo'$$, $$update product_ingredients set sort_order = 2 where name = 'TP tag'$$, $$delete from product_ingredients where name = 'TP tag'$$);
select t.chk(t.try('anon', null, 'insert into allergens (name) values (''x'')') = 'denied', 'anon cannot add an allergen');
select t.chk(t.try('authenticated', '00000000-0000-0000-0000-00000000000a', 'insert into allergens (name) values (''celery'')') like 'error:23505%', 'an allergen name cannot be added twice (any capitals)');
select t.chk((select count(*) from information_schema.columns where table_name = 'products' and column_name = 'allergens_checked_at') = 1, 'products.allergens_checked_at exists');
insert into product_allergens (product_id, allergen_id) select p.id, a.id from products p, allergens a where p.slug = 'chicken-momo' and a.name = 'Milk';
select t.chk(t.count('anon', null, 'select 1 from product_allergens') = 1, 'anon can read the allergens of an active product');
delete from product_allergens;
update site_status set unpublished = false;
insert into allergens (name, sort_order) values ('Marker allergen', 50);
select t.chk((select unpublished from site_status), 'adding an allergen marks unpublished changes');
delete from allergens where name = 'Marker allergen';

-- ===== weekly pickup hours: replace_pickup_rules (D-063) =====
select t.chk(t.try('anon', null, $$select public.replace_pickup_rules('[]'::jsonb)$$) = 'denied', 'anon cannot replace the pickup rules');
select t.chk(t.try('authenticated', :'b', $$select public.replace_pickup_rules('[]'::jsonb)$$) = 'denied', 'a non-admin cannot replace the pickup rules');
select count(*) as rules_before from pickup_rules \gset
select t.chk(t.try('authenticated', :'a', $$select public.replace_pickup_rules('[{"weekday":6,"start_time":"10:00","end_time":"13:00"},{"weekday":6,"start_time":"12:00","end_time":"15:00"}]'::jsonb)$$) like 'error:22023%', 'overlapping windows are refused');
select t.chk((select count(*) from pickup_rules) = :rules_before, 'a refused save leaves the old hours exactly as they were');
select t.chk(t.try('authenticated', :'a', $$select public.replace_pickup_rules('[{"weekday":6,"start_time":"15:00","end_time":"10:00"}]'::jsonb)$$) like 'error:23514%', 'a window that ends before it starts is refused and nothing changes');
select t.chk((select count(*) from pickup_rules) = :rules_before, 'still the old hours');
select t.chk(t.try('authenticated', :'a', $$select public.replace_pickup_rules('[{"weekday":1,"start_time":"09:00","end_time":"12:00"},{"weekday":1,"start_time":"13:00","end_time":"17:00"},{"weekday":2,"start_time":"09:00","end_time":"12:00"}]'::jsonb)$$) = 'ok', 'an admin replaces the week');
select t.chk((select count(*) from pickup_rules) = 3 and (select count(*) from pickup_rules where weekday = 1) = 2, 'the new rows are written, one per day and window');
select public.replace_pickup_rules('[{"weekday":6,"start_time":"10:00","end_time":"18:00"},{"weekday":0,"start_time":"10:00","end_time":"18:00"}]'::jsonb) where false;
delete from pickup_rules;
insert into pickup_rules (weekday, start_time, end_time, slot_minutes, active) values (6, '10:00', '18:00', 1, true), (0, '10:00', '18:00', 1, true);

-- ===== placing orders =====
select t.chk(t.seq($$select t.place(t.order_json('chicken-momo', 1))$$, $$select (select order_number from orders order by created_at desc limit 1) = 'SS-1311-01'$$), 'an order with every optional field empty succeeds, number SS-DDMM-NN');
select t.chk((select total_pence from orders where order_number = 'SS-1311-01') = 1000 and (select pickup_date from orders where order_number = 'SS-1311-01') is null, 'no pickup date is allowed and the price comes from the table');
select t.chk(t.stock('chicken-momo') = 9, 'a standard order lowers stock');
select t.chk(t.seq($$select t.place(t.order_json('chicken-momo', 1, '[]', '{"notes":"hello","pickupDate":"2026-11-14","pickupTime":"12:30"}'))$$, $$select (select notes || pickup_time::text from orders order by created_at desc limit 1) = 'hello12:30:00'$$), 'an order with every field filled succeeds');
select t.chk((select order_number from orders order by created_at desc limit 1) = 'SS-1311-02', 'the second order of the day is -02');
-- tampered prices are ignored: the caller can only send slug, qty and option ids
select t.chk(t.seq($$select t.place(t.order_json('veg-momo', 2) || '{"total_pence":1,"items":[{"slug":"veg-momo","qty":2,"unit_price_pence":1,"price_pence":1,"options":[]}]}')$$, $$select (select total_pence from orders order by created_at desc limit 1) = 2000$$), 'a tampered price is ignored (2 x 1000)');
-- options
select t.chk(t.seq($$select t.place(t.order_json('chicken-momo', 1, jsonb_build_array(t.opt('chicken-momo', 'Spice level', 'Medium'))))$$, $$select not (select (items -> 0 ->> 'customised')::boolean from orders order by created_at desc limit 1)$$), 'the default option does not make an order customised');
select t.chk(t.seq($$select t.place(t.order_json('chicken-momo', 1, jsonb_build_array(t.opt('chicken-momo', 'Spice level', 'Hot'), t.opt('chicken-momo', 'Leave out', 'No onion'))))$$, $$select (select (items -> 0 ->> 'customised')::boolean and jsonb_array_length(items -> 0 -> 'options') = 2 from orders order by created_at desc limit 1)$$), 'a non-default option makes it customised and is stored in the snapshot');
select t.chk(t.stock('chicken-momo') = 7, 'a customised order does not lower stock (10 - 1 - 1 - 1 standard orders = 7)');
select t.chk(t.place(t.order_json('chicken-momo', 1, jsonb_build_array(t.opt('veg-momo', 'Spice level', 'Hot')))) ->> 'code' = 'option', 'an option from another product is rejected');
select t.chk(t.place(t.order_json('chicken-momo', 1, jsonb_build_array(t.opt('chicken-momo', 'Spice level', 'Hot'), t.opt('chicken-momo', 'Spice level', 'Mild')))) ->> 'code' = 'option', 'two options in a single group are rejected');
update product_options set active = false where label = 'No coriander';
select t.chk(t.place(t.order_json('chicken-momo', 1, jsonb_build_array(t.opt('chicken-momo', 'Leave out', 'No coriander')))) ->> 'code' = 'option', 'an inactive option is rejected');
update product_options set active = true where label = 'No coriander';
update product_options set price_delta_pence = 50 where label = 'Hot' and group_id = (select g.id from product_option_groups g join products p on p.id = g.product_id where p.slug = 'veg-momo' and g.label = 'Spice level');
select t.chk(t.seq($$select t.place(t.order_json('veg-momo', 1, jsonb_build_array(t.opt('veg-momo', 'Spice level', 'Hot'))))$$, $$select (select total_pence from orders order by created_at desc limit 1) = 1050$$), 'a real option price change is added (1000 + 50)');
select t.chk((t.place(t.order_json('veg-momo', 1, jsonb_build_array(t.opt('veg-momo', 'Spice level', 'Hot')), '{}') || '{"items":[{"slug":"veg-momo","qty":1,"options":[{"label":"Hot","price_delta_pence":0}]}]}') ->> 'ok') is distinct from 'true', 'option objects with a tampered delta are not accepted (ids only)');
-- required fields, limits, availability
select t.chk(t.place(t.order_json('chicken-momo', 1, '[]', '{"name":""}')) ->> 'code' = 'name', 'a name is required');
select t.chk(t.place(t.order_json('chicken-momo', 1, '[]', '{"phone":"12345"}')) ->> 'code' = 'phone', 'a UK phone number is required');
select t.chk((t.place(t.order_json('chicken-momo', 1, '[]', '{"phone":"+44 7700 900123"}')) ->> 'ok')::boolean, '+44 numbers are accepted');
select t.chk(t.place(t.order_json('chicken-momo', 11)) ->> 'code' = 'quantity', 'a quantity above the limit is rejected');
select t.chk(t.place(t.order_json('chicken-momo', 0)) ->> 'code' = 'quantity', 'a quantity of 0 is rejected');
select t.chk(t.place(t.order_json('no-such-product', 1)) ->> 'code' = 'product', 'an unknown product is rejected');
select t.chk(t.place(t.order_json('chutney-pot', 1)) ->> 'code' = 'product', 'an inactive product without a price is rejected');
select t.chk(t.place('{"items":[],"name":"A","phone":"07700900123"}') ->> 'code' = 'empty', 'an empty cart is rejected');
-- stock
update product_stock set quantity = 0 where product_id = (select id from products where slug = 'veg-momo');
select t.chk(t.place(t.order_json('veg-momo', 1)) ->> 'code' = 'stock', 'a sold-out product is rejected');
select t.chk(t.seq($$select t.place(t.order_json('veg-momo', 1, jsonb_build_array(t.opt('veg-momo', 'Spice level', 'Hot'))))$$, $$select (select quantity from product_stock s join products p on p.id = s.product_id where p.slug = 'veg-momo') = 0 and (select (items -> 0 ->> 'customised')::boolean from orders order by created_at desc limit 1)$$), 'a customised order of a sold-out product is made to order and stock stays 0');
update product_stock set quantity = 2 where product_id = (select id from products where slug = 'veg-momo');
select t.chk(t.place(t.order_json('veg-momo', 3)) ->> 'message' = 'Only 2 of Frozen veg momo left.' and t.stock('veg-momo') = 2, 'a quantity above the stock is rejected and stock never goes below 0');
-- pickup rules
select t.chk(t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-11-14","pickupTime":"10:30"}')) ->> 'code' = 'pickup', 'a time earlier than the 24 hour notice is rejected');
select t.chk(t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-11-16","pickupTime":"10:30"}')) ->> 'code' = 'pickup', 'a Monday (no rule) is rejected');
select t.chk(t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-11-14","pickupTime":"18:00"}')) ->> 'code' = 'pickup', 'a time outside the window is rejected');
select t.chk((t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-11-14","pickupTime":"17:59"}')) ->> 'ok')::boolean, 'any minute inside the window is valid (17:59)');
select t.chk(t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-12-05","pickupTime":"11:00"}')) ->> 'code' = 'pickup', 'a date beyond max_days_ahead is rejected');
select t.chk(t.place(t.order_json('chicken-momo', 1, jsonb_build_array(t.opt('chicken-momo', 'Spice level', 'Hot')), '{"pickupDate":"2026-11-14","pickupTime":"12:30"}')) ->> 'message' = 'Customised orders need 2 days'' notice. Please choose a later day.', 'a customised order inside its 48 hour notice is rejected');
select t.chk((t.place(t.order_json('chicken-momo', 1, jsonb_build_array(t.opt('chicken-momo', 'Spice level', 'Hot')), '{"pickupDate":"2026-11-15","pickupTime":"12:30"}')) ->> 'ok')::boolean, 'a customised order after its notice period is accepted');
insert into pickup_exceptions (date, kind, note) values ('2026-11-21', 'closed', 'closed all day');
select t.chk(t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-11-21","pickupTime":"11:00"}')) ->> 'code' = 'pickup', 'a closed day is rejected');
insert into pickup_exceptions (date, kind, start_time, end_time, note) values ('2026-11-22', 'closed', '12:00', '14:00', 'lunch');
select t.chk(t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-11-22","pickupTime":"13:00"}')) ->> 'code' = 'pickup' and (t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-11-22","pickupTime":"14:00"}')) ->> 'ok')::boolean, 'a partly closed day refuses the closed hours only');
insert into pickup_exceptions (date, kind, start_time, end_time, note) values ('2026-11-25', 'extra', '09:00', '10:00', 'extra Wednesday');
select t.chk((t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-11-25","pickupTime":"09:30"}')) ->> 'ok')::boolean, 'an extra opening day is accepted');
-- pause and daily limit
update settings set value = 'false' where key = 'ordering_open';
select t.chk(t.place(t.order_json('chicken-momo', 1)) ->> 'code' = 'paused', 'a paused shop refuses orders');
select t.chk(t.place(t.order_json('chicken-momo', 1)) ->> 'message' = 'We are not taking orders right now. Please check back soon.', 'the paused message is returned');
update settings set value = 'true' where key = 'ordering_open';
update settings set value = '1' where key = 'max_orders_per_day';
delete from orders where pickup_date = '2026-11-14' or pickup_date = '2026-11-15';
select t.chk((t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-11-14","pickupTime":"13:00"}')) ->> 'ok')::boolean, 'the first order of a day with a limit of 1 succeeds');
select t.chk(t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-11-14","pickupTime":"14:00"}')) ->> 'code' = 'day_full', 'the second order on a full day is refused');
select t.chk((select array_agg(d) from public.full_pickup_dates('2026-11-14', '2026-11-14') d) = array['2026-11-14'::date], 'full_pickup_dates lists the full day (dates only)');
select t.chk(t.count('anon', null, 'select * from public.full_pickup_dates(''2026-11-14'', ''2026-11-14'')') = 1, 'anon can see which dates are full');
update settings set value = 'null' where key = 'max_orders_per_day';

-- ===== set_order_status =====
update product_stock set quantity = 5 where product_id = (select id from products where slug = 'chicken-momo');
select t.place(t.order_json('chicken-momo', 2, '[]', '{"pickupDate":"2026-11-15","pickupTime":"11:00"}'));
create temp table sel as select id from orders order by created_at desc limit 1;
select t.chk(t.stock('chicken-momo') = 3, 'a 2-pack order takes 2 from stock 5');
select t.chk(t.seq($$select public._set_order_status((select id from sel), 'cancelled')$$, $$select t.stock('chicken-momo') = 5$$), 'cancelling returns the stock');
select t.chk(t.seq($$select public._set_order_status((select id from sel), 'cancelled')$$, $$select t.stock('chicken-momo') = 5$$), 'cancelling twice does not return the stock twice');
update product_stock set quantity = 1 where product_id = (select id from products where slug = 'chicken-momo');
select t.chk(public._set_order_status((select id from sel), 'confirmed') ->> 'code' = 'stock', 're-opening with too little stock is refused');
select t.chk((select status from orders where id = (select id from sel)) = 'cancelled' and t.stock('chicken-momo') = 1, 'a refused re-open changes nothing');
update product_stock set quantity = 6 where product_id = (select id from products where slug = 'chicken-momo');
update settings set value = '1' where key = 'max_orders_per_day';
select t.place(t.order_json('chicken-momo', 1, '[]', '{"pickupDate":"2026-11-15","pickupTime":"12:00"}'));
select t.chk(public._set_order_status((select id from sel), 'confirmed') ->> 'code' = 'day_full', 're-opening onto a full pickup day is refused');
select t.chk((select status from orders where id = (select id from sel)) = 'cancelled', 'a refused re-open (day full) changes nothing');
update settings set value = 'null' where key = 'max_orders_per_day';
update product_stock set quantity = 6 where product_id = (select id from products where slug = 'chicken-momo');
select t.chk(t.seq($$select public._set_order_status((select id from sel), 'confirmed')$$, $$select t.stock('chicken-momo') = 4 and (select status from orders where id = (select id from sel)) = 'confirmed'$$), 're-opening takes the stock again');
select t.chk(t.seq($$select public._set_order_status((select id from sel), 'ready')$$, $$select t.stock('chicken-momo') = 4 and (select status from orders where id = (select id from sel)) = 'ready'$$), 'moving between open statuses leaves stock alone');
select t.chk(t.try('authenticated', :'b', format('select public.set_order_status(%L, ''ready'')', (select id from sel))) = 'denied', 'a non-admin cannot call set_order_status');
select t.chk(t.seq(format('select t.try(''authenticated'', %L, %L)', :'a', format('select public.set_order_status(%L, ''collected'')', (select id from sel))), $$select (select status from orders where id = (select id from sel)) = 'collected'$$), 'an admin changes a status through the function');
select t.chk(t.try('authenticated', :'a', format('update orders set status = ''new'' where id = %L', (select id from sel))) = 'denied', 'an admin cannot update orders.status directly');
select t.chk(t.try('authenticated', :'a', 'delete from orders') = 'denied', 'orders cannot be deleted from the browser');
select t.chk(t.count('authenticated', :'a', 'select 1 from orders') > 5 and t.count('authenticated', :'b', 'select 1 from orders') = 0, 'an admin reads orders, a non-admin reads none');
-- manual orders
select t.chk(t.try('authenticated', :'b', $$select public.create_manual_order('{"items":[{"slug":"chicken-momo","qty":1}]}')$$) = 'denied', 'a non-admin cannot create a manual order');
select t.chk(t.seq($$select t.try('authenticated', '00000000-0000-0000-0000-00000000000a', $q$select public.create_manual_order('{"items":[{"slug":"chicken-momo","qty":1}],"pickupDate":"2026-11-14","pickupTime":"09:00"}')$q$)$$, $$select (select source from orders order by created_at desc limit 1) = 'manual'$$), 'an admin creates a manual order (source manual, no phone or notice checks)');

-- ===== sales summary (D-064) =====
select t.chk(t.try('anon', null, $$select * from public.sales_summary('2026-11-01','2026-11-30')$$) = 'denied', 'anon cannot read the sales summary');
select t.chk(t.try('authenticated', :'b', $$select * from public.sales_summary('2026-11-01','2026-11-30')$$) = 'denied', 'a non-admin cannot read the sales summary');
select t.chk(t.try('authenticated', :'a', $$select * from public.sales_summary('2026-11-30','2026-11-01')$$) like 'error:22023%', 'a reversed range is refused');
insert into orders (order_number, order_date, pickup_date, items, total_pence, status) values
  ('SS-T-1', '2026-03-01', '2026-03-02', '[]', 1000, 'collected'),
  ('SS-T-2', '2026-03-01', '2026-03-02', '[]', 2050, 'collected'),
  ('SS-T-3', '2026-03-01', '2026-03-02', '[]', 9999, 'cancelled'),
  ('SS-T-4', '2026-03-01', '2026-03-02', '[]', 9999, 'confirmed'),
  ('SS-T-5', '2026-03-04', null, '[]', 500, 'collected');
select t.chk(t.count('authenticated', :'a', $$select * from public.sales_summary('2026-03-01','2026-03-05')$$) = 5, 'one row per day, including days with no sales');
select t.chk(t.count('authenticated', :'a', $$select * from public.sales_summary('2026-03-01','2026-03-05') where day = '2026-03-02' and total_pence = 3050 and order_count = 2$$) = 1, 'only Collected orders count (cancelled and confirmed are left out)');
select t.chk(t.count('authenticated', :'a', $$select * from public.sales_summary('2026-03-01','2026-03-05') where day = '2026-03-04' and total_pence = 500 and order_count = 1$$) = 1, 'an order with no pickup date counts on the day it was placed');
select t.chk(t.count('authenticated', :'a', $$select * from public.sales_summary('2026-03-01','2026-03-05') where day in ('2026-03-01','2026-03-03','2026-03-05') and total_pence = 0 and order_count = 0$$) = 3, 'days with no sales are zero');
delete from orders where order_number like 'SS-T-%';

-- ===== publish pipeline =====
update site_status set unpublished = false, state = 'live' where id = 1;
update product_stock set quantity = quantity;
update settings set value = value where key = 'min_lead_hours';
select t.chk(not (select unpublished from site_status), 'stock and settings changes do not mark unpublished changes');
update products set name = name where slug = 'chicken-momo';
select t.chk((select unpublished from site_status), 'a product edit marks unpublished changes');
select t.chk(t.try('authenticated', :'a', $$select public.set_site_status('publishing')$$) = 'denied', 'an admin session cannot set the build state directly (only the functions can)');
select public.set_site_status('publishing');
select t.chk((select state = 'publishing' and not unpublished from site_status), 'publishing clears the unpublished flag');
select public.set_site_status('failed', 'boom');
select t.chk((select state = 'failed' and unpublished and detail = 'boom' from site_status), 'a failed build keeps the changes unpublished');
select public.set_site_status('live');
-- rate limit
select t.chk(public.check_rate_limit('ip-a', 2, 60) and public.check_rate_limit('ip-a', 2, 60) and not public.check_rate_limit('ip-a', 2, 60), 'the rate limit allows 2 and refuses the 3rd');
select t.chk(public.check_rate_limit('ip-b', 2, 60), 'another key has its own limit');
