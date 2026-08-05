-- Hidden Voice Command modes: gated behind a fingerprint/biometric (WebAuthn platform
-- authenticator) prompt on the dashboard. We store only the credential id needed to
-- request a matching assertion — the browser/OS handles the actual biometric check.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hidden_modes_credential_id text;

COMMENT ON COLUMN public.profiles.hidden_modes_credential_id IS
  'WebAuthn platform-authenticator credential id used to unlock hidden Voice Command modes on the dashboard.';
