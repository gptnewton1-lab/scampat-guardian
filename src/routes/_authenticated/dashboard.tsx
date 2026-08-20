import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, ScanSearch, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/hooks/useAuth";

import { ImageScan } from "@/components/ImageScan";
import { ResultCard } from "@/components/ResultCard";
import { UpgradeButton } from "@/components/UpgradeDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SAMPLE_MESSAGES } from "@/lib/detect";
import { listScans, scanMessage, type ScanRecord } from "@/lib/scans.functions";
import { ApiError } from "@/lib/watchman-api";

const dashboardSearch = z.object({
  /** "1" when the checkout success_url returns to the app. */
  upgraded: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: dashboardSearch,
  head: () => ({
    meta: [
      { title: "Dashboard — Watchman" },
      {
        name: "description",
        content: "Paste a suspicious SMS to get an instant risk score, scam category and explanation.",
      },
      { property: "og:title", content: "Dashboard — Watchman" },
      { property: "og:description", content: "Scan suspicious SMS messages for scam indicators." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const search = useSearch({ from: "/_authenticated/dashboard" });
  const { refreshTier } = useAuth();
  const [message, setMessage] = useState("");
  const [latest, setLatest] = useState<ScanRecord | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [tierRefreshed, setTierRefreshed] = useState(false);

  // After a checkout redirect (?upgraded=1), re-fetch /me so the UI picks up
  // the new premium tier immediately (the webhook already updated the backend).
  useEffect(() => {
    if (search.upgraded === "1" && !tierRefreshed) {
      setTierRefreshed(true);
      refreshTier()
        .then((u) => {
          if (u.tier === "premium") toast.success("Welcome to Premium!");
        })
        .catch(() =>
          toast.error("Couldn't refresh your plan. Please try again."),
        );
    }
  }, [search.upgraded, tierRefreshed, refreshTier]);

  const scan = useServerFn(scanMessage);
  const fetchScans = useServerFn(listScans);
  const queryClient = useQueryClient();

  const recent = useQuery({
    queryKey: ["scans"],
    queryFn: () => fetchScans(),
  });

  const mutation = useMutation({
    mutationFn: (text: string) => scan({ data: { message: text } }),
    onSuccess: (data) => {
      setLatest(data.scan);
      queryClient.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === "free_limit_reached") {
        setLimitHit(true); // show the inline upgrade banner instead of a toast
        return;
      }
      toast.error(error.message || "Scan failed");
    },
  });

  return (
    <div className="space-y-8">
      {limitHit && (
        <section className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            You've reached your daily scan limit. Upgrade to Premium for
            unlimited scans and photo scanning.
          </p>
          <UpgradeButton size="sm" />
        </section>
      )}

      <section>
        <h1 className="text-2xl font-semibold sm:text-3xl">Scan a message</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste the full SMS exactly as you received it — links and all.
        </p>

        <div className="glass mt-5 rounded-2xl p-4 sm:p-6">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            maxLength={4000}
            placeholder="e.g. URGENT: Your MTN MoMo account has been suspended. Send OTP 123456 to reactivate immediately."
            className="resize-y bg-secondary/40 text-base"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {message.length} / 4000
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setMessage("");
                  setLatest(null);
                }}
                disabled={!message && !latest}
              >
                <Trash2 className="size-4" />
                Clear
              </Button>
              <Button
                onClick={() => mutation.mutate(message)}
                disabled={mutation.isPending || message.trim().length === 0}
              >
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ScanSearch className="size-4" />
                )}
                Analyze message
              </Button>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Try a sample</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_MESSAGES.map((sample, index) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setMessage(sample)}
                  className="max-w-full truncate rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sample {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {latest && (
        <section>
          <h2 className="text-lg font-semibold">Result</h2>
          <div className="mt-3">
            <ResultCard
              riskScore={latest.risk_score}
              status={latest.status}
              category={latest.category}
              reason={latest.reason}
              confidence={latest.confidence}
              signals={latest.signals ?? []}
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">
          Scan from a photo{" "}
          <span className="text-sm font-normal text-muted-foreground">(Premium)</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a screenshot of a scam SMS or chat — we read the text and score it.
        </p>
        <div className="mt-3">
          <ImageScan />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Recent scans</h2>
        {recent.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading history…</p>
        ) : (recent.data?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No scans yet. Your analysed messages will appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.data!.slice(0, 5).map((item) => (
              <li key={item.id} className="glass flex items-center gap-3 rounded-xl px-4 py-3">
                <StatusDot status={item.status} />
                <p className="min-w-0 flex-1 truncate text-sm">{item.message}</p>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {item.risk_score}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "dangerous" ? "bg-danger" : status === "warning" ? "bg-warning" : "bg-success";
  return <span className={`size-2.5 shrink-0 rounded-full ${color}`} aria-label={status} />;
}