-- The channel spine (Distra.md section 3).
--
-- X was built as a stack of x_* tables. Adding LinkedIn the same way would mean
-- linkedin_*, then reddit_*, then instagram_*, which is the exact mistake the
-- Distra plan opens by warning about: nine copies of BrainoX.
--
-- So LinkedIn lands on generic tables carrying a `channel` column, and every
-- platform after it does too. X stays on its own tables for now because it
-- works and is publishing; it migrates onto these once LinkedIn has proved the
-- shape is right. One spine, thin adapters.

-- ── Connections ──────────────────────────────────────────────────────────
create table if not exists public.channel_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('linkedin', 'reddit', 'instagram', 'threads', 'bluesky', 'mastodon')),
  -- Provider-side identity
  external_id text,
  handle text,
  display_name text,
  avatar_url text,
  -- Auth. Access tokens are short lived; refresh where the provider offers it.
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  -- Health, so a surface can say "connected, last checked 20s ago" honestly
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, channel)
);

alter table public.channel_connections enable row level security;
drop policy if exists "own channel connections" on public.channel_connections;
create policy "own channel connections" on public.channel_connections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Settings, one row per user per channel ───────────────────────────────
create table if not exists public.channel_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  automation_mode text not null default 'assisted'
    check (automation_mode in ('manual', 'assisted', 'autopilot')),
  kill_switch boolean not null default false,
  quiet_start smallint not null default 22 check (quiet_start between 0 and 23),
  quiet_end smallint not null default 6 check (quiet_end between 0 and 23),
  max_posts_per_day integer not null default 1,
  min_gap_minutes integer not null default 240,
  timezone text not null default 'Asia/Kolkata',
  -- LinkedIn rewards 150-300 words, X rewards the blunt line. Same person,
  -- different room, so length policy is per channel rather than global.
  length_mode text not null default 'substantial'
    check (length_mode in ('punchy', 'balanced', 'substantial')),
  pillars jsonb not null default '[
    {"key": "building", "label": "What I am building", "weight": 30, "paused": false},
    {"key": "founder", "label": "Founder lessons", "weight": 25, "paused": false},
    {"key": "ai", "label": "AI and agents", "weight": 20, "paused": false},
    {"key": "opinion", "label": "Opinions", "weight": 15, "paused": false},
    {"key": "teaching", "label": "Teaching", "weight": 10, "paused": false}
  ]'::jsonb,
  content_mix jsonb not null default '[
    {"day": "Mon", "format": "build-log"},
    {"day": "Tue", "format": "teach"},
    {"day": "Wed", "format": "opinion"},
    {"day": "Thu", "format": "story"},
    {"day": "Fri", "format": "proof"},
    {"day": "Sat", "format": "contrarian"},
    {"day": "Sun", "format": "question"}
  ]'::jsonb,
  -- Same two-layer voice model as X: what they said outranks what he inferred.
  voice_manual jsonb,
  voice_learned jsonb,
  voice_learned_at timestamptz,
  setup_completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, channel)
);

alter table public.channel_settings enable row level security;
drop policy if exists "own channel settings" on public.channel_settings;
create policy "own channel settings" on public.channel_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── The queue ────────────────────────────────────────────────────────────
create table if not exists public.channel_queue_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  kind text not null default 'post' check (kind in ('post', 'comment', 'reply')),
  text text not null,
  original_input text,
  source text not null default 'braino'
    check (source in ('authored', 'raw_thought', 'braino', 'commit', 'idea')),
  pillar text,
  format text,
  -- Comments carry the post they answer. LinkedIn comment drafting is a first
  -- class citizen here because on LinkedIn the comment IS the growth lever.
  target_url text,
  target_excerpt text,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'scheduled', 'publishing',
                      'published', 'failed', 'paused', 'rejected', 'archived')),
  position double precision not null default 0,
  quality jsonb,
  policy jsonb,
  scheduled_publish_at timestamptz,
  published_at timestamptz,
  external_post_id text,
  permalink text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.channel_queue_items enable row level security;
drop policy if exists "own channel queue" on public.channel_queue_items;
create policy "own channel queue" on public.channel_queue_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists channel_queue_user_channel_status_idx
  on public.channel_queue_items (user_id, channel, status, position);
create index if not exists channel_queue_due_idx
  on public.channel_queue_items (channel, status, scheduled_publish_at)
  where status = 'scheduled';

-- ── Action log ───────────────────────────────────────────────────────────
create table if not exists public.channel_action_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  agent text not null,
  action text not null,
  target text,
  reason text,
  meta jsonb,
  result text not null default 'success' check (result in ('success', 'blocked', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.channel_action_log enable row level security;
drop policy if exists "own channel actions" on public.channel_action_log;
create policy "own channel actions" on public.channel_action_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists channel_action_log_user_channel_idx
  on public.channel_action_log (user_id, channel, created_at desc);

-- ── Follower snapshots, per channel ──────────────────────────────────────
create table if not exists public.channel_follower_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  captured_on date not null default current_date,
  followers_count integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, channel, captured_on)
);

alter table public.channel_follower_snapshots enable row level security;
drop policy if exists "own channel snapshots" on public.channel_follower_snapshots;
create policy "own channel snapshots" on public.channel_follower_snapshots for select
  using (auth.uid() = user_id);

-- ── updated_at triggers ──────────────────────────────────────────────────
drop trigger if exists update_channel_connections_updated_at on public.channel_connections;
create trigger update_channel_connections_updated_at before update on public.channel_connections
  for each row execute function public.update_updated_at_column();
drop trigger if exists update_channel_settings_updated_at on public.channel_settings;
create trigger update_channel_settings_updated_at before update on public.channel_settings
  for each row execute function public.update_updated_at_column();
drop trigger if exists update_channel_queue_items_updated_at on public.channel_queue_items;
create trigger update_channel_queue_items_updated_at before update on public.channel_queue_items
  for each row execute function public.update_updated_at_column();

-- ── Dispatch cron: same one minute cadence the X path uses ───────────────
select cron.unschedule('dispatch-channel-posts')
  where exists (select 1 from cron.job where jobname = 'dispatch-channel-posts');

select cron.schedule(
  'dispatch-channel-posts',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1/dispatch-channel-posts',
      body := '{}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 10000
    );
  $$
);
