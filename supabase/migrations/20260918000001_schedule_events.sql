-- Everything on a person's calendar, whatever told us about it.
--
-- Deliberately not a Mesa table. Mesa's LMS is the first source because it is
-- the one we can see working end to end today, but a student's timetable
-- arrives in four different shapes: an LMS API, Google Calendar, a PDF or photo
-- of a printed timetable, and "I have a dentist appointment on Thursday". One
-- table with a source column costs nothing now and is the difference between
-- adding the second source in an afternoon and rewriting this in a month.
--
-- One more distinction worth getting right up front. There are two shapes of
-- schedule data and they are not the same thing:
--
--   a PATTERN     "Marketing 101, every Monday 9:30, Gamma Classroom"
--   a DATED EVENT "idea submission due 7 Sep, 23:59"
--
-- A PDF timetable gives you patterns. An LMS gives you dated events. This table
-- holds dated events only, because that is what every reader wants: what is on
-- today, what is due this week. Patterns get their own table when PDFs land,
-- and they GENERATE rows here, so a term change regenerates rather than being
-- edited row by row.

CREATE TABLE IF NOT EXISTS public.schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Which plugin put this here. 'mesa' | 'gcal' | 'pdf' | 'manual' | 'voice'.
  -- Text rather than an enum so a new source does not need a migration.
  source TEXT NOT NULL,
  -- That source's own id for this thing, so a re-sync updates the row instead of
  -- writing a duplicate. For Mesa it is the Nexus event uuid; for a spoken
  -- event there is nothing to reference, hence nullable.
  source_ref TEXT,

  title TEXT NOT NULL,
  -- What KIND of thing it is, which is the field every reader actually filters
  -- on: a deadline needs warning about, a class needs a room and a time.
  -- 'class' | 'assignment' | 'exam' | 'workshop' | 'event' | 'holiday'
  kind TEXT NOT NULL DEFAULT 'event',

  course TEXT,
  instructor TEXT,
  room TEXT,
  link TEXT,

  starts_at TIMESTAMPTZ NOT NULL,
  -- A deadline is a moment, not a span, so Nexus sends the same value for both.
  -- Kept nullable rather than copied, so "has no end" stays distinguishable from
  -- "ends when it starts".
  ends_at TIMESTAMPTZ,
  -- The zone the source MEANT, kept alongside the UTC instants. A 23:59
  -- deadline is 18:29Z, and reading that back to someone in UTC is how you tell
  -- a student their submission was due at half six in the evening.
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  all_day BOOLEAN NOT NULL DEFAULT false,

  -- Does missing it cost them something. Mesa marks attendance-required
  -- sessions, and that is exactly what a morning briefing should lead with.
  attendance_required BOOLEAN NOT NULL DEFAULT false,

  -- The source's own last-modified, which is how a sync knows what actually
  -- changed rather than diffing every field of every row.
  source_updated_at TIMESTAMPTZ,
  -- Anything the source sent that has no column here. Cheaper than guessing at
  -- columns for four sources we have not written yet, and it keeps the original
  -- payload recoverable when a field turns out to have mattered.
  raw JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The upsert key. A re-sync must land on the same row, or a week of hourly
-- syncs produces a hundred and sixty copies of Monday's lecture.
--
-- NOT partial, and that is load bearing. This was written as a partial index
-- (WHERE source_ref IS NOT NULL) so that rows with nothing to reference, a
-- spoken "dentist on Thursday", could coexist. Postgres will not resolve ON
-- CONFLICT against a partial index unless the statement repeats the predicate,
-- which PostgREST cannot express, so every sync failed and nothing saved. The
-- clause was also unnecessary: Postgres already treats NULLs as distinct from
-- one another here, so any number of NULL source_ref rows coexist anyway. Fixed
-- forward in 20260918000002; kept correct here so a fresh database is right the
-- first time.
ALTER TABLE public.schedule_events
  ADD CONSTRAINT schedule_events_source_ref_key
  UNIQUE (user_id, source, source_ref);

-- Every read is "this person, this window, in order", so that is the index.
CREATE INDEX IF NOT EXISTS schedule_events_when_idx
  ON public.schedule_events (user_id, starts_at);
-- And "what is due" is common enough to earn its own.
CREATE INDEX IF NOT EXISTS schedule_events_due_idx
  ON public.schedule_events (user_id, kind, starts_at)
  WHERE kind IN ('assignment', 'exam');

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

-- A person's timetable is theirs. Unlike braino_lessons, where the whole point
-- is that everyone shares, nothing here should ever be visible to anybody else,
-- so every policy is scoped to the owner and there is no service-role bypass to
-- read across users.
CREATE POLICY "own schedule readable" ON public.schedule_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own schedule writable" ON public.schedule_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own schedule updatable" ON public.schedule_events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own schedule deletable" ON public.schedule_events
  FOR DELETE USING (auth.uid() = user_id);

-- Where a person's schedule comes from, so onboarding asks once and the sync
-- knows what to do on its own afterwards.
CREATE TABLE IF NOT EXISTS public.schedule_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- Per-source settings. For Mesa there is nothing to store: the browser
  -- already holds the login, which is the whole reason that source is easy.
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS schedule_sources_one_per_kind_idx
  ON public.schedule_sources (user_id, source);

ALTER TABLE public.schedule_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sources readable" ON public.schedule_sources
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own sources writable" ON public.schedule_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sources updatable" ON public.schedule_sources
  FOR UPDATE USING (auth.uid() = user_id);
