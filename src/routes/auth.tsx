import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { login, signup } from "@/lib/watchman-api";

const searchSchema = z.object({
  mode: z.enum(["login", "register"]).optional(),
});

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Watchman" },
      {
        name: "description",
        content: "Sign in or create your Watchman account to scan suspicious SMS and keep your scan history.",
      },
      { property: "og:title", content: "Sign in — Watchman" },
      {
        property: "og:description",
        content: "Access your Watchman dashboard and scan history.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useAuth();

  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    if (!sessionLoading && session) navigate({ to: "/dashboard" });
  }, [session, sessionLoading, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid credentials");
      return;
    }

    setBusy(true);
    try {
      if (mode === "register") {
        await signup(parsed.data.email, parsed.data.password);
        toast.success("Welcome to Watchman");
      } else {
        await login(parsed.data.email, parsed.data.password);
        toast.success("Signed in");
      }
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-6xl px-5 py-6">
        <Link to="/">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="glass w-full max-w-md rounded-3xl p-7 sm:p-9">
          <h1 className="text-2xl font-semibold">
            {mode === "register" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "register"
              ? "Start scanning suspicious messages in seconds."
              : "Sign in to reach your dashboard and scan history."}
          </p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "register" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "register" ? "Already have an account?" : "New to Watchman?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
              }}
            >
              {mode === "register" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}