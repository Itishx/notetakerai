
-- Create storage bucket for note images
INSERT INTO storage.buckets (id, name, public) VALUES ('note-images', 'note-images', true);

-- Allow anyone to upload to note-images bucket
CREATE POLICY "Allow public upload to note-images" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'note-images');

-- Allow public read of note-images
CREATE POLICY "Allow public read of note-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'note-images');
