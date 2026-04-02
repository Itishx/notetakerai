import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SideBrainLogo from "@/components/SideBrainLogo";

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

  // When user is authenticated, send token to extension
  useEffect(() => {
    if (!user || !session || !extensionId || sent) return;

    const displayName = profile?.display_name || user.email || "User";

    // Try sending via chrome.runtime.sendMessage (works if extension is installed)
    try {
      const w = window as any;
      if (w.chrome?.runtime?.sendMessage) {
        w.chrome.runtime.sendMessage(extensionId, {
          action: "authToken",
          token: session.access_token,
          refreshToken: session.refresh_token,
          userId: user.id,
          displayName,
          email: user.email,
        });
      }
    } catch (e) {
      console.log("Could not send to extension directly, using storage fallback");
    }

    // Also store in localStorage so extension content script can pick it up
    localStorage.setItem("sidebrain_ext_auth", JSON.stringify({
      token: session.access_token,
      refreshToken: session.refresh_token,
      userId: user.id,
      displayName,
      email: user.email,
    }));

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
          <h2 className="text-xl font-semibold mt-4 text-foreground">You're logged in!</h2>
          <p className="text-muted-foreground mt-2">
            You can close this tab and return to the SideBrain extension.
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
