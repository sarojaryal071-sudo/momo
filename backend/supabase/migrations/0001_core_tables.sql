-- Steam & Spice: core tables, row-level security and grants (Step 3, D-055).
-- Forward-only. Safe to run once on a new project. Project setting "Automatically expose new tables" is OFF, so every table
-- below gets explicit GRANTs for exactly the roles that need it, and RLS is enabled on every table.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name text not null check (length(name) between 1 and 120),
  kind text not null check (kind in ('pack', 'addon')),
  category text,                                   -- nullable: filter chips use it when present (D-028)
  unit_label text not null default '',
  price_pence integer check (price_pence is null or price_pence >= 0),  -- null = no price yet, never orderable
  available boolean not null default true,
  photo_path text,                                  -- file in the product-images bucket (or a static image name)
  photo_alt text,
  sort_order integer not null default 0,
  active boolean not null default true,
  ingredients_text text,
  allergens text[] not null default '{}'
    check (allergens <@ array['celery','gluten','crustaceans','eggs','fish','lupin','milk','molluscs','mustard','tree_nuts','peanuts','sesame','soya','sulphites']),
  allergen_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_active_sort_idx on public.products (active, sort_order);

create table public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('single', 'multiple')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, label)
);

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.product_option_groups (id) on delete cascade,
  label text not null,
  price_delta_pence integer not null default 0 check (price_delta_pence >= 0),
  is_default boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (group_id, label)
);
-- at most one default option per group
create unique index product_options_one_default_idx on public.product_options (group_id) where is_default;

-- Stock is separate from products on purpose: taking an order lowers it, and that must never look like a product edit.
-- No row = stock is not tracked for that product.
create table public.product_stock (
  product_id uuid primary key references public.products (id) on delete cascade,
  quantity integer not null check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pickup_rules (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),   -- Sunday is 0
  start_time time not null,
  end_time time not null,
  slot_minutes integer not null default 1 check (slot_minutes >= 1),  -- the time step the customer can pick (D-038)
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table public.pickup_exceptions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  kind text not null check (kind in ('closed', 'extra')),
  start_time time,
  end_time time,                                   -- null with kind closed = closed all day
  slot_minutes integer not null default 1 check (slot_minutes >= 1),
  note text,
  created_at timestamptz not null default now(),
  check (kind = 'closed' or (start_time is not null and end_time is not null and end_time > start_time))
);
create index pickup_exceptions_date_idx on public.pickup_exceptions (date);

create table public.site_notice (
  id integer primary key check (id = 1),
  message text not null default '',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Publish pipeline (D-055): "unpublished changes" is set by product edits; the build reports Publishing, Live or Failed.
create table public.site_status (
  id integer primary key check (id = 1),
  state text not null default 'live' check (state in ('live', 'publishing', 'failed')),
  unpublished boolean not null default false,
  detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  order_date date not null,                        -- UK date the order was placed
  pickup_date date,
  pickup_time time,
  customer_name text,
  customer_phone text,
  notes text,
  items jsonb not null,                            -- snapshot: slug, name, unit_label, qty, unit_price_pence, options[], customised
  total_pence integer not null check (total_pence >= 0),
  status text not null default 'new' check (status in ('new', 'confirmed', 'ready', 'collected', 'cancelled')),
  source text not null default 'website' check (source in ('website', 'manual')),
  stock_taken boolean not null default false,      -- true while this order's standard lines are taken out of stock
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_pickup_status_idx on public.orders (pickup_date, status);
create index orders_created_idx on public.orders (created_at desc);

create table public.order_counters (
  order_date date primary key,
  last_number integer not null
);

create table public.rate_limits (
  bucket text primary key,
  hits integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- is_admin() ----------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------- updated_at ----------
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger product_stock_touch before update on public.product_stock for each row execute function public.touch_updated_at();
create trigger site_notice_touch before update on public.site_notice for each row execute function public.touch_updated_at();
create trigger site_status_touch before update on public.site_status for each row execute function public.touch_updated_at();

-- ---------- "unpublished changes" marker (products and options only, never stock or settings) ----------
create function public.mark_unpublished() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.site_status set unpublished = true where id = 1;
  return null;
end $$;
create trigger products_unpublished after insert or update or delete on public.products for each statement execute function public.mark_unpublished();
create trigger option_groups_unpublished after insert or update or delete on public.product_option_groups for each statement execute function public.mark_unpublished();
create trigger options_unpublished after insert or update or delete on public.product_options for each statement execute function public.mark_unpublished();

-- ---------- row-level security ----------
alter table public.products enable row level security;
alter table public.product_option_groups enable row level security;
alter table public.product_options enable row level security;
alter table public.product_stock enable row level security;
alter table public.pickup_rules enable row level security;
alter table public.pickup_exceptions enable row level security;
alter table public.site_notice enable row level security;
alter table public.site_status enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_counters enable row level security;
alter table public.rate_limits enable row level security;
alter table public.admins enable row level security;

-- Public reads (active rows only where there is an active flag)
create policy products_public_read on public.products for select to anon, authenticated using (active);
create policy option_groups_public_read on public.product_option_groups for select to anon, authenticated
  using (active and exists (select 1 from public.products p where p.id = product_id and p.active));
create policy options_public_read on public.product_options for select to anon, authenticated
  using (active and exists (select 1 from public.product_option_groups g join public.products p on p.id = g.product_id
                            where g.id = group_id and g.active and p.active));
create policy stock_public_read on public.product_stock for select to anon, authenticated using (true);
create policy pickup_rules_public_read on public.pickup_rules for select to anon, authenticated using (true);
create policy pickup_exceptions_public_read on public.pickup_exceptions for select to anon, authenticated using (true);
create policy site_notice_public_read on public.site_notice for select to anon, authenticated using (true);
-- Settings: anyone reads only the public keys
create policy settings_public_read on public.settings for select to anon, authenticated
  using (key in ('min_lead_hours', 'max_days_ahead', 'max_qty_per_item', 'custom_min_lead_hours', 'low_stock_threshold',
                 'ordering_open', 'ordering_closed_message'));

-- Admin: read and write everything an admin edits. Orders: read only; changes go through the SQL functions.
create policy products_admin on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy option_groups_admin on public.product_option_groups for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy options_admin on public.product_options for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy stock_admin on public.product_stock for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy pickup_rules_admin on public.pickup_rules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy pickup_exceptions_admin on public.pickup_exceptions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy site_notice_admin on public.site_notice for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy site_status_admin_read on public.site_status for select to authenticated using (public.is_admin());
create policy settings_admin on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy orders_admin_read on public.orders for select to authenticated using (public.is_admin());
create policy admins_read_own on public.admins for select to authenticated using (user_id = auth.uid());
-- order_counters and rate_limits: no policy at all (only the service role and the security-definer functions touch them)

-- ---------- grants (nothing is exposed by default) ----------
revoke all on all tables in schema public from anon, authenticated;
grant select on public.products, public.product_option_groups, public.product_options, public.product_stock,
  public.pickup_rules, public.pickup_exceptions, public.site_notice, public.settings to anon;
grant select, insert, update, delete on public.products, public.product_option_groups, public.product_options,
  public.product_stock, public.pickup_rules, public.pickup_exceptions, public.site_notice, public.settings to authenticated;
grant select on public.site_status, public.orders, public.admins to authenticated;
-- The service role (edge functions) bypasses RLS but still needs table privileges.
grant all on all tables in schema public to service_role;
