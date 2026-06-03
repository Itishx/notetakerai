ALTER TABLE public.scheduled_x_posts
  ADD COLUMN IF NOT EXISTS thread_mode boolean NOT NULL DEFAULT false;
