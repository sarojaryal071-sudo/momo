-- Live order feed (D-057): the admin subscribes to new and changed orders over Supabase Realtime.
-- Realtime honours row-level security: only a signed-in admin can read orders (policy orders_admin_read), so an anonymous client
-- receives no events. The guard lets the migration also run on a plain PostgreSQL (local tests), where the publication does not exist.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
