-- Memory Engine: auto-remembered, self-updating user memory (ChatGPT/Claude-style).
-- Braino extracts durable facts while conversing, stores them here, updates/supersedes old ones,
-- and retrieves the relevant slice per conversation. Manual memory (profiles.overall_memory,
-- notes use_case='memory') is unchanged; this is an additional, auto-managed source.

CREATE TABLE IF NOT EXISTS public.braino_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,                       -- the fact, normalized ("User is building Braino")
  category text not null default 'fact',       -- identity | preference | relationship | project | fact | event
  salience smallint not null default 2,        -- 1 = minor, 2 = normal, 3 = core/important
  source text not null default 'auto',         -- auto | user | voice
  status text not null default 'active',        -- active | archived
  supersedes uuid,                             -- optional: the memory this one replaced
  dedup_key text,                              -- normalized key to avoid near-duplicates
  last_used_at timestamptz,                    -- bumped when injected into a prompt (recency for retrieval)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Retrieval hits this constantly: active memories for a user, ranked by salience.
CREATE INDEX IF NOT EXISTS braino_memories_user_status_salience_idx
  ON public.braino_memories (user_id, status, salience DESC, created_at DESC);

-- Dedup lookups.
CREATE INDEX IF NOT EXISTS braino_memories_user_dedup_idx
  ON public.braino_memories (user_id, dedup_key);

ALTER TABLE public.braino_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own memories" ON public.braino_memories;
CREATE POLICY "Users manage their own memories"
  ON public.braino_memories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Master on/off toggle for the whole memory engine, per user. Default ON.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS memory_enabled boolean NOT NULL DEFAULT true;

COMMENT ON TABLE public.braino_memories IS
  'Braino Memory Engine: auto-extracted, self-updating durable facts about each user. See supabase/functions/_shared/memory-engine.';
