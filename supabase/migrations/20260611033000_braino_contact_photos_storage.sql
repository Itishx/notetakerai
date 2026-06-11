insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'braino-contact-photos',
  'braino-contact-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

do $$ begin
  drop policy if exists "braino_contact_photos_insert" on storage.objects;
  create policy "braino_contact_photos_insert"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'braino-contact-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  drop policy if exists "braino_contact_photos_delete" on storage.objects;
  create policy "braino_contact_photos_delete"
    on storage.objects for delete to authenticated
    using (
      bucket_id = 'braino-contact-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when duplicate_object then null;
end $$;
