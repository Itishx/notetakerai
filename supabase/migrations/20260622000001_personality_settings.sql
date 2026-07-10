-- Emotional Engine: per-user personality toggles (dad jokes, humor register, pushback intensity…).
-- Stored as jsonb on profiles. Null/absent => the engine uses DEFAULT_PERSONALITY_SETTINGS.
-- Shape (all optional): { "dadJokes": bool, "humor": "off"|"dry"|"playful",
--                         "pushback": "gentle"|"direct", "warmth": "measured"|"warm" }

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personality_settings jsonb;

COMMENT ON COLUMN public.profiles.personality_settings IS
  'Braino Emotional Engine toggles (jsonb). Read by loadUserKnowledge; sanitized by resolvePersonalitySettings. Null = defaults.';
