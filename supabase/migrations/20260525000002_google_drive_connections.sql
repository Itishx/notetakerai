create table if not exists public.google_drive_connections (
  id uuid primary key default gen_random_uuid(),
  user_identifier text not null unique,
  google_email text,
  access_token text not null,
  refresh_token text,
  scope text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_drive_connections enable row level security;

drop policy if exists "Allow all access to google_drive_connections" on public.google_drive_connections;
drop policy if exists "Users can view their own google drive connections" on public.google_drive_connections;
drop policy if exists "Users can insert their own google drive connections" on public.google_drive_connections;
drop policy if exists "Users can update their own google drive connections" on public.google_drive_connections;
drop policy if exists "Users can delete their own google drive connections" on public.google_drive_connections;
drop policy if exists "Allow access by user_identifier match on google_drive_connections" on public.google_drive_connections;

drop policy if exists "Users can view their own google drive connections" on public.google_drive_connections;
create policy "Users can view their own google drive connections"
on public.google_drive_connections for select
using (user_identifier = auth.uid()::text);

drop policy if exists "Users can insert their own google drive connections" on public.google_drive_connections;
create policy "Users can insert their own google drive connections"
on public.google_drive_connections for insert
with check (user_identifier = auth.uid()::text);

drop policy if exists "Users can update their own google drive connections" on public.google_drive_connections;
create policy "Users can update their own google drive connections"
on public.google_drive_connections for update
using (user_identifier = auth.uid()::text);

drop policy if exists "Users can delete their own google drive connections" on public.google_drive_connections;
create policy "Users can delete their own google drive connections"
on public.google_drive_connections for delete
using (user_identifier = auth.uid()::text);

drop policy if exists "Allow access by user_identifier match on google_drive_connections" on public.google_drive_connections;
create policy "Allow access by user_identifier match on google_drive_connections"
on public.google_drive_connections for all
using (true)
with check (true);
