create table if not exists public.agent_commands (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  task text not null,
  status text not null default 'pending',  -- pending | running | done | error
  steps jsonb not null default '[]',
  result text,
  created_at timestamptz default now() not null
);

alter table public.agent_commands enable row level security;

drop policy if exists "Users can manage their own commands" on public.agent_commands;
create policy "Users can manage their own commands"
  on public.agent_commands
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists agent_commands_user_status on public.agent_commands (user_id, status, created_at desc);
