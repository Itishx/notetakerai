-- Shared email memory (2026-10-17). Every email the engine learns, from a
-- company website, Prospeo, Hunter or a real reply, is kept once, so the next
-- lookup for the same person is instant and free; and every confirmed email
-- teaches the company's format, so one paid lookup unlocks the whole team.
-- Business contact details only. Service role only: no user reads these
-- tables directly, they are used inside the engine.
create table if not exists public.email_directory (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  domain text not null default '',
  name_key text not null default '',       -- lowercased full name
  first_name text not null default '',
  last_name text not null default '',
  linkedin_url text not null default '',
  status text not null default 'found',    -- verified | found | company
  source text not null default '',
  confirmations int not null default 1,
  bounced boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists email_directory_person_idx on public.email_directory (domain, name_key);
create index if not exists email_directory_linkedin_idx on public.email_directory (linkedin_url) where linkedin_url <> '';

create table if not exists public.domain_patterns (
  domain text not null,
  pattern text not null,                    -- first | first.last | firstlast | flast | f.last | first_last | firstl | last
  evidence int not null default 1,          -- confirmed emails that follow it
  misses int not null default 0,            -- bounces on emails built from it
  example text not null default '',
  updated_at timestamptz not null default now(),
  primary key (domain, pattern)
);

alter table public.email_directory enable row level security;
alter table public.domain_patterns enable row level security;
