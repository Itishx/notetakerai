DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'x_connections'
      AND column_name = 'access_token_secret' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.x_connections ALTER COLUMN access_token_secret DROP NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='x_connections' AND column_name='refresh_token') THEN
    ALTER TABLE public.x_connections ADD COLUMN refresh_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='x_connections' AND column_name='token_expires_at') THEN
    ALTER TABLE public.x_connections ADD COLUMN token_expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='x_connections' AND column_name='scope') THEN
    ALTER TABLE public.x_connections ADD COLUMN scope TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='x_connections' AND column_name='x_username')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='x_connections' AND column_name='username') THEN
    ALTER TABLE public.x_connections RENAME COLUMN x_username TO username;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='x_connections' AND column_name='username') THEN
    ALTER TABLE public.x_connections ADD COLUMN username TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='x_connections' AND column_name='display_name') THEN
    ALTER TABLE public.x_connections ADD COLUMN display_name TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.x_oauth_states (
  state           TEXT PRIMARY KEY,
  user_identifier TEXT NOT NULL,
  code_verifier   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.x_oauth_states TO service_role;
ALTER TABLE public.x_oauth_states ENABLE ROW LEVEL SECURITY;