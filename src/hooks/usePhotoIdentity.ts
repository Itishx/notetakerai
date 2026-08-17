/**
 * Identity for BrainoPhotos without a sign-in wall.
 *
 * /photos should open and work on first visit. But every byte path in this
 * feature is protected by RLS keyed on auth.uid(), and throwing that away to
 * remove a login screen would make every library publicly readable.
 *
 * Supabase anonymous sign-in gives us both: no sign-in UI, and a real JWT, so
 * the row and storage policies from the migration keep working untouched. If
 * the visitor is already signed in with a real account we use that instead, so
 * signing in later is what upgrades a device library into an account library.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type IdentityState = "resolving" | "ready" | "blocked";

export function usePhotoIdentity() {
  const { user, loading } = useAuth();
  const [blocked, setBlocked] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (loading || user || attempted.current) return;
    attempted.current = true;
    supabase.auth
      .signInAnonymously()
      .then(({ error }) => {
        // AuthContext's onAuthStateChange picks the new session up, so on success
        // there is nothing to set here: `user` arrives on the next render.
        if (error) setBlocked(error.message);
      })
      .catch((err) => setBlocked(err instanceof Error ? err.message : "Could not start a session"));
  }, [user, loading]);

  const state: IdentityState = user ? "ready" : blocked ? "blocked" : "resolving";

  return {
    user,
    state,
    blocked,
    /** True while the library is device-scoped rather than tied to a real account. */
    isAnonymous: !!user && (user as { is_anonymous?: boolean }).is_anonymous === true,
  };
}
