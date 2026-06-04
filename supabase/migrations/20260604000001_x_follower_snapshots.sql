-- Daily follower-count snapshots so the Delegate router can speak a real
-- "you gained +N in the last 7 days" delta. Populated by the x-status edge
-- function (service role) on each on-demand status fetch.
create table if not exists public.x_follower_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_on date not null default current_date,
  followers_count integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, captured_on)
);

alter table public.x_follower_snapshots enable row level security;

-- Writes happen via service role in the edge function; users may read their own.
create policy "own snapshots" on public.x_follower_snapshots
  for select using (auth.uid() = user_id);
