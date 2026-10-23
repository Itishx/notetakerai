-- Braino Foundry projects, saved per signed-in user (2026-10-23).
-- Until now every project lived only in the browser. One row per project; the
-- whole project is one JSON document, the same shape the app already keeps.
create table if not exists public.foundry_projects (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  primary key (user_id, id)
);

create index if not exists foundry_projects_user_updated on public.foundry_projects (user_id, updated_at desc);

alter table public.foundry_projects enable row level security;

drop policy if exists "foundry_projects_own_select" on public.foundry_projects;
create policy "foundry_projects_own_select" on public.foundry_projects for select using (auth.uid() = user_id);
drop policy if exists "foundry_projects_own_insert" on public.foundry_projects;
create policy "foundry_projects_own_insert" on public.foundry_projects for insert with check (auth.uid() = user_id);
drop policy if exists "foundry_projects_own_update" on public.foundry_projects;
create policy "foundry_projects_own_update" on public.foundry_projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "foundry_projects_own_delete" on public.foundry_projects;
create policy "foundry_projects_own_delete" on public.foundry_projects for delete using (auth.uid() = user_id);
