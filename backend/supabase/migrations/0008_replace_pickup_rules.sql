-- Weekly pickup hours (D-063, Step 4h): the admin saves the whole week at once. One function replaces every row of pickup_rules in
-- a single transaction, so a failure (bad time, overlap) leaves the old hours exactly as they were. Admin only.
create function public.replace_pickup_rules(p_rules jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if jsonb_typeof(p_rules) is distinct from 'array' then raise exception 'rules must be a list' using errcode = '22023'; end if;
  -- two windows on the same day must not overlap
  if exists (
    select 1
    from jsonb_array_elements(p_rules) with ordinality as a(r, n)
    join jsonb_array_elements(p_rules) with ordinality as b(r, n)
      on (a.r ->> 'weekday')::int = (b.r ->> 'weekday')::int and a.n < b.n
     and (a.r ->> 'start_time')::time < (b.r ->> 'end_time')::time and (b.r ->> 'start_time')::time < (a.r ->> 'end_time')::time
  ) then raise exception 'Opening windows on one day overlap.' using errcode = '22023'; end if;
  delete from public.pickup_rules where true;
  insert into public.pickup_rules (weekday, start_time, end_time, slot_minutes, active)
  select (r ->> 'weekday')::smallint, (r ->> 'start_time')::time, (r ->> 'end_time')::time, coalesce((r ->> 'slot_minutes')::integer, 1), true
  from jsonb_array_elements(p_rules) as r;
end $$;
revoke all on function public.replace_pickup_rules(jsonb) from public;
grant execute on function public.replace_pickup_rules(jsonb) to authenticated;
