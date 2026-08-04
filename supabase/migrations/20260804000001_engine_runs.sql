-- Every call to a reasoning engine, recorded.
--
-- Both intelligence layers are tuned by hand, one prompt edit at a time, and
-- that is impossible without a record of what was actually asked and what came
-- back. Before this table, every test run was thrown away when the tab closed:
-- the same command got re-run to see the same answer, which is both slower and
-- a waste of paid calls. Token counts are stored for the same reason, so the
-- cost of a tuning session is a number rather than a feeling.
--
-- One row per model call, so a Loop run with nine turns writes nine rows tied
-- together by run_id. The Lab and Reply surfaces write one row each.

CREATE TABLE IF NOT EXISTS public.engine_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Which engine answered: hil-reason, hil-loop, or braino-reply.
  engine TEXT NOT NULL,
  -- Groups the turns of one Loop run. Single-shot engines get a fresh id.
  run_id UUID,
  -- 1 for single-shot; the turn number within a Loop run.
  turn INT NOT NULL DEFAULT 1,

  -- What was asked.
  command TEXT NOT NULL,
  context TEXT,

  -- What came back, whole, so nothing has to be re-run to be re-read.
  response JSONB,
  -- The parts worth filtering on without opening the JSON.
  moment_id TEXT,
  verdict TEXT,

  -- What it cost.
  model TEXT,
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  elapsed_ms INT,

  -- Failures are the most valuable rows here, so they are recorded too.
  ok BOOLEAN NOT NULL DEFAULT true,
  error TEXT,

  -- Prompt version at the time of the call, so a behaviour change can be traced
  -- to the edit that caused it.
  prompt_version TEXT
);

CREATE INDEX IF NOT EXISTS engine_runs_created_idx ON public.engine_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS engine_runs_engine_idx ON public.engine_runs (engine, created_at DESC);
CREATE INDEX IF NOT EXISTS engine_runs_run_idx ON public.engine_runs (run_id, turn);

ALTER TABLE public.engine_runs ENABLE ROW LEVEL SECURITY;
-- No policies, same shape as hil_feedback: the edge functions write with the
-- service role, and reads go through engine-runs, which checks the caller is
-- the creator. Anon can neither read nor write this table directly, so a public
-- demo endpoint cannot be used to mine what other people typed.
