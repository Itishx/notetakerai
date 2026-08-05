-- A verdict on each run, from the person tuning it.
--
-- The log records what happened; this records whether it was RIGHT. That gap is
-- the whole difference between a record and a worklist. When the learnings get
-- folded into the whole mind, what is needed is not four hundred raw runs, it is
-- the forty he got wrong and the one line saying why.
--
-- rating: 'good' | 'bad' | null (unjudged). Kept as text rather than a boolean
-- so a third verdict can be added later without a migration.

ALTER TABLE public.engine_runs ADD COLUMN IF NOT EXISTS rating TEXT;
ALTER TABLE public.engine_runs ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.engine_runs ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- The tuning query is "show me everything I marked bad", so it gets an index.
CREATE INDEX IF NOT EXISTS engine_runs_rating_idx
  ON public.engine_runs (rating, created_at DESC)
  WHERE rating IS NOT NULL;
