
ALTER TABLE public.scheduled_x_posts RENAME COLUMN text TO content;
ALTER TABLE public.scheduled_x_posts RENAME COLUMN posted_tweet_id TO x_post_id;
ALTER TABLE public.scheduled_x_posts RENAME COLUMN error TO error_message;
ALTER TABLE public.scheduled_x_posts ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

ALTER TABLE public.x_connections RENAME COLUMN x_username TO username;
ALTER TABLE public.x_connections ADD COLUMN IF NOT EXISTS display_name TEXT;
