-- Movie companion feature: track movies watched with Braino

CREATE TABLE IF NOT EXISTS user_watched_movies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  movie_title text NOT NULL,
  tmdb_id     integer,
  watched_at  timestamptz DEFAULT now(),
  completed   boolean DEFAULT false,
  rating      smallint CHECK (rating BETWEEN 1 AND 10),
  poster_url  text,
  genres      text[]
);

ALTER TABLE user_watched_movies ENABLE ROW LEVEL SECURITY;

drop policy if exists "users see own movies" on user_watched_movies;
CREATE POLICY "users see own movies" ON user_watched_movies
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_watched_movies_user_id_idx ON user_watched_movies (user_id);
