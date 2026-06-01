-- Extend x_auto_persona with auto-mode controls
alter table public.x_auto_persona
  add column if not exists auto_posting_enabled boolean not null default false,
  add column if not exists auto_reply_enabled boolean not null default false,
  add column if not exists posts_per_day integer not null default 4,
  add column if not exists x_user_id text,
  add column if not exists last_mention_id text;

-- Per-tweet analytics synced hourly
create table if not exists public.x_post_analytics (
  tweet_id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  like_count integer not null default 0,
  retweet_count integer not null default 0,
  reply_count integer not null default 0,
  quote_count integer not null default 0,
  bookmark_count integer not null default 0,
  fetched_at timestamptz not null default now()
);

create index if not exists x_post_analytics_user_id_idx on public.x_post_analytics (user_id);

-- RLS
alter table public.x_post_analytics enable row level security;

drop policy if exists "Users can read own post analytics" on public.x_post_analytics;
create policy "Users can read own post analytics"
  on public.x_post_analytics for select
  using (auth.uid() = user_id);

drop policy if exists "Service role can manage post analytics" on public.x_post_analytics;
create policy "Service role can manage post analytics"
  on public.x_post_analytics for all
  using (true)
  with check (true);

-- Cron: daily tweet generation at 14:00 UTC (6am PST)
select cron.schedule(
  'x-auto-generate',
  '0 14 * * *',
  $$
    select net.http_post(
      url := 'https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/x-auto-generate',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);

-- Cron: mention polling + auto-reply every 30 minutes
select cron.schedule(
  'x-auto-engage',
  '*/30 * * * *',
  $$
    select net.http_post(
      url := 'https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/x-auto-engage',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);

-- Cron: tweet analytics sync every hour
select cron.schedule(
  'x-auto-stats-sync',
  '0 * * * *',
  $$
    select net.http_post(
      url := 'https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/x-auto-stats-sync',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);
