CREATE TABLE public.user_watched_movies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  movie_title text NOT NULL,
  tmdb_id     integer,
  watched_at  timestamptz DEFAULT now(),
  completed   boolean DEFAULT false,
  rating      smallint CHECK (rating BETWEEN 1 AND 10),
  poster_url  text,
  genres      text[],
  created_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_watched_movies TO authenticated;
GRANT ALL ON public.user_watched_movies TO service_role;

ALTER TABLE public.user_watched_movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watched movies"
  ON public.user_watched_movies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watched movies"
  ON public.user_watched_movies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watched movies"
  ON public.user_watched_movies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watched movies"
  ON public.user_watched_movies FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX user_watched_movies_user_id_idx ON public.user_watched_movies (user_id);