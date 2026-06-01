create table if not exists public.x_automation_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  total_replies integer not null default 0,
  total_runs integer not null default 0,
  total_runtime_ms bigint not null default 0,
  last_run_reply_count integer not null default 0,
  last_run_duration_ms bigint not null default 0,
  last_run_started_at timestamptz,
  last_run_finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.x_automation_stats enable row level security;

drop policy if exists "Users can manage their own X automation stats" on public.x_automation_stats;
create policy "Users can manage their own X automation stats"
  on public.x_automation_stats
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists x_automation_stats_user_idx
  on public.x_automation_stats (user_id);

drop trigger if exists update_x_automation_stats_updated_at on public.x_automation_stats;
create trigger update_x_automation_stats_updated_at
before update on public.x_automation_stats
for each row execute function public.update_updated_at_column();
