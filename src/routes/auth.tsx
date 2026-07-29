import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { GoogleLogo, TaskNestLogo } from "@/components/bits";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TaskNest" },
      { name: "description", content: "Sign in to TaskNest to plan tasks, sub-tasks and habits in one calm workspace." },
      { property: "og:title", content: "Sign in — TaskNest" },
      { property: "og:description", content: "Sign in to TaskNest to plan tasks, sub-tasks and habits in one calm workspace." },
    ],
  }),
  component: AuthPage,
});

type AuthMode = "signin" | "signup" | "reset" | "update_password";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && mode !== "update_password") {
        navigate({ to: "/dashboard", replace: true });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update_password");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (mode !== "update_password" && (!cleanEmail || !emailRegex.test(cleanEmail))) {
      return toast.error("Please enter a valid email address");
    }

    if ((mode === "signin" || mode === "signup" || mode === "update_password") && (!password || password.length < 6)) {
      return toast.error("Password must be at least 6 characters long");
    }

    setBusy(true);
    try {
      if (mode === "reset") {
        // Test if user account exists in Supabase
        const { data: signUpCheck } = await supabase.auth.signUp({
          email: cleanEmail,
          password: "TempCheckPassword999!",
        });

        const accountExists = signUpCheck.user && Array.isArray(signUpCheck.user.identities) && signUpCheck.user.identities.length === 0;

        if (accountExists) {
          const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
            redirectTo: `${window.location.origin}/auth`,
          });
          if (error) throw error;
          toast.success(`Password reset link sent to ${cleanEmail}! Check your inbox.`);
          setMode("signin");
        } else {
          toast.error("Account does not exist with this email. Taking you to sign up...");
          setEmail(cleanEmail);
          setMode("signup");
        }
      } else if (mode === "update_password") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated successfully! Welcome back.");
        navigate({ to: "/dashboard", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name.trim() || cleanEmail.split("@")[0] },
          },
        });
        if (error) throw error;

        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error("An account with this email already exists. Please sign in instead.");
        }

        if (data.session) {
          toast.success("Account created — welcome to TaskNest!");
          navigate({ to: "/dashboard", replace: true });
          return;
        }

        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!signInErr && signInData.session) {
          toast.success("Account created — welcome to TaskNest!");
          navigate({ to: "/dashboard", replace: true });
          return;
        }

        toast.success("Account created! Please sign in.");
        setMode("signin");
      } else {
        // Test if account exists before signing in
        const { data: signUpCheck } = await supabase.auth.signUp({
          email: cleanEmail,
          password: "TempCheckPassword999!",
        });

        const accountExists =
          signUpCheck.user &&
          Array.isArray(signUpCheck.user.identities) &&
          signUpCheck.user.identities.length === 0;

        if (!accountExists) {
          toast.error("An account with this email does not exist. Redirecting to sign up...");
          setEmail(cleanEmail);
          setMode("signup");
          setBusy(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        toast.success("Signed in successfully");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error("Google sign-in failed: " + error.message);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between gradient-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <TaskNestLogo className="size-6 text-primary-foreground" />
          <span className="font-display text-xl font-extrabold">TaskNest</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            Plan the big thing.
            <br />
            Track every small step.
          </h1>
          <p className="mt-4 max-w-sm text-primary-foreground/80">
            Nested tasks with real timelines, a calm board, habits and a dashboard that tells you where the
            week actually went.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">Buckets · Sub-tasks · Habits · Insights</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-extrabold">
            {mode === "signin"
              ? "Welcome back"
              : mode === "signup"
                ? "Create your account"
                : mode === "reset"
                  ? "Reset password"
                  : "Set new password"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to pick up where you left off."
              : mode === "signup"
                ? "Free, and ready in seconds."
                : mode === "reset"
                  ? "Enter your email to receive a password reset link."
                  : "Enter your new password below."}
          </p>

          {mode !== "reset" && mode !== "update_password" && (
            <>
              <Button variant="outline" className="mt-6 w-full cursor-pointer flex items-center justify-center gap-2" onClick={google}>
                <GoogleLogo className="size-4 shrink-0" />
                <span>Continue with Google</span>
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form className="mt-6 grid gap-4" onSubmit={submit}>
            {mode === "signup" && (
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
              </div>
            )}

            {mode !== "update_password" && (
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            )}

            {mode !== "reset" && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">
                    {mode === "update_password" ? "New Password" : "Password"}
                  </Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary cursor-pointer hover:underline"
                      onClick={() => setMode("reset")}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}

            <Button type="submit" disabled={busy} className="cursor-pointer">
              {mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : mode === "reset"
                    ? "Send reset link"
                    : "Update password"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" && (
              <p>
                New here?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary cursor-pointer hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Create an account
                </button>
              </p>
            )}
            {mode === "signup" && (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary cursor-pointer hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === "reset" && (
              <p>
                Remembered your password?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary cursor-pointer hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Back to sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}