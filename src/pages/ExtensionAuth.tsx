import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SideBrainLogo from "@/components/SideBrainLogo";
import { supabase } from "@/integrations/supabase/client";

type AuthView = "login" | "signup" | "forgot";
const SUPABASE_AUTH_STORAGE_KEY = "sb-suwhgaxxdizowbyjlljj-auth-token";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

const normalizeAuthError = (message: string) => {
  if (message === "Invalid login credentials") {
    return "That email and password do not match your Supabase account yet. Use Forgot password once and then sign in manually.";
  }
  return message;
};

const readStoredBrainoSession = () => {
  try {
    const raw = localStorage.getItem(SUPABASE_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    return stored?.access_token ? stored : null;
  } catch (_error) {
    return null;
  }
};

/**
 * This page is opened by the Chrome extension and the Braino Mac shell for authentication.
 * After login, it relays the auth token to the extension via chrome.runtime, or to the
 * local Mac callback when the Mac app opened the page with a one-time callback URL.
 */
const ExtensionAuth = () => {
  const { user, session, profile, loading, signIn, signUp, resetPassword } = useAuth();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const extensionId = params.get("ext");
  const macCallback = params.get("macCallback");
  const macNonce = params.get("macNonce");
  const isMacAuth = Boolean(macCallback && macNonce);
  const showGoogle = view === "login" || view === "signup";

  useEffect(() => {
    if (sent) return;
    if (!extensionId && !isMacAuth) return;

    const storedSession = readStoredBrainoSession();
    const authSession = session || storedSession;
    const authUser = user || authSession?.user || null;
    if (!authSession?.access_token || !authUser) return;

    const displayName =
      profile?.display_name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split("@")[0] ||
      "User";

    const payload = {
      action: "authToken",
      token: authSession.access_token,
      refreshToken: authSession.refresh_token,
      expiresAt: authSession.expires_at,
      userId: authUser.id,
      displayName,
      email: authUser.email,
    };

    const relayToExtension = () => {
      if (!extensionId) return;
      try {
        const w = window as typeof window & {
          chrome?: {
            runtime?: {
              lastError?: { message?: string };
              sendMessage?: (extensionId: string, payload: unknown, cb: (response: unknown) => void) => void;
            };
          };
        };

        if (w.chrome?.runtime?.sendMessage) {
          w.chrome.runtime.sendMessage(extensionId, payload, (response) => {
            if (w.chrome?.runtime?.lastError) {
              console.log("Extension message error:", w.chrome.runtime.lastError.message);
            } else {
              console.log("Auth token sent to extension:", response);
            }
          });
        }
      } catch (_error) {
        console.log("Could not send to extension directly");
      }
    };

    const exposeDomRelay = () => {
      const existing = document.getElementById("sidebrain-auth-data");
      existing?.remove();

      const el = document.createElement("div");
      el.id = "sidebrain-auth-data";
      el.style.display = "none";
      el.textContent = JSON.stringify(payload);
      document.body.appendChild(el);
    };

    const relayToMac = async () => {
      if (!macCallback || !macNonce) return false;
      try {
        const url = new URL(macCallback);
        if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)) {
          throw new Error("Invalid Braino Mac callback URL.");
        }
        const response = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, nonce: macNonce }),
        });
        if (!response.ok) throw new Error(`Braino Mac callback failed (${response.status}).`);
        setTimeout(() => {
          window.close();
        }, 700);
        return true;
      } catch (relayError) {
        console.log("Braino Mac auth relay failed:", relayError);
        setError(relayError instanceof Error ? relayError.message : "Braino Mac did not accept the sign-in yet.");
        return false;
      }
    };

    if (extensionId) {
      relayToExtension();
      exposeDomRelay();
      setSent(true);
      return;
    }

    if (isMacAuth) {
      relayToMac().then((ok) => {
        if (ok) setSent(true);
      });
    }
  }, [user, session, profile, extensionId, macCallback, macNonce, isMacAuth, sent]);

  const switchView = (nextView: AuthView) => {
    setView(nextView);
    setError("");
    setSuccess("");
    setPassword("");
    if (nextView !== "signup") {
      setName("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (view === "login") {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(normalizeAuthError(signInError.message));
        }
        return;
      }

      if (view === "signup") {
        const { error: signUpError } = await signUp(email, password, name);
        if (signUpError) {
          setError(signUpError.message);
        } else {
          setSuccess("Check your email to verify your account, then sign in.");
        }
        return;
      }

      const { error: resetError } = await resetPassword(email);
      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess("Reset link sent. Open it, choose a new password, then come back and sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setSubmitting(true);

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href,
      },
    });

    if (googleError) {
      setError(googleError.message || "Google sign-in failed.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <SideBrainLogo sizeClass="text-2xl" />
          <h2 className="text-xl font-semibold mt-4 text-foreground">Signed in!</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {isMacAuth ? "Returning to Braino Mac…" : "Returning to Braino…"}
          </p>
        </div>
      </div>
    );
  }

  const title =
    view === "login"
      ? "Sign in to Braino"
      : view === "signup"
        ? "Create your Braino account"
        : "Reset your password";

  const subtitle =
    view === "login"
      ? isMacAuth
        ? "Braino Mac will use this signed-in session for live voice."
        : "Manual email and password sign-in works here too."
      : view === "signup"
        ? isMacAuth
          ? "Use email and password so Braino Mac can sign in cleanly."
          : "Use email and password so the extension can sign in cleanly."
        : "We will send you to the normal reset flow, then you can sign in here again.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <SideBrainLogo sizeClass="text-2xl" />
          <p className="text-foreground mt-2 text-sm font-medium">{title}</p>
          <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 border border-border/40 rounded-2xl p-5 bg-card/50">
          {view === "signup" && (
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>

          {view !== "forgot" && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-foreground">Password</label>
                {view === "login" && (
                  <button
                    type="button"
                    onClick={() => switchView("forgot")}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-primary">{success}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting
              ? "Please wait..."
              : view === "login"
                ? "Sign In"
                : view === "signup"
                  ? "Create Account"
                  : "Send Reset Link"}
          </button>

          {showGoogle && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleSignIn}
                className="w-full py-2 rounded-full border border-border bg-background text-foreground text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground">
            {view === "login" && (
              <>
                No account?{" "}
                <button
                  type="button"
                  onClick={() => switchView("signup")}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
            {view === "signup" && (
              <>
                Have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchView("login")}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
            {view === "forgot" && (
              <>
                Remembered it?{" "}
                <button
                  type="button"
                  onClick={() => switchView("login")}
                  className="text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};

export default ExtensionAuth;
