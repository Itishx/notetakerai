/* Finishes a Braino Mac sign-in from whatever page you happened to land on.
 *
 * /auth/extension does this itself when it gets the session back on its own
 * URL. This exists for when it does not: Supabase falls back to the Site URL
 * whenever it dislikes the redirect_to it was handed, so you arrive signed in
 * on the homepage with the token in the hash and every callback parameter
 * gone. The Mac app is still sitting on its port waiting. This picks the
 * details up out of storage and finishes the handoff anyway. */
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { readPendingMacHandoff, clearPendingMacHandoff, postMacHandoff } from "@/lib/macAuthHandoff";

export default function MacAuthCompleter() {
  const { user, session, profile } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (!session?.access_token || !user) return;

    /* The relay page handles itself; two POSTs of the same nonce is one too
       many, and it is the one that can show an error to the person waiting. */
    if (window.location.pathname.startsWith("/auth/extension")) return;

    const pending = readPendingMacHandoff();
    if (!pending) return;

    done.current = true;
    const displayName =
      profile?.display_name ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split("@")[0] ||
      "User";

    void postMacHandoff(pending.macCallback, pending.macNonce, {
      action: "authToken",
      token: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      userId: user.id,
      displayName,
      email: user.email,
    })
      .then(() => clearPendingMacHandoff())
      .catch((error) => {
        /* The app may have given up and be on a new port by now. Nothing to
           show here: the person is on a normal page and is signed in. */
        console.log("Braino Mac handoff from fallback page failed:", error);
        clearPendingMacHandoff();
      });
  }, [user, session, profile]);

  return null;
}
