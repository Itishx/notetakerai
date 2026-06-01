DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scheduled_x_posts' AND column_name = 'text'
  ) THEN
    ALTER TABLE public.scheduled_x_posts RENAME COLUMN text TO content;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scheduled_x_posts' AND column_name = 'posted_tweet_id'
  ) THEN
    ALTER TABLE public.scheduled_x_posts RENAME COLUMN posted_tweet_id TO x_post_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scheduled_x_posts' AND column_name = 'error'
  ) THEN
    ALTER TABLE public.scheduled_x_posts RENAME COLUMN error TO error_message;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'x_connections' AND column_name = 'x_username'
  ) THEN
    ALTER TABLE public.x_connections RENAME COLUMN x_username TO username;
  END IF;
END $$;

ALTER TABLE public.scheduled_x_posts ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
ALTER TABLE public.x_connections ADD COLUMN IF NOT EXISTS display_name TEXT;
