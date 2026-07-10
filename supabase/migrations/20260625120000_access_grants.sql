-- ─────────────────────────────────────────────────────────────────────────────
-- Admin-managed access allowlist.
-- A table the admin (creator) edits in the Supabase dashboard to grant specific
-- people unlimited (comped) access — they get Pro for free, with no usage caps.
-- Grants are REFLECTED into profiles.is_premium, so the existing premium-resolution
-- path (extension + site already read profiles.is_premium) honors them automatically
-- with zero client code changes.
--   tier = 'admin'      → creator/team, always unlimited
--   tier = 'unlimited'  → comped users, unlimited like Pro
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.access_grants (
  email      text PRIMARY KEY,
  tier       text NOT NULL DEFAULT 'unlimited' CHECK (tier IN ('unlimited', 'admin')),
  note       text,
  granted_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lock it down: no public/anon/auth access. Only service_role and the SQL editor
-- (i.e. the admin) can read or write. Regular users must never see the allowlist.
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;
-- (no policies = deny for everyone except service_role, which bypasses RLS)

-- Keep emails normalized so matching is case-insensitive and conflict-free.
CREATE OR REPLACE FUNCTION public.normalize_access_grant_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS access_grants_normalize_email ON public.access_grants;
CREATE TRIGGER access_grants_normalize_email
BEFORE INSERT OR UPDATE ON public.access_grants
FOR EACH ROW EXECUTE FUNCTION public.normalize_access_grant_email();

-- Reflect a grant onto the matching profile (if that user has signed up already).
CREATE OR REPLACE FUNCTION public.apply_access_grant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier IN ('unlimited', 'admin') THEN
    UPDATE public.profiles p
    SET is_premium = true
    FROM auth.users u
    WHERE lower(u.email) = lower(NEW.email)
      AND p.user_id = u.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_access_grant_change ON public.access_grants;
CREATE TRIGGER on_access_grant_change
AFTER INSERT OR UPDATE ON public.access_grants
FOR EACH ROW EXECUTE FUNCTION public.apply_access_grant();

-- Apply any PENDING grant the moment a granted email signs up (grant can predate signup).
-- Augments the existing handle_new_user() to seed is_premium from the allowlist.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, is_premium)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    EXISTS (
      SELECT 1 FROM public.access_grants g
      WHERE lower(g.email) = lower(NEW.email)
        AND g.tier IN ('unlimited', 'admin')
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Seed the creator as a permanent admin grant (belt-and-suspenders alongside the
-- hardcoded internal-email override in the extension + site).
INSERT INTO public.access_grants (email, tier, note, granted_by)
VALUES ('itishpande21@gmail.com', 'admin', 'Creator — always unlimited, bypasses all gates', 'system')
ON CONFLICT (email) DO UPDATE SET tier = 'admin';

-- Reflect the creator grant onto an existing profile right now.
UPDATE public.profiles p
SET is_premium = true
FROM auth.users u
WHERE lower(u.email) = 'itishpande21@gmail.com'
  AND p.user_id = u.id;
