-- Braino Embed: lets a Braino account owner register a third-party website
-- and get back a site_id + one <script> tag that mounts the real Braino
-- mascot, chat, and (spoken-reply) voice on someone else's domain, backed
-- by this same Supabase project. Personality, voice, and memory infra never
-- leave this project; the embedded site only ever gets a scoped client.
-- See skills/braino-embed/SKILL.md for the full integration playbook.

create table if not exists public.embedded_sites (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- Public identifier, safe to embed client-side in the <script> tag. Not a
  -- secret: protection is the allowed_origins check below, the same trust
  -- model Stripe's publishable key / Intercom's app_id use.
  site_id text not null unique default gen_random_uuid()::text,
  allowed_origins text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'disabled')),
  -- The target site's own scoped read endpoint: POST { query, page_url } ->
  -- { context }. Built by whatever Claude Code agent follows
  -- skills/braino-embed/SKILL.md against that site's real database/ORM.
  -- Null until the site owner wires it up; chat still works without it,
  -- just without site-specific grounding.
  bridge_url text,
  -- HMAC key shared with the bridge so it can verify a request really came
  -- from this project. Service-role read only — RLS below blocks it from
  -- ever reaching the widget or another owner.
  bridge_secret text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.embedded_sites enable row level security;

drop policy if exists "Owners manage their own embedded sites" on public.embedded_sites;
create policy "Owners manage their own embedded sites"
  on public.embedded_sites for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create index if not exists embedded_sites_site_id_idx on public.embedded_sites (site_id);
create index if not exists embedded_sites_owner_idx on public.embedded_sites (owner_user_id);

drop trigger if exists update_embedded_sites_updated_at on public.embedded_sites;
create trigger update_embedded_sites_updated_at
before update on public.embedded_sites
for each row execute function public.update_updated_at_column();
