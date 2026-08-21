-- Braino Code: allow a build with nobody signed in.
--
-- Signing in to try the thing is friction at exactly the wrong moment, so a
-- build no longer requires an account. The owner column simply goes null.
--
-- RLS is deliberately NOT loosened to match. The existing policies compare
-- auth.uid() to user_id, and a null user_id can never satisfy them, so an
-- anonymous build is invisible to direct table reads. That is the point: a
-- policy permissive enough to read your own anonymous row (user_id is null)
-- would also let anyone list everybody else's briefs. The edge function hands
-- back a single build by id instead, which keeps knowing-the-uuid as the only
-- capability, the same trust model an unlisted link uses.

alter table public.code_builds
  alter column user_id drop not null;

-- Anonymous builds are the ones that can be abused, so they are the ones worth
-- being able to count quickly. Signed-in builds are already attributable.
create index if not exists code_builds_anon_recent_idx
  on public.code_builds (created_at desc)
  where user_id is null;
