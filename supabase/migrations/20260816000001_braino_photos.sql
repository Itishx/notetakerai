-- BrainoPhotos MVP1
-- Bytes live in object storage, metadata lives here. Never store blobs in Postgres.

create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- content address: same photo from two devices dedupes to one row
  sha256        text not null,
  filename      text not null,
  mime          text not null default 'image/jpeg',
  bytes         bigint not null default 0,
  width         integer,
  height        integer,

  -- when the shutter fired (from EXIF), not when it was uploaded
  taken_at      timestamptz,

  -- tiny base64 placeholder so the grid never flashes grey
  blur_data     text,

  -- three derivatives, three keys
  orig_path     text not null,
  preview_path  text,
  thumb_path    text,

  is_favorite   boolean not null default false,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),

  constraint photos_user_sha_unique unique (user_id, sha256)
);

create index if not exists photos_user_taken_idx on public.photos (user_id, taken_at desc nulls last);
create index if not exists photos_user_live_idx  on public.photos (user_id, deleted_at) where deleted_at is null;
create index if not exists photos_user_fav_idx   on public.photos (user_id) where is_favorite and deleted_at is null;

alter table public.photos enable row level security;

drop policy if exists photos_select on public.photos;
create policy photos_select on public.photos
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists photos_insert on public.photos;
create policy photos_insert on public.photos
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists photos_update on public.photos;
create policy photos_update on public.photos
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists photos_delete on public.photos;
create policy photos_delete on public.photos
  for delete to authenticated using (auth.uid() = user_id);

-- Private bucket. Reads go through short-lived signed URLs, batched per page.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'braino-photos', 'braino-photos', false, 104857600,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Every object is keyed <user_id>/..., so the first path segment is the ACL.
drop policy if exists braino_photos_insert on storage.objects;
create policy braino_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'braino-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists braino_photos_select on storage.objects;
create policy braino_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'braino-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists braino_photos_delete on storage.objects;
create policy braino_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'braino-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Storage meter for the header, computed server-side so the client can't lie about it.
create or replace function public.photos_usage()
returns table (photo_count bigint, bytes_used bigint)
language sql stable security definer set search_path = public as $$
  select count(*)::bigint, coalesce(sum(bytes), 0)::bigint
  from public.photos
  where user_id = auth.uid() and deleted_at is null;
$$;
