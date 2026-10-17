-- How a founder writes (2026-10-17). Read from samples they paste and their
-- sent emails, plus what they say about themselves. Every channel writer
-- (outreach now, the Content Engine later) reads this one record.
create table if not exists public.writing_voices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  self_described text not null default '',
  samples jsonb not null default '[]'::jsonb,   -- [{source, text}]
  profile jsonb not null default '{}'::jsonb,   -- VoiceProfile
  updated_at timestamptz not null default now()
);
alter table public.writing_voices enable row level security;
drop policy if exists "own voice" on public.writing_voices;
create policy "own voice" on public.writing_voices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
