-- BrainoX distribution layer (BrainoX.md, MVP slice).
-- Sits ABOVE the existing publish path: items graduate draft -> approved ->
-- scheduled, at which point brainox-schedule inserts a scheduled_x_posts row
-- and the existing dispatch-scheduled-x-posts cron publishes it. This file
-- adds the queue, the idea inbox, per-user settings, and the action log.

-- ── Queue ────────────────────────────────────────────────────────────────

create table if not exists public.x_queue_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  -- The user's original words (raw thought or authored post) before any
  -- Braino transformation. Provenance per BrainoX.md section 78.
  original_input text,
  source text not null default 'authored'
    check (source in ('authored', 'raw_thought', 'braino', 'follow_up', 'idea')),
  pillar text,
  content_type text not null default 'post' check (content_type in ('post', 'thread')),
  thread_mode boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'scheduled', 'publishing',
                      'published', 'failed', 'paused', 'rejected', 'archived')),
  -- Fractional position keeps drag-and-drop reorders to a single-row update.
  position double precision not null default 0,
  -- User-pinned: assisted/autopilot planning may never move a locked item.
  locked boolean not null default false,
  priority integer not null default 50,
  quality jsonb,
  policy jsonb,
  why jsonb,
  suggested_publish_at timestamptz,
  scheduled_publish_at timestamptz,
  scheduled_post_id uuid references public.scheduled_x_posts(id) on delete set null,
  x_post_id text,
  published_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.x_queue_items enable row level security;

drop policy if exists "Users can manage their own X queue items" on public.x_queue_items;
create policy "Users can manage their own X queue items"
  on public.x_queue_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists x_queue_items_user_status_position_idx
  on public.x_queue_items (user_id, status, position);
create index if not exists x_queue_items_user_scheduled_idx
  on public.x_queue_items (user_id, scheduled_publish_at);

drop trigger if exists update_x_queue_items_updated_at on public.x_queue_items;
create trigger update_x_queue_items_updated_at
before update on public.x_queue_items
for each row execute function public.update_updated_at_column();

-- ── Idea inbox (ideas never disappear, BrainoX.md section 95) ────────────

create table if not exists public.x_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  status text not null default 'inbox' check (status in ('inbox', 'drafted', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.x_ideas enable row level security;

drop policy if exists "Users can manage their own X ideas" on public.x_ideas;
create policy "Users can manage their own X ideas"
  on public.x_ideas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists x_ideas_user_status_idx
  on public.x_ideas (user_id, status, created_at desc);

-- ── Per-user distribution settings ───────────────────────────────────────

create table if not exists public.x_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  automation_mode text not null default 'manual'
    check (automation_mode in ('manual', 'assisted', 'autopilot')),
  -- Emergency kill switch (BrainoX.md section 75): blocks all scheduling and
  -- publishing through brainox-schedule while true.
  kill_switch boolean not null default false,
  quiet_start smallint not null default 23 check (quiet_start between 0 and 23),
  quiet_end smallint not null default 7 check (quiet_end between 0 and 23),
  min_gap_minutes integer not null default 90,
  max_posts_per_day integer not null default 5,
  daily_target integer not null default 100,
  timezone text not null default 'Asia/Kolkata',
  pillars jsonb not null default '[
    {"key": "building-braino", "label": "Building Braino", "weight": 30, "paused": false},
    {"key": "founder", "label": "Founder Journey", "weight": 20, "paused": false},
    {"key": "ai-agents", "label": "AI / Agents", "weight": 15, "paused": false},
    {"key": "contrarian", "label": "Contrarian Opinions", "weight": 10, "paused": false},
    {"key": "technical", "label": "Technical Insights", "weight": 10, "paused": false},
    {"key": "industry", "label": "Industry Commentary", "weight": 10, "paused": false},
    {"key": "experimental", "label": "Experimental", "weight": 5, "paused": false}
  ]'::jsonb,
  voice_profile jsonb not null default '{
    "tone": "direct, confident, a builder talking, not a brand",
    "sentence_length": "short to medium, one idea per sentence",
    "humor": "dry, occasional, never forced",
    "forbidden": ["em dashes", "en dashes", "hashtag stuffing", "Here is the thing", "The future is", "game changer", "delve"],
    "notes": "Itish owns the voice. No invented experiences, customers, numbers, or achievements."
  }'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.x_settings enable row level security;

drop policy if exists "Users can manage their own X settings" on public.x_settings;
create policy "Users can manage their own X settings"
  on public.x_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists update_x_settings_updated_at on public.x_settings;
create trigger update_x_settings_updated_at
before update on public.x_settings
for each row execute function public.update_updated_at_column();

-- ── Action log (every decision explained, BrainoX.md sections 79, 106) ───

create table if not exists public.x_action_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent text not null,
  action text not null,
  target text,
  reason text,
  meta jsonb,
  result text not null default 'success' check (result in ('success', 'blocked', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.x_action_log enable row level security;

-- Users read their own history; writes come from the user (UI actions) or
-- the service role (edge functions), both scoped to the owning user.
drop policy if exists "Users can read their own X action log" on public.x_action_log;
create policy "Users can read their own X action log"
  on public.x_action_log for select
  using (auth.uid() = user_id);

drop policy if exists "Users can append their own X action log" on public.x_action_log;
create policy "Users can append their own X action log"
  on public.x_action_log for insert
  with check (auth.uid() = user_id);

create index if not exists x_action_log_user_created_idx
  on public.x_action_log (user_id, created_at desc);
