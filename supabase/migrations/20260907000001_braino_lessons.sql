-- What Braino learned the hard way, once, for everyone.
--
-- Every run starts from nothing. He spent five turns and two minutes finding
-- out that Google Docs cannot be typed into, gave up honestly, and tomorrow
-- would have done exactly the same thing. Nine turns went to a page that builds
-- itself in the browser and returns an empty shell to a fetch. None of that is
-- a hard problem the second time; it is only hard the first time, and every run
-- was a first time.
--
-- Deliberately NOT per-user. A user should not have to personally waste two
-- minutes discovering the same thing another user already discovered. This is
-- the one table in the system where the whole point is that it is shared.
--
-- The safety follows from that: a lesson is read by every Braino, so a wrong
-- one is wrong everywhere. Hence status, hence the promotion rule below, and
-- hence lessons being advisory text that can never widen what an action is
-- allowed to do. The confirmation gate does not read this table.

CREATE TABLE IF NOT EXISTS public.braino_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Where this lesson applies, and the reason recall is cheap and precise.
  -- One of: a host ("docs.google.com"), a tool ("tool:google_doc_create"), or a
  -- Mac app ("app:Notes"). A lesson with no scope would have to be injected on
  -- every turn forever, which is how a prompt turns into a landfill.
  scope TEXT NOT NULL,

  -- What was being attempted when it went wrong, in plain words. Kept because a
  -- lesson without its cause reads as an arbitrary rule and gets ignored.
  trigger TEXT NOT NULL,

  -- The lesson itself. One or two lines, general enough to apply next time and
  -- specific enough to act on. This is what gets injected.
  lesson TEXT NOT NULL,

  -- Deduplication key: scope + a normalised form of the trigger. A second run
  -- hitting the same wall bumps the count rather than writing a second row.
  fingerprint TEXT NOT NULL,

  -- How many separate runs have hit this. The promotion rule reads it.
  hits INT NOT NULL DEFAULT 1,

  -- proposed: seen, not yet taught to anyone.
  -- live:     injected into every matching run.
  -- rejected: a human said no. Never injected, never re-proposed.
  --
  -- One run is an anecdote. A lesson goes live on its second independent hit,
  -- so a single strange session cannot teach every Braino something false, and
  -- a real wall still only costs two people instead of everyone.
  status TEXT NOT NULL DEFAULT 'proposed',

  -- The run that first produced it, so any lesson can be traced back to the
  -- actual trace that caused it rather than argued about.
  source_run_id UUID,
  -- Kept for the review surface only. Recall never filters on it: the whole
  -- value is that one person's wasted two minutes saves everybody else's.
  source_user_id UUID,

  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The recall query is "live lessons for these scopes, best first", so it gets
-- the index. Partial, because proposed and rejected rows are never read on the
-- hot path and there will eventually be far more of them than live ones.
CREATE UNIQUE INDEX IF NOT EXISTS braino_lessons_fingerprint_idx
  ON public.braino_lessons (fingerprint);
CREATE INDEX IF NOT EXISTS braino_lessons_live_idx
  ON public.braino_lessons (scope, hits DESC)
  WHERE status = 'live';

ALTER TABLE public.braino_lessons ENABLE ROW LEVEL SECURITY;

-- No policies, the same shape as engine_runs: edge functions write and read with
-- the service role. A public endpoint must not be able to write straight into a
-- table every other user's Braino reads from, which is exactly what an anon
-- insert policy would allow.
