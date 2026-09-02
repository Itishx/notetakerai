-- Brainotes: the documents Braino writes.
--
-- A research run used to end as a message in a chat, which is where good work
-- goes to be lost. A document has a title, a place, a link you can send, and
-- somewhere for the sources to live. Notion and Google Docs become exports
-- rather than the destination.

create table if not exists public.braino_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Short and in the URL. Not the id, so a link can be read out loud.
  slug text not null unique,
  title text not null,
  -- What was asked, kept beside the answer: a research doc without its question
  -- is hard to judge six weeks later.
  question text,
  markdown text not null default '',
  -- [{ title, url, snippet }]. Every claim in the body should be reachable here.
  sources jsonb not null default '[]'::jsonb,
  -- The sub-questions he actually chased, so the work is inspectable.
  questions_asked jsonb not null default '[]'::jsonb,
  kind text not null default 'research',
  -- Off by default. A link only works for other people once this is on.
  is_public boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists braino_docs_user_idx on public.braino_docs (user_id, created_at desc);
create index if not exists braino_docs_slug_idx on public.braino_docs (slug);

alter table public.braino_docs enable row level security;

create policy "own docs are readable"
  on public.braino_docs for select
  using (auth.uid() = user_id or is_public = true);

create policy "own docs are writable"
  on public.braino_docs for insert
  with check (auth.uid() = user_id);

create policy "own docs are editable"
  on public.braino_docs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own docs are removable"
  on public.braino_docs for delete
  using (auth.uid() = user_id);

-- Comments on a document. Separate table so a comment never rewrites the doc,
-- and so a shared reader can leave one without being able to edit the body.
create table if not exists public.braino_doc_comments (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.braino_docs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text,
  -- Which passage it hangs off. Null means it is about the document as a whole.
  anchor text,
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists braino_doc_comments_doc_idx on public.braino_doc_comments (doc_id, created_at);

alter table public.braino_doc_comments enable row level security;

create policy "comments follow the document"
  on public.braino_doc_comments for select
  using (
    exists (
      select 1 from public.braino_docs d
      where d.id = doc_id and (d.user_id = auth.uid() or d.is_public = true)
    )
  );

create policy "anyone who can read the document can comment"
  on public.braino_doc_comments for insert
  with check (
    exists (
      select 1 from public.braino_docs d
      where d.id = doc_id and (d.user_id = auth.uid() or d.is_public = true)
    )
  );

create policy "the document owner settles comments"
  on public.braino_doc_comments for update
  using (exists (select 1 from public.braino_docs d where d.id = doc_id and d.user_id = auth.uid()));

create policy "the document owner removes comments"
  on public.braino_doc_comments for delete
  using (exists (select 1 from public.braino_docs d where d.id = doc_id and d.user_id = auth.uid()));

create or replace function public.braino_docs_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists braino_docs_touch on public.braino_docs;
create trigger braino_docs_touch before update on public.braino_docs
  for each row execute function public.braino_docs_touch();
