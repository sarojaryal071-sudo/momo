-- Step 4l: the order function validates options against the EFFECTIVE groups of a product (its own links plus its category's), through the
-- new library. Everything else in the function is exactly as before (prices recomputed here, defaults, single and multiple, lead time,
-- stock, limits). The order item keeps a snapshot of the group name, option label and price, so later edits never change an old order.
create or replace function public._place_order(p jsonb, p_manual boolean, p_now timestamptz) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_open boolean := coalesce((public._setting('ordering_open') #>> '{}')::boolean, true);
  v_closed_msg text := coalesce(public._setting('ordering_closed_message') #>> '{}', 'We are not taking orders right now. Please check back soon.');
  v_max_qty integer := public._setting_int('max_qty_per_item', 10);
  v_min_lead integer := public._setting_int('min_lead_hours', 24);
  v_custom_lead integer := public._setting_int('custom_min_lead_hours', 48);
  v_day_limit integer := public._setting_int('max_orders_per_day', null);
  v_prefix text := coalesce(public._setting('order_prefix') #>> '{}', 'SS');
  v_name text := left(btrim(coalesce(p ->> 'name', '')), 80);
  v_phone text := left(btrim(coalesce(p ->> 'phone', '')), 20);
  v_notes text := left(btrim(coalesce(p ->> 'notes', '')), 500);
  v_digits text;
  v_pickup_date date;
  v_pickup_time time;
  v_item jsonb; v_prod public.products%rowtype; v_qty numeric; v_oid text; v_opt record;
  v_lines jsonb := '[]'::jsonb; v_opts jsonb; v_seen uuid[]; v_unit integer; v_custom boolean; v_any_custom boolean := false;
  v_need record; v_stock integer;
  v_check text; v_lead integer; v_today date := public.uk_today(p_now);
  v_number integer; v_order_number text; v_total integer; v_items jsonb; v_id uuid;
begin
  if not p_manual and not v_open then return public._err('paused', v_closed_msg); end if;
  if jsonb_typeof(p -> 'items') is distinct from 'array' or jsonb_array_length(p -> 'items') = 0 then
    return public._err('empty', 'Your cart is empty.');
  end if;
  if jsonb_array_length(p -> 'items') > 20 then return public._err('too_many', 'At most 20 different items per order.'); end if;
  if not p_manual then
    if v_name = '' then return public._err('name', 'Enter your name.'); end if;
    -- UK number: strip punctuation, 0 or +44 or 0044 prefix, then 44 followed by 9 or 10 digits (same rule as the browser)
    v_digits := regexp_replace(regexp_replace(v_phone, '\(0\)', '', 'g'), '[^0-9+]', '', 'g');
    v_digits := regexp_replace(v_digits, '^\+', '');
    if v_digits like '0044%' then v_digits := substr(v_digits, 3);
    elsif v_digits like '0%' then v_digits := '44' || substr(v_digits, 2); end if;
    if v_digits !~ '^44[0-9]{9,10}$' then return public._err('phone', 'Enter a UK phone number, for example 07123 456789.'); end if;
  end if;

  -- pickup values: a bad shape is a refusal, not an exception
  begin
    v_pickup_date := nullif(p ->> 'pickupDate', '')::date;
    v_pickup_time := nullif(p ->> 'pickupTime', '')::time;
  exception when others then
    return public._err('pickup', 'That pickup day is not available. Please choose another.');
  end;

  -- lines: recompute everything from the tables
  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    select * into v_prod from public.products where slug = (v_item ->> 'slug') and active;
    if not found or not v_prod.available or v_prod.price_pence is null then
      return public._err('product', 'One of the items is no longer available.');
    end if;
    begin v_qty := floor((v_item ->> 'qty')::numeric); exception when others then v_qty := 0; end;
    if not (v_qty >= 1 and v_qty <= v_max_qty) then
      return public._err('quantity', format('Choose between 1 and %s of each item.', v_max_qty));
    end if;
    v_unit := v_prod.price_pence; v_opts := '[]'::jsonb; v_seen := '{}'; v_custom := false;
    if jsonb_typeof(v_item -> 'options') = 'array' then
      for v_oid in select distinct x from jsonb_array_elements_text(v_item -> 'options') x loop
        begin
          -- an option must belong to a group that applies to this product: linked to it directly, or to its category
          select o.id, o.label, o.price_delta_pence, o.is_default, g.id as gid, g.name as glabel, g.kind into strict v_opt
          from public.options o join public.option_groups g on g.id = o.group_id
          where o.id = coalesce((select a.new_id from public.option_id_aliases a where a.old_id = v_oid::uuid), v_oid::uuid)
            and o.active and g.active
            and (exists (select 1 from public.product_option_groups_link l where l.group_id = g.id and l.product_id = v_prod.id)
                 or exists (select 1 from public.category_option_groups c where c.group_id = g.id and c.category_id = v_prod.category_id));
        exception when others then
          return public._err('option', 'One of the options is not valid for that item.');
        end;
        if v_opt.kind = 'single' and v_opt.gid = any (v_seen) then
          return public._err('option', format('Choose only one %s.', lower(v_opt.glabel)));
        end if;
        v_seen := v_seen || v_opt.gid;
        v_unit := v_unit + v_opt.price_delta_pence;
        v_opts := v_opts || jsonb_build_array(jsonb_build_object('group', v_opt.glabel, 'label', v_opt.label, 'price_delta_pence', v_opt.price_delta_pence));
        if not v_opt.is_default then v_custom := true; end if;
      end loop;
    end if;
    v_any_custom := v_any_custom or v_custom;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('pid', v_prod.id, 'slug', v_prod.slug, 'name', v_prod.name,
      'unit_label', v_prod.unit_label, 'qty', v_qty::integer, 'unit_price_pence', v_unit, 'options', v_opts, 'customised', v_custom));
  end loop;

  -- Standard lines are frozen stock: lock the stock rows (in a fixed order) and check them. Customised lines are made to order.
  for v_need in
    select (l ->> 'pid')::uuid as pid, sum((l ->> 'qty')::integer) as qty
    from jsonb_array_elements(v_lines) l where not (l ->> 'customised')::boolean group by 1 order by 1
  loop
    select quantity into v_stock from public.product_stock where product_id = v_need.pid for update;
    if found and v_need.qty > v_stock then
      select * into v_prod from public.products where id = v_need.pid;
      return public._err('stock', case when v_stock = 0 then format('%s is sold out.', v_prod.name) else format('Only %s of %s left.', v_stock, v_prod.name) end);
    end if;
  end loop;

  if v_pickup_date is not null and not p_manual then
    v_lead := case when v_any_custom then greatest(v_min_lead, v_custom_lead) else v_min_lead end;
    v_check := public._pickup_check(v_pickup_date, v_pickup_time, v_lead, p_now);
    if v_check = 'day' then
      return public._err('pickup', case when v_any_custom then format('Customised orders need %s'' notice. Please choose a later day.', case when v_lead % 24 = 0 then (v_lead / 24) || (case when v_lead = 24 then ' day' else ' days' end) else v_lead || ' hours' end)
                                     else 'That pickup day is not available. Please choose another.' end);
    elsif v_check = 'time' then
      return public._err('pickup', 'That pickup time is not available. Please choose another.');
    end if;
    -- one order at a time per pickup date, so two buyers cannot both take the last place of the day
    perform pg_advisory_xact_lock(hashtext('pickup:' || v_pickup_date::text));
    if v_day_limit is not null and (select count(*) from public.orders where pickup_date = v_pickup_date and status <> 'cancelled') >= v_day_limit then
      return public._err('day_full', 'That day is full. Please choose another day.');
    end if;
  end if;

  -- write: next number (row lock on the counter), lower stock, insert, all in this one transaction
  insert into public.order_counters (order_date, last_number) values (v_today, 1)
    on conflict (order_date) do update set last_number = public.order_counters.last_number + 1 returning last_number into v_number;
  v_order_number := format('%s-%s%s-%s', v_prefix, to_char(v_today, 'DD'), to_char(v_today, 'MM'), lpad(v_number::text, 2, '0'));
  select jsonb_agg(l - 'pid') into v_items from jsonb_array_elements(v_lines) l;
  select sum((l ->> 'unit_price_pence')::integer * (l ->> 'qty')::integer) into v_total from jsonb_array_elements(v_lines) l;
  update public.product_stock s set quantity = s.quantity - n.qty
    from (select (l ->> 'pid')::uuid as pid, sum((l ->> 'qty')::integer)::integer as qty from jsonb_array_elements(v_lines) l
          where not (l ->> 'customised')::boolean group by 1) n where s.product_id = n.pid;
  insert into public.orders (order_number, order_date, pickup_date, pickup_time, customer_name, customer_phone, notes, items, total_pence,
                             status, source, stock_taken)
    values (v_order_number, v_today, v_pickup_date, case when v_pickup_date is null then null else v_pickup_time end,
            nullif(v_name, ''), nullif(v_phone, ''), nullif(v_notes, ''), v_items, v_total, 'new',
            case when p_manual then 'manual' else 'website' end, true)
    returning id into v_id;
  return jsonb_build_object('ok', true, 'order_id', v_id, 'order_number', v_order_number, 'total_pence', v_total);
end $$;
revoke all on function public._place_order(jsonb, boolean, timestamptz) from public;

-- ---------- the allergens of one allergen, set for many products at once (D-065) ----------
-- Adds and removes products in one go. Every product whose allergen list changes loses its "I have checked" confirmation, so she must
-- look at it again before it can be shown. Returns how many products were changed.
create function public.set_allergen_products(p_allergen_id uuid, p_product_ids uuid[]) returns integer
language plpgsql security definer set search_path = public as $$
declare v_changed uuid[];
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.allergens where id = p_allergen_id) then raise exception 'unknown allergen' using errcode = '22023'; end if;
  p_product_ids := coalesce(p_product_ids, '{}');
  select coalesce(array_agg(x), '{}') into v_changed from (
    select product_id as x from public.product_allergens where allergen_id = p_allergen_id and product_id <> all (p_product_ids)
    union
    select id from public.products where id = any (p_product_ids) and id not in (select product_id from public.product_allergens where allergen_id = p_allergen_id)
  ) c;
  delete from public.product_allergens where allergen_id = p_allergen_id and product_id <> all (p_product_ids);
  insert into public.product_allergens (product_id, allergen_id) select id, p_allergen_id from public.products where id = any (p_product_ids) on conflict do nothing;
  update public.products set allergens_checked_at = null where id = any (v_changed);
  return coalesce(array_length(v_changed, 1), 0);
end $$;
revoke all on function public.set_allergen_products(uuid, uuid[]) from public;
grant execute on function public.set_allergen_products(uuid, uuid[]) to authenticated;
