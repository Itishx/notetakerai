create table if not exists public.braino_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  name_key text not null,
  email text,
  phone text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name_key)
);

create index if not exists braino_contacts_user_id_idx
  on public.braino_contacts (user_id);

create index if not exists braino_contacts_user_email_idx
  on public.braino_contacts (user_id, email);

alter table public.braino_contacts enable row level security;

drop policy if exists "Users can view their own Braino contacts" on public.braino_contacts;
create policy "Users can view their own Braino contacts"
on public.braino_contacts for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own Braino contacts" on public.braino_contacts;
create policy "Users can insert their own Braino contacts"
on public.braino_contacts for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Braino contacts" on public.braino_contacts;
create policy "Users can update their own Braino contacts"
on public.braino_contacts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own Braino contacts" on public.braino_contacts;
create policy "Users can delete their own Braino contacts"
on public.braino_contacts for delete
using (auth.uid() = user_id);

drop trigger if exists update_braino_contacts_updated_at on public.braino_contacts;
create trigger update_braino_contacts_updated_at
before update on public.braino_contacts
for each row execute function public.update_updated_at_column();
