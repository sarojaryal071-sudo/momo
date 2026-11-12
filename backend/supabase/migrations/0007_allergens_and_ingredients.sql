-- Allergens and ingredients as data the admin edits (D-062, Step 4g). Forward-only; the old columns products.allergens and
-- products.ingredients_text stay in place (no longer written by the admin) and are not dropped in this step.

-- ---------- allergens: a list she can rename, add to, reorder and delete ----------
create table public.allergens (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index allergens_name_idx on public.allergens (lower(btrim(name)));
create trigger allergens_touch before update on public.allergens for each row execute function public.touch_updated_at();

create table public.product_allergens (
  product_id uuid not null references public.products (id) on delete cascade,
  allergen_id uuid not null references public.allergens (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, allergen_id)
);
create index product_allergens_allergen_idx on public.product_allergens (allergen_id);

-- ---------- ingredients: one row per tag, in her order ----------
create table public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_ingredients_product_idx on public.product_ingredients (product_id, sort_order);

-- ---------- the safeguard: she confirms the allergen and ingredient information per product ----------
alter table public.products add column allergens_checked_at timestamptz;

-- ---------- security: public read (the build and the shop), admin write ----------
alter table public.allergens enable row level security;
alter table public.product_allergens enable row level security;
alter table public.product_ingredients enable row level security;
create policy allergens_public_read on public.allergens for select to anon, authenticated using (true);
create policy product_allergens_public_read on public.product_allergens for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.active));
create policy product_ingredients_public_read on public.product_ingredients for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.active));
create policy allergens_admin on public.allergens for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy product_allergens_admin on public.product_allergens for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy product_ingredients_admin on public.product_ingredients for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.allergens, public.product_allergens, public.product_ingredients to anon;
grant select, insert, update, delete on public.allergens, public.product_allergens, public.product_ingredients to authenticated;
grant all on public.allergens, public.product_allergens, public.product_ingredients to service_role;

-- editing any of them is a change to publish
create trigger allergens_unpublished after insert or update or delete on public.allergens for each statement execute function public.mark_unpublished();
create trigger product_allergens_unpublished after insert or update or delete on public.product_allergens for each statement execute function public.mark_unpublished();
create trigger product_ingredients_unpublished after insert or update or delete on public.product_ingredients for each statement execute function public.mark_unpublished();

-- ---------- the 14 UK allergens, as ordinary rows ----------
insert into public.allergens (name, sort_order) values
  ('Celery', 1), ('Cereals containing gluten', 2), ('Crustaceans', 3), ('Eggs', 4), ('Fish', 5), ('Lupin', 6), ('Milk', 7),
  ('Molluscs', 8), ('Mustard', 9), ('Peanuts', 10), ('Sesame', 11), ('Soya', 12), ('Sulphur dioxide and sulphites', 13), ('Tree nuts', 14)
on conflict (lower(btrim(name))) do nothing;

-- ---------- move what exists: products.allergens (keys) into the join table, matched by name ----------
insert into public.product_allergens (product_id, allergen_id)
select p.id, a.id
from public.products p
cross join lateral unnest(p.allergens) as k(key)
join public.allergens a on lower(a.name) = case k.key
  when 'celery' then 'celery' when 'gluten' then 'cereals containing gluten' when 'crustaceans' then 'crustaceans' when 'eggs' then 'eggs'
  when 'fish' then 'fish' when 'lupin' then 'lupin' when 'milk' then 'milk' when 'molluscs' then 'molluscs' when 'mustard' then 'mustard'
  when 'tree_nuts' then 'tree nuts' when 'peanuts' then 'peanuts' when 'sesame' then 'sesame' when 'soya' then 'soya'
  when 'sulphites' then 'sulphur dioxide and sulphites' end
on conflict do nothing;

-- ---------- move what exists: products.ingredients_text into tags, split on commas ----------
-- Text with commas becomes one tag per part. Text without a comma stays as one tag only when it is short; longer text is left in
-- the old column (the build still falls back to it), so nothing is lost.
insert into public.product_ingredients (product_id, name, sort_order)
select p.id, btrim(regexp_replace(part.value, '[.\s]+$', '')), part.ord
from public.products p
cross join lateral unnest(string_to_array(p.ingredients_text, ',')) with ordinality as part(value, ord)
where p.ingredients_text is not null and btrim(p.ingredients_text) <> ''
  and (position(',' in p.ingredients_text) > 0 or length(btrim(p.ingredients_text)) <= 60)
  and btrim(regexp_replace(part.value, '[.\s]+$', '')) <> ''
  and length(btrim(regexp_replace(part.value, '[.\s]+$', ''))) <= 60
  and not exists (select 1 from public.product_ingredients i where i.product_id = p.id);
