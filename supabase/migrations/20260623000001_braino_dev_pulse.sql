-- Braino Dev Pulse: Braino's awareness of his own development history.
-- A single cached snapshot per repo of recent git commits + derived work-rhythm flags
-- (when the builder last worked, late-night/burst/streak, what theme he's been deep in),
-- pulled from the GitHub API. This is GLOBAL, not per-user — it's Braino's own history,
-- the same for whoever is talking to him — so it has no user_id and is service-role only.
-- See supabase/functions/_shared/dev-pulse.ts.

CREATE TABLE IF NOT EXISTS public.braino_dev_pulse (
  repo text primary key,                 -- "owner/name" — the cache key
  payload jsonb not null,                -- the computed pulse (commits + rhythm flags)
  fetched_at timestamptz not null default now()
);

ALTER TABLE public.braino_dev_pulse ENABLE ROW LEVEL SECURITY;

-- No public policies: only the service-role key (used by edge functions) may read/write this.
-- Anon/authenticated clients get nothing, which is what we want — the data reaches users only
-- through Braino's system prompt, never directly.

COMMENT ON TABLE public.braino_dev_pulse IS
  'Braino Dev Pulse: cached snapshot of recent git commits + work-rhythm flags so Braino can ideate about his own development. Service-role only. See supabase/functions/_shared/dev-pulse.ts.';
