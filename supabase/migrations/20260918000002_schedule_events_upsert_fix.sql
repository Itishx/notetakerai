-- Make the upsert actually upsert.
--
-- The first migration created the key as a PARTIAL unique index:
--
--   CREATE UNIQUE INDEX ... (user_id, source, source_ref) WHERE source_ref IS NOT NULL;
--
-- Postgres will not use a partial index to resolve ON CONFLICT unless the
-- statement repeats the same WHERE predicate, and PostgREST's on_conflict=
-- parameter has no way to express one. So every sync came back with "there is
-- no unique or exclusion constraint matching the ON CONFLICT specification"
-- and nothing was ever saved.
--
-- The WHERE was there to let rows with no source_ref exist side by side: a
-- spoken "dentist on Thursday" has nothing to reference. It was unnecessary.
-- Postgres treats NULLs as distinct from each other in a unique index by
-- default, so any number of NULL source_ref rows already coexist under a plain
-- constraint. The partial clause bought nothing and cost the whole feature.
--
-- A named constraint rather than a bare index, because that is what PostgREST
-- resolves on_conflict against, and a constraint is the thing a reader looks
-- for when asking why an upsert works.

DROP INDEX IF EXISTS public.schedule_events_source_ref_idx;

ALTER TABLE public.schedule_events
  DROP CONSTRAINT IF EXISTS schedule_events_source_ref_key;

ALTER TABLE public.schedule_events
  ADD CONSTRAINT schedule_events_source_ref_key
  UNIQUE (user_id, source, source_ref);
