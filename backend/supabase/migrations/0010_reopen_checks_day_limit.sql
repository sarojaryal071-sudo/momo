-- Reopening a cancelled order (Step 4n): besides stock, it must also fit the daily order limit of its pickup day.
-- Same function as before with one extra check; nothing else changes.
create or replace function public._set_order_status(p_order_id uuid, p_status text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_o public.orders%rowtype; v_line record; v_stock integer; v_name text; v_day_limit integer := public._setting_int('max_orders_per_day', null);
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
      -- re-opening counts as a place on its pickup day again: refused when that day is already full
      if v_o.pickup_date is not null and v_day_limit is not null then
        perform pg_advisory_xact_lock(hashtext('pickup:' || v_o.pickup_date::text));
        if (select count(*) from public.orders where pickup_date = v_o.pickup_date and status <> 'cancelled') >= v_day_limit then
          return public._err('day_full', 'That pickup day is full, so this order cannot be reopened.');
        end if;
      end if;
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
