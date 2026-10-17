-- Outreach sending (2026-10-17): Gmail sends, follow-ups that stop on reply,
-- replies sorted with a drafted answer, and per-user sending settings.
create table if not exists public.outreach_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.outreach_leads(id) on delete cascade,
  brief_id uuid references public.outreach_briefs(id) on delete cascade,
  channel text not null default 'email',
  step int not null default 0,              -- 0 first message, 1 and 2 follow-ups, 9 a reply we sent
  status text not null default 'queued',    -- queued | sent | failed | cancelled
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  subject text not null default '',
  body text not null default '',
  provider_message_id text not null default '',
  thread_id text not null default '',
  error text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists outreach_sends_due_idx on public.outreach_sends (status, scheduled_for);
create index if not exists outreach_sends_user_idx on public.outreach_sends (user_id, created_at desc);
create index if not exists outreach_sends_lead_idx on public.outreach_sends (lead_id, step);

alter table public.outreach_leads add column if not exists thread_id text not null default '';
alter table public.outreach_leads add column if not exists contacted_at timestamptz;
alter table public.outreach_leads add column if not exists replied_at timestamptz;
alter table public.outreach_leads add column if not exists reply_text text not null default '';
alter table public.outreach_leads add column if not exists reply_kind text not null default '';   -- interested | question | not_now | wrong_person | unsubscribe | other
alter table public.outreach_leads add column if not exists reply_draft text not null default '';

create table if not exists public.outreach_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  booking_url text not null default '',
  daily_cap int not null default 20,
  from_name text not null default '',
  first_send_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.outreach_sends enable row level security;
alter table public.outreach_settings enable row level security;
drop policy if exists "own sends" on public.outreach_sends;
create policy "own sends" on public.outreach_sends for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own outreach settings" on public.outreach_settings;
create policy "own outreach settings" on public.outreach_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The every-10-minutes tick (send due follow-ups, check replies) is scheduled
-- outside this file, because its request carries a secret that must not live
-- in git. See Braino Knowledge Base/features/outreach-engine.md.
