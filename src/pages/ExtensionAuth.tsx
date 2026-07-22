import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SideBrainLogo from "@/components/SideBrainLogo";

type AuthView = "login" | "signup" | "forgot";
const SUPABASE_AUTH_STORAGE_KEY = "sb-suwhgaxxdizowbyjlljj-auth-token";

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
