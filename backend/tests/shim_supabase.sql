-- LOCAL TESTING ONLY. Recreates the small part of a Supabase project that the migrations rely on (roles, auth.uid(), auth.users,
-- storage tables), so the migrations and policy tests can run on a plain PostgreSQL. Never run this on a real Supabase project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null references storage.buckets (id), name text not null);
alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated, service_role;
create publication supabase_realtime;  -- Supabase creates this publication itself
