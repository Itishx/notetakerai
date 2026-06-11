create table if not exists public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_identifier text not null unique,
  google_email text,
  google_user_id text,
  access_token text not null,
  refresh_token text,
  scope text,
  token_expires_at timestamptz,
  primary_calendar_id text not null default 'primary',
  watch_channel_id text,
  watch_resource_id text,
  watch_token text,
  watch_expires_at timestamptz,
  sync_token text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;

drop policy if exists "Users can view their own google calendar connections" on public.google_calendar_connections;
create policy "Users can view their own google calendar connections"
on public.google_calendar_connections for select
using (user_identifier = auth.uid()::text);

drop policy if exists "Users can insert their own google calendar connections" on public.google_calendar_connections;
create policy "Users can insert their own google calendar connections"
on public.google_calendar_connections for insert
with check (user_identifier = auth.uid()::text);

drop policy if exists "Users can update their own google calendar connections" on public.google_calendar_connections;
create policy "Users can update their own google calendar connections"
on public.google_calendar_connections for update
using (user_identifier = auth.uid()::text);

drop policy if exists "Users can delete their own google calendar connections" on public.google_calendar_connections;
create policy "Users can delete their own google calendar connections"
on public.google_calendar_connections for delete
using (user_identifier = auth.uid()::text);

create table if not exists public.google_calendar_reminder_announcements (
  id uuid primary key default gen_random_uuid(),
  user_identifier text not null,
  event_id text not null,
  reminder_key text not null,
  event_start_at timestamptz not null,
  announced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_identifier, event_id, reminder_key)
);

alter table public.google_calendar_reminder_announcements enable row level security;

drop policy if exists "Users can view their own google calendar reminder announcements" on public.google_calendar_reminder_announcements;
create policy "Users can view their own google calendar reminder announcements"
on public.google_calendar_reminder_announcements for select
using (user_identifier = auth.uid()::text);

