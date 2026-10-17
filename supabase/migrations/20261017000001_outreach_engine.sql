-- Outreach Engine (2026-10-17): brief -> leads -> events, plus a do-not-contact list.
-- Every row belongs to one user and only that user can see it. The engine
-- function writes with the service role on the user's behalf, always setting
-- user_id from the verified token, never from the request body.

create table if not exists public.outreach_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  ask text not null default '',          -- what they typed: who they want to sell to
  offer text not null default '',        -- what they are selling, in their words
  icp jsonb not null default '{}'::jsonb, -- the structured target profile
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'draft',  -- draft | hunting | ready | failed
  stats jsonb not null default '{}'::jsonb, -- found, kept, discarded, cost_usd
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outreach_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_id uuid not null references public.outreach_briefs(id) on delete cascade,
  dedupe_key text not null,              -- linkedin url, email, or name+company
  name text not null default '',
  title text not null default '',
  seniority text not null default '',
  company text not null default '',
  company_domain text not null default '',
  industry text not null default '',
  company_size text not null default '',
  location text not null default '',
  email text not null default '',
  email_status text not null default 'unknown', -- verified | guessed | unknown
  linkedin_url text not null default '',
  website text not null default '',
  summary text not null default '',
  signals jsonb not null default '[]'::jsonb,   -- [{kind, text, date, url}]
  sources jsonb not null default '[]'::jsonb,   -- [{name, url}]
  features jsonb not null default '{}'::jsonb,  -- what the ranker reads
  score numeric not null default 0,
  score_parts jsonb not null default '{}'::jsonb, -- fit, timing, reach, lookalike
  reasons jsonb not null default '[]'::jsonb,
  discarded boolean not null default false,
  discard_reason text not null default '',
  status text not null default 'new',    -- new | drafted | sent | replied | booked | not_interested | opted_out
  message jsonb not null default '{}'::jsonb, -- {channel, subject, body, followups: []}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brief_id, dedupe_key)
);
create index if not exists outreach_leads_brief_idx on public.outreach_leads (brief_id, score desc);
create index if not exists outreach_leads_user_status_idx on public.outreach_leads (user_id, status);

create table if not exists public.outreach_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.outreach_leads(id) on delete cascade,
  kind text not null, -- sent | replied | booked | not_interested | opted_out | bounced
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists outreach_events_user_idx on public.outreach_events (user_id, created_at desc);

create table if not exists public.outreach_suppression (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null, -- lowercased email, domain, or linkedin url
  reason text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.outreach_briefs enable row level security;
alter table public.outreach_leads enable row level security;
alter table public.outreach_events enable row level security;
alter table public.outreach_suppression enable row level security;

drop policy if exists "own briefs" on public.outreach_briefs;
create policy "own briefs" on public.outreach_briefs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own leads" on public.outreach_leads;
create policy "own leads" on public.outreach_leads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own events" on public.outreach_events;
create policy "own events" on public.outreach_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own suppression" on public.outreach_suppression;
create policy "own suppression" on public.outreach_suppression for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
