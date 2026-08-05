-- Human Intelligence Layer — feedback from the /human-intelligence lab.
-- Free-text notes on a specific run ("this should have asked", "this shouldn't
-- have"), captured alongside the exact reasoning that produced them, so the
-- prompt can be tuned by hand against a real log of what actually went wrong.
-- Public can insert (the lab is public); nobody can read except service_role
-- (the edge function) — same shape as the waitlist table.

CREATE TABLE IF NOT EXISTS public.hil_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  command TEXT NOT NULL,
  context TEXT,
  moment_id TEXT,
  reasoning JSONB,
  note TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.hil_feedback ENABLE ROW LEVEL SECURITY;
-- No policies: writes go through the hil-feedback edge function (service_role,
-- bypasses RLS); nobody else can read or write this table, including anon.
