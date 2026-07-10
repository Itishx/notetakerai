-- ─────────────────────────────────────────────────────────────────────────────
-- Free-tier usage tracking (V1 two-tier launch).
-- One row per user. Daily counters (voice_seconds, recording_seconds, chat_count)
-- reset when `day` rolls over; monthly counter (delegate_count) resets when `month`
-- rolls over. The `check-and-consume` edge fn (service_role) reads + resets + mutates
-- this server-side so caps can't be bypassed by clearing extension storage.
-- Premium/creator/admin are never written here (they short-circuit as unlimited).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  day               date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  month             text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM'),
  voice_seconds     integer NOT NULL DEFAULT 0,
  recording_seconds integer NOT NULL DEFAULT 0,
  chat_count        integer NOT NULL DEFAULT 0,
  delegate_count    integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- Users may READ their own usage (so the bar can show "3/5 left" meters).
-- Writes happen only via service_role in the edge fn (bypasses RLS) — no user write policy.
DROP POLICY IF EXISTS "own usage read" ON public.usage_counters;
CREATE POLICY "own usage read"
ON public.usage_counters FOR SELECT
USING (auth.uid() = user_id);
