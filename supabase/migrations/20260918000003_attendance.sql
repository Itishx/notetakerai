-- How much of it they actually turned up to.
--
-- Separate from schedule_events because it is a different shape and answers a
-- different question. An event is one thing at one time; attendance is a
-- running ratio per course that only ever means anything in aggregate. Folding
-- a percentage into a row that also has a room and a start time would give
-- every reader a column it has to ignore.
--
-- Kept as a snapshot rather than a log of individual sessions. "Am I going to
-- fall below 75% in Marketing" needs attended, total and the threshold, and
-- nothing else. If per-session history turns out to matter, it is a second
-- table and this one stays correct.

CREATE TABLE IF NOT EXISTS public.attendance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Same plugin idea as schedule_events: Mesa first, others later.
  source TEXT NOT NULL DEFAULT 'mesa',
  -- Empty string is the overall figure across every course; anything else is
  -- that course's own. One table, two grains, because "what is my attendance"
  -- and "what is my attendance in Marketing" are the same question at two zoom
  -- levels and two tables would double every read.
  --
  -- NOT NULL with an empty-string sentinel rather than a nullable column, and
  -- that is deliberate. NULLs are distinct from each other in a unique index, so
  -- a nullable course needs COALESCE in the key, which makes it an EXPRESSION
  -- index, which ON CONFLICT cannot resolve through PostgREST. That is the exact
  -- bug that made schedule_events silently refuse every write. A slightly ugly
  -- sentinel is worth a key that works.
  course TEXT NOT NULL DEFAULT '',

  attended INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  -- Stored rather than computed on read. The source publishes its own
  -- percentage and may round or weight differently than attended/total would
  -- suggest, and the number the student is judged on is the one their school
  -- shows them, not the one we derive.
  percent NUMERIC(5,2),

  -- What counts as trouble, when the source says. Different programmes use
  -- different thresholds and it is not ours to assume 75.
  required_percent NUMERIC(5,2),

  as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per course per source, replaced on every sync. A history of a running
-- total is not the same thing as a running total, and nobody asked for the
-- first one.
--
-- A plain constraint on plain columns, so PostgREST can actually resolve
-- on_conflict against it. See the note on `course` above for why there is no
-- NULL and no COALESCE in here.
ALTER TABLE public.attendance_summary
  ADD CONSTRAINT attendance_summary_course_key
  UNIQUE (user_id, source, course);

ALTER TABLE public.attendance_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own attendance readable" ON public.attendance_summary
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own attendance writable" ON public.attendance_summary
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own attendance updatable" ON public.attendance_summary
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own attendance deletable" ON public.attendance_summary
  FOR DELETE USING (auth.uid() = user_id);
