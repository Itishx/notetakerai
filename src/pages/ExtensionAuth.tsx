import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SideBrainLogo from "@/components/SideBrainLogo";

type AuthView = "login" | "signup" | "forgot";

const normalizeAuthError = (message: string) => {
  if (message === "Invalid login credentials") {
    return "That email and password do not match your Supabase account yet. Use Forgot password once and then sign in manually.";
  }
  return message;
};

/**
 * This page is opened by the Chrome extension for authentication.
 * After the user logs in, it sends the auth token back to the extension
 * via chrome.runtime.sendMessage using the extension ID stored in the URL params.
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

  useEffect(() => {
    if (!user || !session || !extensionId || sent) return;

    const displayName = profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

    const payload = {
      action: "authToken",
      token: session.access_token,
      refreshToken: session.refresh_token,
      userId: user.id,
      displayName,
      email: user.email,
    };

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

    const existing = document.getElementById("sidebrain-auth-data");
    existing?.remove();

    const el = document.createElement("div");
    el.id = "sidebrain-auth-data";
    el.style.display = "none";
    el.textContent = JSON.stringify(payload);
    document.body.appendChild(el);

    setSent(true);
  }, [user, session, profile, extensionId, sent]);

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
            Returning to Braino…
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
      ? "Manual email and password sign-in works here too."
      : view === "signup"
        ? "Use email and password so the extension can sign in cleanly."
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
