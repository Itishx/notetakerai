-- Brainotes as a shelf, not just a research output.
--
-- The research documents and a page of class notes are the same object: a title,
-- a body, things he found, things you added. So they share a table and differ by
-- kind, which is what makes "add your own" work at all — a note you started and
-- a document he wrote open in the same place and edit the same way.

-- Physical lectures are the point. A class is a room, a date, and a subject
-- long before it is a recording, and the note has to exist before any audio does.
alter table public.braino_docs add column if not exists subject text;
alter table public.braino_docs add column if not exists happened_on date;
-- Where the note came from, when it came from somewhere: a lecture recording,
-- a slide deck, a photo of a whiteboard.
alter table public.braino_docs add column if not exists source_note_id uuid;

create index if not exists braino_docs_kind_idx on public.braino_docs (user_id, kind, created_at desc);
create index if not exists braino_docs_subject_idx on public.braino_docs (user_id, subject) where subject is not null;

-- Images in a note: slides photographed in a lecture theatre, a diagram off a
-- whiteboard, something pasted in afterwards.
--
-- The bucket is public-read on purpose. A document is meant to be shared as a
-- link, and signed URLs expire, so a note shared on Monday would lose its
-- pictures by Friday. Writes are still restricted to the owner's own folder, so
-- the only exposure is that an image URL, once shared, keeps working.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'braino-doc-images',
  'braino-doc-images',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists braino_doc_images_insert on storage.objects;
create policy braino_doc_images_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'braino-doc-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists braino_doc_images_read on storage.objects;
create policy braino_doc_images_read on storage.objects
  for select
  using (bucket_id = 'braino-doc-images');

drop policy if exists braino_doc_images_delete on storage.objects;
create policy braino_doc_images_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'braino-doc-images' and (storage.foldername(name))[1] = auth.uid()::text);
