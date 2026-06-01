-- Add media attachment support to scheduled X posts

ALTER TABLE public.scheduled_x_posts
  ADD COLUMN IF NOT EXISTS media_url text;

-- Public storage bucket for X post media (images + videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'x-post-media',
  'x-post-media',
  true,
  104857600,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','video/x-msvideo']
) ON CONFLICT (id) DO NOTHING;

-- Only authenticated users can upload to their own folder
DO $$ BEGIN
  CREATE POLICY "x_post_media_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'x-post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can delete their own files
DO $$ BEGIN
  CREATE POLICY "x_post_media_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'x-post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
