import { useRef, useState } from "react";
import { Loader2, ScanSearch } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { ResultCard } from "@/components/ResultCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analyzeImage } from "@/lib/scans.functions";
import {
  ApiError,
  CHECKOUT_URL,
  type ScanRecord,
} from "@/lib/watchman-api";

/**
 * PREMIUM image/photo scan.
 *
 * Flow: user picks a screenshot -> tesseract.js reads the text IN THE BROWSER
 * (dynamic import keeps it out of the SSR bundle) -> the extracted text is
 * shown in an editable textarea (paste-text fallback) -> we POST it to
 * /api/v1/analyze-image, which scores it with the same engine as typed
 * messages. Free users get HTTP 402 (code "requires_premium") and we render
 * the upgrade CTA instead of a generic error.
 */
export function ImageScan() {
  const analyze = useServerFn(analyzeImage);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [ocrText, setOcrText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [latest, setLatest] = useState<ScanRecord | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const mutation = useMutation({
    mutationFn: (text: string) => analyze({ data: { text } }),
    onSuccess: (data) => {
      setLatest(data.scan);
      queryClient.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === "requires_premium") {
        setShowUpgrade(true);
        toast.error("Photo scanning is a Premium feature.");
        return;
      }
      toast.error(error.message || "Scan failed");
    },
  });

  async function onPick(file: File) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setOcrBusy(true);
    setShowUpgrade(false);
    try {
      // tesseract.js runs fully in the browser; dynamic import avoids pulling
      // its worker/wasm into the server-rendered bundle.
      const { default: Tesseract } = await import("tesseract.js");
      const { data } = await Tesseract.recognize(file, "eng");
      setOcrText(data.text.trim());
      toast.success("Text read from the image — review it, then analyze.");
    } catch {
      setOcrText("");
      toast.error("Couldn't read the image. You can paste the text manually below.");
    } finally {
      setOcrBusy(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-4 sm:p-6">
      {preview && (
        <img
          src={preview}
          alt="Selected screenshot"
          className="mb-3 max-h-48 rounded-xl border border-border object-cover"
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPick(f);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={ocrBusy}
        >
          {ocrBusy ? <Loader2 className="size-4 animate-spin" /> : "Choose photo"}
        </Button>
        <span className="text-xs text-muted-foreground">
          … or paste the text below
        </span>
      </div>

      <Textarea
        rows={4}
        value={ocrText}
        onChange={(e) => setOcrText(e.target.value)}
        placeholder="Text read from the photo (or paste it manually)"
        className="mt-3 resize-y bg-secondary/40 text-base"
      />

      <div className="mt-3">
        <Button
          onClick={() => mutation.mutate(ocrText)}
          disabled={ocrBusy || mutation.isPending || ocrText.trim().length === 0}
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ScanSearch className="size-4" />
          )}
          Analyze image
        </Button>
      </div>

      {showUpgrade && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Photo scanning is a Premium feature. Upgrade to scan screenshots and
            get unlimited scans.
          </p>
          {CHECKOUT_URL && (
            <Button asChild size="sm">
              <a href={CHECKOUT_URL} target="_blank" rel="noreferrer">
                Upgrade
              </a>
            </Button>
          )}
        </div>
      )}

      {latest && (
        <div className="mt-4">
          <ResultCard
            riskScore={latest.risk_score}
            status={latest.status}
            category={latest.category}
            reason={latest.reason}
            confidence={latest.confidence}
            signals={latest.signals ?? []}
          />
        </div>
      )}
    </div>
  );
}