create table if not exists public.realtime_voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  started_at timestamp with time zone not null default now(),
  last_heartbeat_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone,
  allocated_ms integer not null check (allocated_ms > 0),
  disconnect_reason text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint realtime_voice_sessions_ended_after_start
    check (ended_at is null or ended_at >= started_at)
);

create index if not exists realtime_voice_sessions_user_started_idx
  on public.realtime_voice_sessions (user_id, started_at desc);

create index if not exists realtime_voice_sessions_user_ended_idx
  on public.realtime_voice_sessions (user_id, ended_at);

alter table public.realtime_voice_sessions enable row level security;

drop policy if exists "Users can view their own realtime voice sessions" on public.realtime_voice_sessions;
create policy "Users can view their own realtime voice sessions"
on public.realtime_voice_sessions for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own realtime voice sessions" on public.realtime_voice_sessions;
create policy "Users can insert their own realtime voice sessions"
on public.realtime_voice_sessions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own realtime voice sessions" on public.realtime_voice_sessions;
create policy "Users can update their own realtime voice sessions"
on public.realtime_voice_sessions for update
using (auth.uid() = user_id);

drop trigger if exists update_realtime_voice_sessions_updated_at on public.realtime_voice_sessions;
create trigger update_realtime_voice_sessions_updated_at
before update on public.realtime_voice_sessions
for each row execute function public.update_updated_at_column();
