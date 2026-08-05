-- How much of each call was billed at the cached rate.
--
-- The loop re-sends a 3,700 token instruction manual on every turn, which is
-- the single biggest line in the bill. Providers discount input they have
-- already seen, but only when the identical text leads the request, and until
-- now nothing recorded whether that discount was landing. A saving nobody
-- measures is a saving nobody has.
ALTER TABLE public.engine_runs ADD COLUMN IF NOT EXISTS cached_tokens INT;
