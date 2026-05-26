create table if not exists public.x_connections (
  id uuid primary key default gen_random_uuid(),
  user_identifier text not null unique,
  x_user_id text,
  username text,
  display_name text,
  access_token text not null,
  access_token_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.x_connections enable row level security;

create trigger update_x_connections_updated_at
before update on public.x_connections
for each row execute function public.update_updated_at_column();

create table if not exists public.x_oauth_request_tokens (
  id uuid primary key default gen_random_uuid(),
  user_identifier text not null,
  oauth_token text not null unique,
  oauth_token_secret text not null,
  created_at timestamptz not null default now()
);

alter table public.x_oauth_request_tokens enable row level security;

create index if not exists x_oauth_request_tokens_lookup_idx
  on public.x_oauth_request_tokens (oauth_token, user_identifier);

create table if not exists public.scheduled_x_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'posted', 'failed', 'cancelled')),
  x_post_id text,
  error_message text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scheduled_x_posts enable row level security;

drop policy if exists "Users can manage their own scheduled X posts" on public.scheduled_x_posts;

create policy "Users can manage their own scheduled X posts"
  on public.scheduled_x_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists scheduled_x_posts_user_status_idx
  on public.scheduled_x_posts (user_id, status, scheduled_at);

create index if not exists scheduled_x_posts_pending_idx
  on public.scheduled_x_posts (status, scheduled_at);

create trigger update_scheduled_x_posts_updated_at
before update on public.scheduled_x_posts
for each row execute function public.update_updated_at_column();
