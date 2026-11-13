-- Catalogue (D-065 / D-066, Step 4l): categories, a library of reusable option groups, and links from products and categories to them.
-- Forward-only. The old tables products.category (text), product_option_groups and product_options stay in place, untouched and no longer
-- used by the code; they are not dropped in this step. Product-level exclusions from a category group are NOT built.

-- ---------- categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_name_idx on public.categories (lower(btrim(name)));
create trigger categories_touch before update on public.categories for each row execute function public.touch_updated_at();
alter table public.products add column category_id uuid references public.categories (id) on delete set null;
create index products_category_idx on public.products (category_id);

-- ---------- the option library ----------
create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 60),
  kind text not null check (kind in ('single', 'multiple')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger option_groups_touch before update on public.option_groups for each row execute function public.touch_updated_at();
create table public.options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups (id) on delete cascade,
  label text not null check (length(btrim(label)) between 1 and 60),
  price_delta_pence integer not null default 0 check (price_delta_pence >= 0),
  is_default boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (group_id, label)
);
create unique index options_one_default_idx on public.options (group_id) where is_default;
create table public.product_option_groups_link (
  product_id uuid not null references public.products (id) on delete cascade,
  group_id uuid not null references public.option_groups (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, group_id)
);
create index product_option_groups_link_group_idx on public.product_option_groups_link (group_id);
create table public.category_option_groups (
  category_id uuid not null references public.categories (id) on delete cascade,
  group_id uuid not null references public.option_groups (id) on delete cascade,
  primary key (category_id, group_id)
);
create index category_option_groups_group_idx on public.category_option_groups (group_id);
-- an option id that existed before this migration still works in a cart that was built from the old site (merged groups share options)
create table public.option_id_aliases (
  old_id uuid primary key,
  new_id uuid not null references public.options (id) on delete cascade
);

-- ---------- move what exists ----------
-- categories from the text column
insert into public.categories (name, sort_order)
select c.name, row_number() over (order by c.first_sort, c.name)
from (select btrim(category) as name, min(sort_order) as first_sort from public.products where btrim(coalesce(category, '')) <> '' group by btrim(category)) c;
update public.products p set category_id = c.id from public.categories c where lower(btrim(p.category)) = lower(c.name);

-- option groups: identical groups (same name, kind, state and the same options) become one shared group; the rest stay separate
do $move$
begin
create temp table _sig on commit drop as
select g.id, g.product_id, g.label, g.kind, g.sort_order, g.active, g.created_at,
  coalesce((select string_agg(o.label || '|' || o.price_delta_pence || '|' || o.is_default || '|' || o.active, ';' order by o.label)
            from public.product_options o where o.group_id = g.id), '') as sig
from public.product_option_groups g;
create temp table _rep on commit drop as
select distinct on (label, kind, active, sig) id as rep_id, label, kind, active, sig, sort_order, product_id
from _sig order by label, kind, active, sig, created_at, id;
create temp table _map on commit drop as
select s.id as old_id, s.product_id, s.sort_order, r.rep_id from _sig s join _rep r using (label, kind, active, sig);

insert into public.option_groups (id, name, kind, sort_order, active)
select r.rep_id,
  case when (select count(*) from _rep x where x.label = r.label) > 1 then r.label || ' (' || (select p.name from public.products p where p.id = r.product_id) || ')' else r.label end,
  r.kind, r.sort_order, r.active
from _rep r;
insert into public.options (id, group_id, label, price_delta_pence, is_default, sort_order, active)
select o.id, o.group_id, o.label, o.price_delta_pence, o.is_default, o.sort_order, o.active
from public.product_options o join _rep r on r.rep_id = o.group_id;
insert into public.option_id_aliases (old_id, new_id)
select o.id, ro.id
from public.product_options o join _map m on m.old_id = o.group_id and m.old_id <> m.rep_id
join public.options ro on ro.group_id = m.rep_id and ro.label = o.label;
insert into public.product_option_groups_link (product_id, group_id, sort_order) select product_id, rep_id, sort_order from _map;
end $move$;

-- ---------- security: public read of what the shop and the build need, admin write ----------
alter table public.categories enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.product_option_groups_link enable row level security;
alter table public.category_option_groups enable row level security;
alter table public.option_id_aliases enable row level security; -- no policy: only the order function reads it
create policy categories_public_read on public.categories for select to anon, authenticated using (true);
create policy option_groups_public_read2 on public.option_groups for select to anon, authenticated using (active);
create policy options_public_read2 on public.options for select to anon, authenticated
  using (active and exists (select 1 from public.option_groups g where g.id = group_id and g.active));
create policy pogl_public_read on public.product_option_groups_link for select to anon, authenticated using (true);
create policy cog_public_read on public.category_option_groups for select to anon, authenticated using (true);
create policy categories_admin on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy option_groups_admin2 on public.option_groups for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy options_admin2 on public.options for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy pogl_admin on public.product_option_groups_link for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy cog_admin on public.category_option_groups for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.categories, public.option_groups, public.options, public.product_option_groups_link, public.category_option_groups to anon;
grant select, insert, update, delete on public.categories, public.option_groups, public.options, public.product_option_groups_link, public.category_option_groups to authenticated;
grant all on public.categories, public.option_groups, public.options, public.product_option_groups_link, public.category_option_groups, public.option_id_aliases to service_role;

-- editing any of them is a change to publish (created after the data move, so the move itself does not mark anything)
create trigger categories_unpublished after insert or update or delete on public.categories for each statement execute function public.mark_unpublished();
create trigger option_groups2_unpublished after insert or update or delete on public.option_groups for each statement execute function public.mark_unpublished();
create trigger options2_unpublished after insert or update or delete on public.options for each statement execute function public.mark_unpublished();
create trigger pogl_unpublished after insert or update or delete on public.product_option_groups_link for each statement execute function public.mark_unpublished();
create trigger cog_unpublished after insert or update or delete on public.category_option_groups for each statement execute function public.mark_unpublished();
