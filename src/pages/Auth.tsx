import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SideBrainLogo from "@/components/SideBrainLogo";
import { supabase } from "@/integrations/supabase/client";

type AuthView = "login" | "signup" | "forgot" | "recovery";

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
    return "That email and password do not match your Supabase account yet. Use Forgot password once to restore manual sign-in.";
  }
  return message;
};

const isRecoveryMode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") === "recovery" || window.location.hash.includes("type=recovery");
};

const Auth = () => {
  const [view, setView] = useState<AuthView>(() => (isRecoveryMode() ? "recovery" : "login"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const enterRecoveryMode = () => {
      setView("recovery");
      setError("");
      setSuccess("Choose a new password for your Braino account.");
    };

    if (isRecoveryMode()) {
      enterRecoveryMode();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        enterRecoveryMode();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const switchView = (nextView: AuthView) => {
    setView(nextView);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
    if (nextView !== "signup") {
      setName("");
    }
    if (nextView !== "recovery") {
      window.history.replaceState({}, document.title, "/auth");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (view === "login") {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(normalizeAuthError(signInError.message));
          return;
        }
        navigate("/");
        return;
      }

      if (view === "signup") {
        const { error: signUpError } = await signUp(email, password, name);
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        setSuccess("Check your email to verify your account before signing in.");
        return;
      }

      if (view === "forgot") {
        const { error: resetError } = await resetPassword(email);
        if (resetError) {
          setError(resetError.message);
          return;
        }
        setSuccess("Password reset email sent. Open the link there and set your new password.");
        return;
      }

      if (password.length < 6) {
        setError("Your new password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Your new passwords do not match.");
        return;
      }

      const { error: updateError } = await updatePassword(password);
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setView("login");
      setSuccess("Password updated. Manual email and password login is ready again.");
      setPassword("");
      setConfirmPassword("");
      window.history.replaceState({}, document.title, "/auth");
    } finally {
      setLoading(false);
    }
  };

  const title =
    view === "login"
      ? "Welcome back"
      : view === "signup"
        ? "Create your account"
        : view === "forgot"
          ? "Reset your password"
          : "Choose a new password";

  const subtitle =
    view === "login"
      ? "Sign in with email and password or continue with Google."
      : view === "signup"
        ? "Create a Braino account with email and password."
        : view === "forgot"
          ? "We will send you a reset link so manual sign-in works again."
          : "Set the password you want to use for manual sign-in.";

  const submitLabel =
    view === "login"
      ? "Sign In"
      : view === "signup"
        ? "Create Account"
        : view === "forgot"
          ? "Send Reset Link"
          : "Update Password";

  const showEmail = view !== "recovery";
  const showPassword = view === "login" || view === "signup" || view === "recovery";
  const showConfirmPassword = view === "recovery";
  const showGoogle = view === "login" || view === "signup";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-28 pb-16 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <SideBrainLogo sizeClass="text-2xl" />
            <p className="text-muted-foreground mt-2">{title}</p>
            <p className="text-sm text-muted-foreground/80 mt-1">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 border border-border/40 rounded-2xl p-6 bg-card/50">
            {view === "signup" && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1"
                />
              </div>
            )}

            {showEmail && (
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1"
                />
              </div>
            )}

            {showPassword && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">{view === "recovery" ? "New password" : "Password"}</Label>
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
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required={showPassword}
                  minLength={6}
                  className="mt-1"
                />
              </div>
            )}

            {showConfirmPassword && (
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-primary">{success}</p>}

            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading ? "Please wait..." : submitLabel}
            </Button>

            {showGoogle && (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full"
                  disabled={loading}
                  onClick={async () => {
                    setError("");
                    const { error: googleError } = await supabase.auth.signInWithOAuth({
                      provider: "google",
                      options: {
                        redirectTo: window.location.origin,
                      },
                    });
                    if (googleError) {
                      setError(googleError.message || "Google sign-in failed");
                    }
                  }}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
              </>
            )}

            <p className="text-center text-sm text-muted-foreground">
              {view === "login" && (
                <>
                  Don&apos;t have an account?{" "}
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
                  Already have an account?{" "}
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
              {view === "recovery" && (
                <>
                  Need the normal sign-in screen?{" "}
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
    </div>
  );
};

export default Auth;
