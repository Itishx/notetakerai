import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SideBrainLogo from "@/components/SideBrainLogo";
import { supabase } from "@/integrations/supabase/client";

/**
 * This page is opened by the Chrome extension for authentication.
 * After the user logs in, it sends the auth token back to the extension
 * via chrome.runtime.sendMessage using the extension ID stored in the URL params.
 */
const ExtensionAuth = () => {
  const { user, session, profile, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const extensionId = params.get("ext");

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/extension?ext=${extensionId}`,
      },
    });
  };

  // When user is authenticated, send token to extension
  useEffect(() => {
    if (!user || !session || !extensionId || sent) return;

    // Use name from profile if loaded, fall back to email. Never send before we have something meaningful.
    const displayName = profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

    const payload = {
      action: "authToken",
      token: session.access_token,
      refreshToken: session.refresh_token,
      userId: user.id,
      displayName,
      email: user.email,
    };

    // Try sending via chrome.runtime.sendMessage (works if extension is installed)
    try {
      const w = window as any;
      if (w.chrome?.runtime?.sendMessage) {
        w.chrome.runtime.sendMessage(extensionId, payload, (response: any) => {
          if (w.chrome.runtime.lastError) {
            console.log("Extension message error:", w.chrome.runtime.lastError.message);
          } else {
            console.log("Auth token sent to extension:", response);
          }
        });
      }
    } catch (e) {
      console.log("Could not send to extension directly");
    }

    // Also write auth data to a hidden DOM element for content script relay (most reliable method)
    const el = document.createElement("div");
    el.id = "sidebrain-auth-data";
    el.style.display = "none";
    el.textContent = JSON.stringify(payload);
    document.body.appendChild(el);

    setSent(true);
  }, [user, session, profile, extensionId, sent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else {
      const { error } = await signUp(email, password, name);
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Check your email to verify your account, then sign in.");
      }
    }
    setSubmitting(false);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <SideBrainLogo sizeClass="text-2xl" />
          <p className="text-muted-foreground mt-2 text-sm">
            Sign in to sync your notes across devices
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-full border border-border bg-card text-sm font-medium hover:bg-muted transition-colors mb-3"
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></svg>
          Continue with Google
        </button>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 border border-border/40 rounded-2xl p-5 bg-card/50">
          {!isLogin && (
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
          <div>
            <label className="text-sm font-medium text-foreground">Password</label>
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

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-primary">{success}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {isLogin ? "No account?" : "Have an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }}
              className="text-primary hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ExtensionAuth;
