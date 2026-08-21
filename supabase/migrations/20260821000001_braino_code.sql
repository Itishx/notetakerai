-- Braino Code MVP1: you say "build me a website like X", a site comes back.
--
-- One row per build. The row is also the progress bar: the edge function
-- updates it as it goes (heard -> spec -> html -> ready) and /code watches
-- the row over realtime. That is why status and spec are separate columns
-- rather than one blob, and why realtime is switched on at the bottom.
--
-- The page itself is bytes in object storage, never in Postgres. Same rule
-- BrainoPhotos follows: metadata here, files there.

create table if not exists public.code_builds (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,

  -- what the person actually said, verbatim, before any cleanup
  brief          text not null,

  -- Braino's restatement of the brief. First thing on screen, ~2s in, so the
  -- person can catch a misunderstanding before it costs them four minutes.
  restated       text,

  -- the design system + sitemap, decided BEFORE any html is written:
  -- { name, tagline, palette{bg,fg,muted,accent,surface}, fonts{display,body},
  --   mood, sections[{id,title,intent}], reference_read }
  -- Shown as beat two on /code. Colour is the thing non-technical people
  -- have real opinions about, so it is surfaced while steering is still cheap.
  spec           jsonb,

  status         text not null default 'queued'
                 check (status in ('queued','designing','writing','ready','failed')),

  -- storage key inside the braino-code bucket, and the public URL we open
  html_path      text,
  preview_url    text,

  error          text,

  -- "make it red" is a new build that inherits the previous spec and html.
  -- Keeping lineage means we can show the person what changed, and lets a
  -- bad edit roll back to its parent instead of rebuilding from the brief.
  parent_build_id uuid references public.code_builds(id) on delete set null,

  -- rough cost accounting, same spirit as engine_runs
  model          text,
  total_tokens   integer,
  elapsed_ms     integer,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists code_builds_user_created_idx
  on public.code_builds (user_id, created_at desc);

create index if not exists code_builds_parent_idx
  on public.code_builds (parent_build_id)
  where parent_build_id is not null;

alter table public.code_builds enable row level security;

-- Builds are private to their owner. The published page is public (anyone with
-- the link can open the site), but the brief and the spec are not.
create policy "own builds readable"
  on public.code_builds for select
  using (auth.uid() = user_id);

create policy "own builds insertable"
  on public.code_builds for insert
  with check (auth.uid() = user_id);

create policy "own builds updatable"
  on public.code_builds for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- /code watches a single row and re-renders the three beats as it changes.
-- Without this the wait screen has to poll, which is both slower to react and
-- noisier on the database.
alter publication supabase_realtime add table public.code_builds;

create or replace function public.touch_code_builds_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists code_builds_touch_updated_at on public.code_builds;
create trigger code_builds_touch_updated_at
  before update on public.code_builds
  for each row execute function public.touch_code_builds_updated_at();

-- The built site. Public read so a finished page can just be opened in a tab
-- (and shared), writes are service-role only: the edge function publishes,
-- the browser never uploads here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'braino-code',
  'braino-code',
  true,
  5242880,
  array['text/html','text/css','application/javascript','image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "braino-code public read" on storage.objects;
create policy "braino-code public read"
  on storage.objects for select
  using (bucket_id = 'braino-code');
