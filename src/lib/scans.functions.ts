/**
 * Server functions for Faro-Detect scans.
 *
 * These still run on the server (so our API's CORS/localStorage rules don't
 * matter for them), but they now proxy to our own Watchman FastAPI backend
 * instead of Supabase. The browser attaches the bearer token to the server-fn
 * RPC (see auth-attacher.ts); we read it here and forward it to the API, so
 * every call stays bound to the authenticated user.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import type { ScanResult } from "@/lib/detect";
import { ApiError, type ScanRecord } from "@/lib/watchman-api";
// Re-export the type so existing imports stay working:
//   import { scanMessage, listScans, type ScanRecord } from "@/lib/scans.functions"
export type { ScanRecord } from "@/lib/watchman-api";

// Base URL of the Watchman API. Must match watchman-api.ts (and your backend).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

/** One-line fetch wrapper: forwards the incoming Authorization header. */
async function apiRequest<T>(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: unknown,
): Promise<T> {
  // The request the browser made to OUR server — it carries the bearer token
  // that auth-attacher attached on the client.
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");

  // Build the fetch init WITHOUT a `body` key when we have no body —
  // exactOptionalPropertyTypes (tsconfig) forbids `body: undefined`.
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, init);

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const data = (await res.json()) as { detail?: unknown };
      const detail = data?.detail as
        | { code?: string; message?: string }
        | string
        | undefined;
      if (typeof detail === "string") {
        message = detail;
      } else if (detail && typeof detail.message === "string") {
        message = detail.message;
        code = detail.code;
      }
    } catch {
      /* no JSON body */
    }
    throw code
      ? new ApiError(res.status, message, code)
      : new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const scanInput = z.object({
  message: z.string().trim().min(1, "Message cannot be empty").max(4000, "Message is too long"),
});

/** Analyse a message and persist the result for the current user. */
export const scanMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => scanInput.parse(data))
  .handler(
    async ({ data }): Promise<{ scan: ScanRecord; result: ScanResult }> => {
      return apiRequest<{ scan: ScanRecord; result: ScanResult }>("/detect", "POST", {
        message: data.message,
      });
    },
  );

/** List the current user's scans, newest first. */
export const listScans = createServerFn({ method: "GET" }).handler(
  async (): Promise<ScanRecord[]> => {
    return apiRequest<ScanRecord[]>("/scans", "GET");
  },
);

/** Delete one of the current user's scans. */
export const deleteScan = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await apiRequest<void>(`/scans/${data.id}`, "DELETE");
    return { ok: true };
  });

const imageInput = z.object({
  text: z
    .string()
    .trim()
    .min(1, "No text could be read from the image")
    .max(4000, "Image text is too long"),
});

/** Premium: analyse text extracted (via OCR) from a photo / screenshot. */
export const analyzeImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => imageInput.parse(data))
  .handler(
    async ({ data }): Promise<{ scan: ScanRecord; result: ScanResult }> => {
      return apiRequest<{ scan: ScanRecord; result: ScanResult }>(
        "/analyze-image",
        "POST",
        { text: data.text },
      );
    },
  );