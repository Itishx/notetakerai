
CREATE TABLE IF NOT EXISTS public.x_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_identifier TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  x_user_id TEXT,
  x_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.x_connections TO authenticated;
GRANT ALL ON public.x_connections TO service_role;
ALTER TABLE public.x_connections ENABLE ROW LEVEL SECURITY;
drop policy if exists "Users view own x connections" on public.x_connections;
CREATE POLICY "Users view own x connections" ON public.x_connections FOR SELECT TO authenticated USING (user_identifier = auth.uid()::text);
drop policy if exists "Users insert own x connections" on public.x_connections;
CREATE POLICY "Users insert own x connections" ON public.x_connections FOR INSERT TO authenticated WITH CHECK (user_identifier = auth.uid()::text);
drop policy if exists "Users update own x connections" on public.x_connections;
CREATE POLICY "Users update own x connections" ON public.x_connections FOR UPDATE TO authenticated USING (user_identifier = auth.uid()::text);
drop policy if exists "Users delete own x connections" on public.x_connections;
CREATE POLICY "Users delete own x connections" ON public.x_connections FOR DELETE TO authenticated USING (user_identifier = auth.uid()::text);

CREATE TABLE IF NOT EXISTS public.x_oauth_states (
  state TEXT PRIMARY KEY,
  user_identifier TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.x_oauth_states TO service_role;
ALTER TABLE public.x_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scheduled_x_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  posted_tweet_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_x_posts TO authenticated;
GRANT ALL ON public.scheduled_x_posts TO service_role;
ALTER TABLE public.scheduled_x_posts ENABLE ROW LEVEL SECURITY;
drop policy if exists "Users manage own scheduled x posts" on public.scheduled_x_posts;
CREATE POLICY "Users manage own scheduled x posts" ON public.scheduled_x_posts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
