create table if not exists public.team_signatures (
  id            uuid primary key default gen_random_uuid(),
  intern_id     text not null,
  email         text not null,
  signed_name   text not null,
  signed_at     timestamptz not null default now(),
  unique (intern_id, email)
);

alter table public.team_signatures enable row level security;

-- Anyone authenticated can insert their own signature
create policy "intern can sign"
  on public.team_signatures for insert
  to authenticated
  with check (email = auth.jwt() ->> 'email');

-- Anyone authenticated can read all signatures (admin needs to see everyone's)
create policy "authenticated can read"
  on public.team_signatures for select
  to authenticated
  using (true);

-- Seed existing signatures for Vaishnavi and Ritheek
insert into public.team_signatures (intern_id, email, signed_name, signed_at)
values
  ('vaishnavi', 'vaishnavirajagopalan1106@gmail.com', 'Vaishnavi', '2026-06-14T00:00:00Z'),
  ('ritheek',   'ritheekyadav01@gmail.com',           'Ritheek Yadav', '2026-06-14T00:00:00Z')
on conflict (intern_id, email) do nothing;
