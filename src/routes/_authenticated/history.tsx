import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronDown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ResultCard } from "@/components/ResultCard";
import { Button } from "@/components/ui/button";
import { deleteScan, listScans } from "@/lib/scans.functions";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Scan history — Faro-Detect" },
      {
        name: "description",
        content: "Review every SMS you have analysed with Faro-Detect, with status, risk score and timestamp.",
      },
      { property: "og:title", content: "Scan history — Faro-Detect" },
      { property: "og:description", content: "Your saved Faro-Detect scan results." },
    ],
  }),
  component: HistoryPage,
});

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

function HistoryPage() {
  const fetchScans = useServerFn(listScans);
  const removeScan = useServerFn(deleteScan);
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const scans = useQuery({ queryKey: ["scans"], queryFn: () => fetchScans() });

  const remove = useMutation({
    mutationFn: (id: string) => removeScan({ data: { id } }),
    onSuccess: () => {
      toast.success("Scan deleted");
      queryClient.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete scan"),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold sm:text-3xl">Scan history</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every message you have analysed, newest first. Saved to your account.
      </p>

      {scans.isLoading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : (scans.data?.length ?? 0) === 0 ? (
        <div className="glass mt-8 rounded-2xl p-8 text-center text-sm text-muted-foreground">
          You have not scanned anything yet.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {scans.data!.map((item) => {
            const open = openId === item.id;
            return (
              <li key={item.id} className="glass rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                      item.status === "dangerous"
                        ? "bg-danger"
                        : item.status === "warning"
                          ? "bg-warning"
                          : "bg-success"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${open ? "whitespace-normal" : ""}`}>
                      {item.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.created_at)} · {item.category} · {item.risk_score}% risk
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={open ? "Hide details" : "Show details"}
                      onClick={() => setOpenId(open ? null : item.id)}
                    >
                      <ChevronDown
                        className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete scan"
                      onClick={() => remove.mutate(item.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {open && (
                  <div className="mt-4">
                    <ResultCard
                      riskScore={item.risk_score}
                      status={item.status}
                      category={item.category}
                      reason={item.reason}
                      confidence={item.confidence}
                      signals={item.signals ?? []}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}