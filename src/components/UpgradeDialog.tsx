import { useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCheckout, getPlans, type PremiumPlan } from "@/lib/watchman-api";

type Variant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
type Size = "default" | "sm" | "lg" | "icon";

type UpgradeButtonProps = {
  label?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
};

/**
 * Premium upgrade entry point. Opens a dialog listing the Monetbil packages
 * (1 week / 30 days / 90 days); choosing one starts a checkouts through the
 * backend and redirects to Monetbil's mobile-money payment page. After the
 * user pays, Monetbil returns them to `?upgraded=1` and the dashboard's
 * refreshTier() picks up the new premium state.
 */
export function UpgradeButton({
  label = "Upgrade",
  variant,
  size,
  className,
}: UpgradeButtonProps) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<PremiumPlan[] | null>(null);
  const [busy, setBusy] = useState(false);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && plans === null) {
      getPlans().then(setPlans).catch(() => setPlans([]));
    }
  }

  async function buy(plan: PremiumPlan) {
    setBusy(true);
    try {
      const { payment_url } = await createCheckout(plan.id);
      window.location.href = payment_url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't start payment",
      );
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Crown className="size-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Go Premium</DialogTitle>
          <DialogDescription>
            One-time mobile money payment (MTN MoMo / Orange Money).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {plans === null ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : plans.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No plans available right now. Please try again later.
            </p>
          ) : (
            plans.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy}
                onClick={() => buy(p)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-left transition-colors hover:bg-secondary/70 disabled:opacity-60"
              >
                <span>
                  <span className="block font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.days} days of Premium
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {p.price_fcfa.toLocaleString()} FCFA
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}