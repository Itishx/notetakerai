-- x_auto_persona: stores the user's voice/identity configuration for X Auto replies
create table if not exists public.x_auto_persona (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  display_name text not null default '',
  bio text not null default '',
  what_building text not null default '',
  tone_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.x_auto_persona enable row level security;

create policy "Users manage own persona"
  on public.x_auto_persona for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- x_auto_reply_logs: one row per reply sent by X Auto, for dashboard history display
create table if not exists public.x_auto_reply_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  post_author_handle text not null default '',
  post_author_display_name text not null default '',
  post_url text not null default '',
  post_text text not null default '',
  our_reply text not null default '',
  replied_at timestamptz not null default now()
);

alter table public.x_auto_reply_logs enable row level security;

create policy "Users manage own reply logs"
  on public.x_auto_reply_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index x_auto_reply_logs_user_time on public.x_auto_reply_logs (user_id, replied_at desc);
