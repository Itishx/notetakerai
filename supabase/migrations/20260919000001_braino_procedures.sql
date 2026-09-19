-- What Braino worked out how to do, kept.
--
-- braino_lessons is the other half of this table and it shipped first, which in
-- hindsight is the wrong way round: he remembers every wall he has ever walked
-- into and not one door he has ever found. A run that books the tickets
-- correctly teaches him nothing, so tomorrow he works it out again from
-- nothing, pays the same ten seconds a turn, and arrives at the same answer.
--
-- Same shape as lessons on purpose, because the hard parts were already solved
-- there and solving them twice differently is how two tables drift:
--   - scoped, so recall is one indexed read and the prompt never becomes a
--     landfill of things that are true somewhere else,
--   - fingerprinted, so the second run to do the same job bumps a count instead
--     of writing a near-duplicate nobody reads,
--   - promoted on the second independent hit, because one run is an anecdote
--     and this table is read by every user's Braino,
--   - advisory, always. A route is a hint about where things were last time. It
--     can never widen what an action is permitted to do, and the confirmation
--     gate does not read this table. Nothing in here can turn a click on Send
--     into a click that does not need asking about.
--
-- The one thing lessons does not need and this does: a door can close. A site
-- redesigns, a button moves, and a remembered route becomes a confident wrong
-- answer, which is worse than no answer. Hence `misses`, and hence a row that
-- has been wrong at least as often as it has been right dropping out of
-- circulation on its own rather than waiting for someone to notice it.

CREATE TABLE IF NOT EXISTS public.braino_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Where this route applies. Same vocabulary as braino_lessons.scope: a host
  -- ("bookmyshow.com"), a tool ("tool:google_doc_create"), or a Mac app
  -- ("app:Notes"). Shared deliberately so the two can be recalled together with
  -- one set of scopes and one mental model.
  scope TEXT NOT NULL,

  -- What was being achieved, in the words it was asked in. Kept because a route
  -- without its goal is a list of clicks, and a list of clicks is not reusable:
  -- the whole question at recall time is "is this the same job".
  goal TEXT NOT NULL,

  -- The route that worked: one line per meaningful action, in his own words for
  -- what he was doing, not the raw action names. This is what gets injected.
  route TEXT NOT NULL,

  -- scope + a normalised form of the goal. The dedup key.
  fingerprint TEXT NOT NULL,

  -- How many actions it took. A second, shorter route for the same job REPLACES
  -- the first, so the library gets faster over time instead of only larger.
  steps INT NOT NULL DEFAULT 0,

  -- Independent runs that finished this job this way.
  hits INT NOT NULL DEFAULT 1,

  -- Runs that were handed this route and then failed on this scope anyway. The
  -- site moved, or the route was never as general as it looked.
  misses INT NOT NULL DEFAULT 0,

  -- proposed: seen once, not yet handed to anybody.
  -- live:     injected into matching runs.
  -- rejected: a human said no. Never injected, never re-proposed.
  --
  -- A live row that has missed as often as it has hit goes back to proposed. It
  -- keeps its count and can earn its way back, which is the right answer for a
  -- site that was down for an afternoon, and it stops being asserted to anyone
  -- in the meantime, which is the right answer for a site that was redesigned.
  status TEXT NOT NULL DEFAULT 'proposed',

  -- The run it came from, so any route can be traced back to the trace that
  -- produced it rather than argued about.
  source_run_id UUID,
  -- Review surface only. Recall never filters on it: one person working out how
  -- a site behaves is worth everybody else not having to.
  source_user_id UUID,

  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS braino_procedures_fingerprint_idx
  ON public.braino_procedures (fingerprint);

-- The recall query is "live routes for these scopes, best first". Partial for
-- the same reason lessons is: proposed and retired rows are never on the hot
-- path and there will eventually be far more of them than live ones.
CREATE INDEX IF NOT EXISTS braino_procedures_live_idx
  ON public.braino_procedures (scope, hits DESC)
  WHERE status = 'live';

ALTER TABLE public.braino_procedures ENABLE ROW LEVEL SECURITY;

-- No policies, exactly like braino_lessons and engine_runs: edge functions read
-- and write with the service role. hil-loop is public (verify_jwt=false), and a
-- public endpoint must not be able to write straight into a table that every
-- other user's Braino reads from.
