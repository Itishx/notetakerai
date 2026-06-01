create table if not exists public.spotify_connections (
  id uuid primary key default gen_random_uuid(),
  user_identifier text not null unique,
  spotify_user_id text,
  spotify_email text,
  display_name text,
  product text,
  country text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spotify_connections enable row level security;

drop policy if exists "Users can view their own spotify connections" on public.spotify_connections;
drop policy if exists "Users can insert their own spotify connections" on public.spotify_connections;
drop policy if exists "Users can update their own spotify connections" on public.spotify_connections;
drop policy if exists "Users can delete their own spotify connections" on public.spotify_connections;

drop policy if exists "Users can view their own spotify connections" on public.spotify_connections;
create policy "Users can view their own spotify connections"
on public.spotify_connections for select
using (user_identifier = (auth.uid())::text);

drop policy if exists "Users can insert their own spotify connections" on public.spotify_connections;
create policy "Users can insert their own spotify connections"
on public.spotify_connections for insert
with check (user_identifier = (auth.uid())::text);

drop policy if exists "Users can update their own spotify connections" on public.spotify_connections;
create policy "Users can update their own spotify connections"
on public.spotify_connections for update
using (user_identifier = (auth.uid())::text);

drop policy if exists "Users can delete their own spotify connections" on public.spotify_connections;
create policy "Users can delete their own spotify connections"
on public.spotify_connections for delete
using (user_identifier = (auth.uid())::text);

drop trigger if exists update_spotify_connections_updated_at on public.spotify_connections;

drop trigger if exists update_spotify_connections_updated_at on public.spotify_connections;
create trigger update_spotify_connections_updated_at
before update on public.spotify_connections
for each row
execute function public.update_updated_at_column();
