-- Sales summary (D-064, Step 4i): per day, the total in pence and the number of Collected orders. Admin only.
-- The orders table has no collected timestamp, so an order counts on its pickup date (or the date it was placed when it has none).
-- Days with no sales return zero. Only totals leave the function: no names, phones or notes.
create function public.sales_summary(from_date date, to_date date)
returns table (day date, total_pence bigint, order_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if from_date is null or to_date is null or from_date > to_date then raise exception 'from must not be after to' using errcode = '22023'; end if;
  if to_date - from_date > 400 then raise exception 'range too long' using errcode = '22023'; end if;
  return query
    select d::date, coalesce(sum(o.total_pence), 0)::bigint, count(o.id)::bigint
    from generate_series(from_date, to_date, interval '1 day') as d
    left join public.orders o on o.status = 'collected' and coalesce(o.pickup_date, o.order_date) = d::date
    group by d order by d;
end $$;
revoke all on function public.sales_summary(date, date) from public, anon;
grant execute on function public.sales_summary(date, date) to authenticated;
