/**
 * Server functions for Faro-Detect scans.
 *
 * These run on the server and are protected by the Supabase auth middleware,
 * so every call is bound to the authenticated user and RLS applies.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeMessage, type ScanResult, type ScanSignal } from "@/lib/detect";

export type ScanRecord = {
  id: string;
  message: string;
  risk_score: number;
  status: string;
  category: string;
  reason: string;
  confidence: number;
  signals: ScanSignal[];
  created_at: string;
};

const scanInput = z.object({
  message: z.string().trim().min(1, "Message cannot be empty").max(4000, "Message is too long"),
});

/** Analyse a message and persist the result for the current user. */
export const scanMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => scanInput.parse(data))
  .handler(async ({ data, context }): Promise<{ scan: ScanRecord; result: ScanResult }> => {
    const result = analyzeMessage(data.message);

    const { data: inserted, error } = await context.supabase
      .from("scans")
      .insert({
        user_id: context.userId,
        message: data.message,
        risk_score: result.riskScore,
        status: result.status,
        category: result.category,
        reason: result.reason,
        confidence: result.confidence,
        signals: result.signals,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { scan: inserted as unknown as ScanRecord, result };
  });

/** List the current user's scans, newest first. */
export const listScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ScanRecord[]> => {
    const { data, error } = await context.supabase
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ScanRecord[];
  });

/** Delete one of the current user's scans. */
export const deleteScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("scans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });