import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, LogOut } from "lucide-react";

import { Logo } from "@/components/Logo";
import { UpgradeButton } from "@/components/UpgradeDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/watchman-api";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, user, tier, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const navItems = [
    { to: "/dashboard", label: "Scan" },
    { to: "/history", label: "History" },
  ] as const;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-4">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  pathname === item.to
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {tier === "premium" ? (
              <Badge>Premium</Badge>
            ) : (
              <>
                <Badge variant="secondary">Free</Badge>
                <UpgradeButton variant="secondary" size="sm" />
              </>
            )}
            <span className="hidden max-w-[10rem] truncate text-sm text-muted-foreground sm:block">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => {
                logout();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}