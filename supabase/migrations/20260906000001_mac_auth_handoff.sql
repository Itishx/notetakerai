-- Handing a signed-in session from the browser to the Braino Mac app.
--
-- The app used to listen on a loopback port and have the website POST to it.
-- Chrome no longer allows a public https page to reach 127.0.0.1: it stops the
-- request inside the browser, so the app is never contacted and no header on
-- our side can change that. A braino:// deep link is the usual answer, but it
-- needs the scheme declared in a packaged app bundle, which rules it out while
-- the Mac app runs from source.
--
-- So the two sides meet here instead. The browser writes the session under the
-- nonce the app generated; the app polls for that one nonce and claims it once.
-- Nothing listens on a port and nothing needs the operating system's help.
create table if not exists public.mac_auth_handoffs (
  nonce       text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

-- Deliberately no policies. Row Level Security is on and nothing is granted, so
-- the table is reachable only by the service role inside the edge function.
-- The nonce is 24 random bytes and is spent on first claim, which is what keeps
-- the claim side safe without a JWT the app does not yet have.
alter table public.mac_auth_handoffs enable row level security;

create index if not exists mac_auth_handoffs_created_at_idx
  on public.mac_auth_handoffs (created_at);

-- A session that was never collected is rubbish after five minutes, and it is
-- rubbish that contains a refresh token, so it does not get to linger.
create or replace function public.purge_stale_mac_auth_handoffs()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.mac_auth_handoffs where created_at < now() - interval '5 minutes';
$$;
