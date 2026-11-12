-- Steam & Spice: pickup rules, place_order, set_order_status, create_manual_order, full_pickup_dates (Step 3, D-031, D-045 to D-047, D-055).
-- The rules mirror frontend/js/mock-backend.js (the demo backend), which is the written specification of the behaviour.
-- Every check runs BEFORE anything is written, so a refused order changes nothing.

-- ---------- small helpers ----------
create function public._setting(p_key text) returns jsonb language sql stable set search_path = public
as $$ select value from public.settings where key = p_key $$;

create function public._setting_int(p_key text, p_default integer) returns integer language sql stable set search_path = public
as $$ select coalesce((select (value #>> '{}')::integer from public.settings where key = p_key and jsonb_typeof(value) = 'number'), p_default) $$;

create function public._minutes(t time) returns integer language sql immutable
as $$ select (extract(hour from t) * 60 + extract(minute from t))::integer $$;

create function public.uk_today(p_now timestamptz default now()) returns date language sql stable
as $$ select (p_now at time zone 'Europe/London')::date $$;

create function public._err(p_code text, p_message text) returns jsonb language sql immutable
as $$ select jsonb_build_object('ok', false, 'code', p_code, 'message', p_message) $$;

-- ---------- pickup slots for one date (rules plus exceptions; D-038) ----------
create function public._pickup_slots(p_date date) returns table (start_min integer, len integer)
language sql stable set search_path = public as $$
  with raw as (
    select gs::integer as t, r.slot_minutes as len, 0 as src
    from public.pickup_rules r,
         lateral generate_series(public._minutes(r.start_time), public._minutes(r.end_time) - r.slot_minutes, r.slot_minutes) gs
    where r.active and r.weekday = extract(dow from p_date)
    union all
    select gs::integer, e.slot_minutes, 1
    from public.pickup_exceptions e,
         lateral generate_series(public._minutes(e.start_time), public._minutes(e.end_time) - e.slot_minutes, e.slot_minutes) gs
    where e.date = p_date and e.kind = 'extra'
  ), merged as (
    select distinct on (t) t, len from raw order by t, src desc
  )
  select m.t, m.len from merged m
  where not exists (select 1 from public.pickup_exceptions e where e.date = p_date and e.kind = 'closed' and e.end_time is null)
    and not exists (select 1 from public.pickup_exceptions e
                    where e.date = p_date and e.kind = 'closed' and e.end_time is not null
                      and m.t < public._minutes(e.end_time) and m.t + m.len > public._minutes(e.start_time));
$$;

-- null when the day (and time, if given) can be picked; 'day' or 'time' otherwise.
create function public._pickup_check(p_date date, p_time time, p_lead_hours integer, p_now timestamptz) returns text
language plpgsql stable set search_path = public as $$
declare
  v_today date := public.uk_today(p_now);
  v_max integer := public._setting_int('max_days_ahead', 14);
  v_earliest timestamp := date_trunc('minute', p_now at time zone 'Europe/London') + p_lead_hours * interval '1 hour';
  v_ok boolean;
begin
  if p_date < v_today or p_date > v_today + v_max then return 'day'; end if;
  select exists (select 1 from public._pickup_slots(p_date) s where p_date::timestamp + s.start_min * interval '1 minute' >= v_earliest
                   and (p_time is null or s.start_min = public._minutes(p_time))) into v_ok;
  if v_ok then return null; end if;
  if p_time is not null and exists (select 1 from public._pickup_slots(p_date) s where p_date::timestamp + s.start_min * interval '1 minute' >= v_earliest) then
    return 'time';
  end if;
  return 'day';
end $$;

-- ---------- public: days that have reached the daily limit (dates only, no personal data) ----------
create function public.full_pickup_dates(p_from date default null, p_to date default null) returns setof date
language plpgsql stable security definer set search_path = public as $$
declare v_limit integer := public._setting_int('max_orders_per_day', null);
begin
  if v_limit is null then return; end if;
  return query
    select o.pickup_date from public.orders o
    where o.status <> 'cancelled' and o.pickup_date is not null
      and (p_from is null or o.pickup_date >= p_from) and (p_to is null or o.pickup_date <= p_to)
    group by o.pickup_date having count(*) >= v_limit order by o.pickup_date;
end $$;
revoke all on function public.full_pickup_dates(date, date) from public;
grant execute on function public.full_pickup_dates(date, date) to anon, authenticated, service_role;

-- ---------- rate limit by key (an IP hash), fixed window ----------
create function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_bucket text := p_key || ':' || floor(extract(epoch from now()) / p_window_seconds)::bigint; v_hits integer;
begin
  delete from public.rate_limits where created_at < now() - interval '1 day';
  insert into public.rate_limits (bucket, hits) values (v_bucket, 1)
    on conflict (bucket) do update set hits = public.rate_limits.hits + 1 returning hits into v_hits;
  return v_hits <= p_limit;
end $$;
revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------- placing an order ----------
-- p: { items: [{ slug, qty, options: [option uuid, ...] }], name, phone, notes, pickupDate, pickupTime }
-- Returns { ok: true, order_id, order_number, total_pence } or { ok: false, code, message }.
-- Prices ALWAYS come from the tables; the caller only says which products, how many and which options.
create function public._place_order(p jsonb, p_manual boolean, p_now timestamptz) returns jsonb
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
          select o.id, o.label, o.price_delta_pence, o.is_default, g.id as gid, g.label as glabel, g.kind into strict v_opt
          from public.product_options o join public.product_option_groups g on g.id = o.group_id
          where o.id = v_oid::uuid and g.product_id = v_prod.id and o.active and g.active;
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

create function public.place_order(p jsonb) returns jsonb language sql security definer set search_path = public
as $$ select public._place_order(p, false, now()) $$;
revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to service_role;   -- only the place-order edge function calls it

create function public.create_manual_order(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return public._place_order(p, true, now());
end $$;
revoke all on function public.create_manual_order(jsonb) from public;
grant execute on function public.create_manual_order(jsonb) to authenticated;

-- ---------- the only way a status changes (D-046) ----------
-- Cancelling returns the stock of the standard lines; moving out of cancelled takes it again (refused if short). Never applied twice.
create function public._set_order_status(p_order_id uuid, p_status text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype; v_line record; v_stock integer; v_name text;
begin
  if p_status not in ('new', 'confirmed', 'ready', 'collected', 'cancelled') then return public._err('status', 'Unknown status.'); end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then return public._err('not_found', 'That order was not found.'); end if;
  if v_o.status = p_status then return jsonb_build_object('ok', true, 'status', v_o.status, 'unchanged', true); end if;
  if p_status = 'cancelled' then
    if v_o.stock_taken then
      update public.product_stock s set quantity = s.quantity + n.qty
        from (select pr.id as pid, sum((l ->> 'qty')::integer)::integer as qty
              from jsonb_array_elements(v_o.items) l join public.products pr on pr.slug = l ->> 'slug'
              where not coalesce((l ->> 'customised')::boolean, false) group by pr.id) n where s.product_id = n.pid;
    end if;
    update public.orders set status = 'cancelled', stock_taken = false where id = p_order_id;
  else
    if v_o.status = 'cancelled' then
      for v_line in select pr.id as pid, pr.name, sum((l ->> 'qty')::integer)::integer as qty
                    from jsonb_array_elements(v_o.items) l join public.products pr on pr.slug = l ->> 'slug'
                    where not coalesce((l ->> 'customised')::boolean, false) group by pr.id, pr.name order by pr.id loop
        select quantity into v_stock from public.product_stock where product_id = v_line.pid for update;
        if found and v_line.qty > v_stock then
          return public._err('stock', format('Not enough stock to re-open this order: only %s of %s left.', v_stock, v_line.name));
        end if;
      end loop;
      update public.product_stock s set quantity = s.quantity - n.qty
        from (select pr.id as pid, sum((l ->> 'qty')::integer)::integer as qty
              from jsonb_array_elements(v_o.items) l join public.products pr on pr.slug = l ->> 'slug'
              where not coalesce((l ->> 'customised')::boolean, false) group by pr.id) n where s.product_id = n.pid;
      update public.orders set status = p_status, stock_taken = true where id = p_order_id;
    else
      update public.orders set status = p_status where id = p_order_id;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'status', p_status);
end $$;
revoke all on function public._set_order_status(uuid, text) from public;

create function public.set_order_status(p_order_id uuid, p_status text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return public._set_order_status(p_order_id, p_status);
end $$;
revoke all on function public.set_order_status(uuid, text) from public;
grant execute on function public.set_order_status(uuid, text) to authenticated;

-- ---------- publish pipeline state (service role only: the edge functions call this) ----------
create function public.set_site_status(p_state text, p_detail text default null) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_state not in ('live', 'publishing', 'failed') then raise exception 'bad state'; end if;
  update public.site_status set state = p_state, detail = p_detail,
    unpublished = case p_state when 'publishing' then false when 'failed' then true else unpublished end
  where id = 1;
end $$;
revoke all on function public.set_site_status(text, text) from public;
grant execute on function public.set_site_status(text, text) to service_role;
