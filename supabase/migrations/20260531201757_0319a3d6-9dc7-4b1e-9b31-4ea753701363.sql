create table if not exists public.x_auto_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  session_number integer not null,
  status text not null default 'active' check (status in ('active', 'completed', 'stopped')),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  stopped_at timestamptz,
  cooldown_ends_at timestamptz not null,
  last_polled_at timestamptz,
  last_reply_at timestamptz,
  mention_watermark_id text,
  start_followers_count integer not null default 0,
  current_followers_count integer not null default 0,
  followers_gained integer not null default 0,
  start_replies_received integer not null default 0,
  current_replies_received integer not null default 0,
  replies_received integer not null default 0,
  start_total_views integer not null default 0,
  current_total_views integer not null default 0,
  total_views integer not null default 0,
  replies_posted integer not null default 0,
  replies_failed integer not null default 0,
  replies_queued integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.x_auto_sessions to authenticated;
grant all on public.x_auto_sessions to service_role;

alter table public.x_auto_sessions enable row level security;

drop policy if exists "Users can manage own X Auto sessions" on public.x_auto_sessions;

create policy "Users can manage own X Auto sessions"
  on public.x_auto_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create unique index if not exists x_auto_sessions_user_session_number_idx
  on public.x_auto_sessions (user_id, session_number);

create unique index if not exists x_auto_sessions_one_active_per_user_idx
  on public.x_auto_sessions (user_id)
  where status = 'active';

create index if not exists x_auto_sessions_user_started_at_idx
  on public.x_auto_sessions (user_id, started_at desc);

create trigger update_x_auto_sessions_updated_at
before update on public.x_auto_sessions
for each row execute function public.update_updated_at_column();

alter table public.x_auto_reply_logs
  add column if not exists session_id uuid references public.x_auto_sessions(id) on delete set null,
  add column if not exists mention_tweet_id text,
  add column if not exists our_reply_tweet_id text,
  add column if not exists status text not null default 'posted' check (status in ('pending', 'posted', 'failed')),
  add column if not exists error_message text,
  add column if not exists discovered_at timestamptz not null default now();

alter table public.x_auto_reply_logs
  alter column replied_at drop not null;

alter table public.x_auto_reply_logs
  alter column replied_at drop default;

update public.x_auto_reply_logs
set
  status = coalesce(status, 'posted'),
  discovered_at = coalesce(discovered_at, replied_at, now())
where true;

create index if not exists x_auto_reply_logs_session_time_idx
  on public.x_auto_reply_logs (session_id, discovered_at desc);

create index if not exists x_auto_reply_logs_user_discovered_at_idx
  on public.x_auto_reply_logs (user_id, discovered_at desc);

create unique index if not exists x_auto_reply_logs_user_mention_idx
  on public.x_auto_reply_logs (user_id, mention_tweet_id);

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname = 'x-auto-engage'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'x-auto-engage',
    '* * * * *',
    $cron$
      select net.http_post(
        url := 'https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/x-auto-engage',
        body := '{}'::jsonb,
        headers := '{"Content-Type":"application/json"}'::jsonb,
        timeout_milliseconds := 30000
      );
    $cron$
  );
end
$$;