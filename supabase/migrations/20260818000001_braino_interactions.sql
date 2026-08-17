-- Braino's own interaction log — what people say to Braino and what he says
-- back, across every surface, to improve him. Not sold, not shared.
--
-- One row per interaction: a voice turn, a typed message, a delegate run, a
-- greeting, a recording, a TTS failure, an error. Chrome, Mac and web all write
-- to the same table through the braino-interaction-log function, so the whole
-- picture of how Braino is actually used lives in one place instead of being
-- lost the moment the tab or app closes.
--
-- Same shape as engine_runs: the edge function writes with the service role;
-- nobody inserts or updates directly. The one policy lets a signed-in person
-- read their own rows and nothing else. Anonymous rows (user_id null) are
-- readable by no one except the service role.

CREATE TABLE IF NOT EXISTS public.braino_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Who, if known. Null for anonymous / pre-sign-in events (the Mac may log with
  -- only the anon key). Kept after the account is deleted, unlinked.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Where it happened.
  surface TEXT NOT NULL CHECK (surface IN ('chrome', 'mac', 'web')),
  -- Client-side grouping id (one voice session, one Jarvis takeover, one app
  -- boot). Free text so each surface can use its own scheme.
  session_id TEXT,

  -- What kind of interaction: voice, typed, delegate, greeting, record,
  -- tts_failure, error, ... Free text on purpose; new kinds should not need
  -- a migration.
  kind TEXT NOT NULL,
  -- Which mode Braino was in (jarvis, roam, cowork, her, yap, ...), if any.
  mode TEXT,

  -- The exchange itself.
  user_text TEXT,
  braino_text TEXT,
  -- Which route/handler took the turn (spotify, web_search, delegate, chat, ...).
  route TEXT,

  -- Voice health. tts_failure rows are the ones worth reading first.
  tts_provider TEXT,
  tts_error TEXT,

  -- End-to-end time the person waited, as measured by the client.
  latency_ms INTEGER,
  -- Host of the page Braino was on (never the full URL).
  url_host TEXT,

  -- Anything else the surface wants to keep, small.
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS braino_interactions_created_idx
  ON public.braino_interactions (created_at DESC);
CREATE INDEX IF NOT EXISTS braino_interactions_user_created_idx
  ON public.braino_interactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS braino_interactions_surface_kind_created_idx
  ON public.braino_interactions (surface, kind, created_at DESC);

ALTER TABLE public.braino_interactions ENABLE ROW LEVEL SECURITY;

-- Read your own rows. No insert/update/delete policies: writes are service-role
-- only, through the braino-interaction-log edge function.
DROP POLICY IF EXISTS "braino_interactions_select_own" ON public.braino_interactions;
CREATE POLICY "braino_interactions_select_own"
  ON public.braino_interactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT ALL ON public.braino_interactions TO service_role;
