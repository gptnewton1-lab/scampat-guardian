/**
 * Watchman API client — the single place the SPA talks to our FastAPI backend.
 *
 * This REPLACES the Supabase client. Instead of `supabase.auth.*` and
 * `from("scans").insert(...)`, we call our decoupled REST API:
 *
 *   signup/login        -> POST /api/v1/auth/signup | /api/v1/auth/login
 *   detect (scan)       -> POST /api/v1/detect
 *   list / delete scans -> GET /api/v1/scans | DELETE /api/v1/scans/{id}
 *
 * The JWT returned by login/signup is stored in localStorage (exactly like
 * Supabase's persisted session) and re-attached as
 * `Authorization: Bearer <token>` on every protected call.
 */

// Base URL of the Watchman API. Configurable via VITE_API_BASE_URL (see
// .env.example); falls back to the local dev backend.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

// ---------------------------------------------------------------------------
// Types (they mirror the backend DTOs in models.py 1:1)
// ---------------------------------------------------------------------------
export type UserTier = "free" | "premium";

export type WatchmanUser = {
  id: string;
  email: string;
  display_name: string | null;
  /** "free" | "premium" - drives feature gating (set server-side by the payment webhook). */
  tier: UserTier;
};

export type WatchmanSession = {
  access_token: string;
  user: WatchmanUser;
};

export type ScanSignal = {
  label: string;
  detail: string;
  weight: number;
};

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

export type DetectResponse = {
  /** snake_case ScanRecord — exactly what the dashboard/ResultCard render. */
  scan: ScanRecord;
  /** camelCase ScanResult mirror (old server-fn shape), for convenience. */
  result: {
    riskScore: number;
    status: string;
    category: string;
    reason: string;
    confidence: number;
    signals: ScanSignal[];
  };
};

// ---------------------------------------------------------------------------
// Session storage (localStorage, client-side only, SSR-safe)
// ---------------------------------------------------------------------------
const TOKEN_KEY = "watchman.access_token";
const USER_KEY = "watchman.user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): WatchmanUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WatchmanUser>;
    // Backward-compatible: users stored before tiers existed default to "free".
    if (!parsed || typeof parsed.tier !== "string") {
      return { ...(parsed as WatchmanUser), tier: "free" };
    }
    return parsed as WatchmanUser;
  } catch {
    return null;
  }
}

function setSession(token: string, user: WatchmanUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/** Gateway checkout URL for the Premium upgrade (from env; undefined = no URL). */
export const CHECKOUT_URL = import.meta.env.VITE_CHECKOUT_URL;

/** Machine-readable body FastAPI returns on 4xx (e.g. 402 code + message). */
type ApiErrorDetail = { code?: string; message?: string };

/** Typed error carrying the HTTP status and the backend's machine code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper: one place for headers, error parsing, JSON decode.
// ---------------------------------------------------------------------------
type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  token?: string | null;
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // Build the fetch init WITHOUT a `body` key when we have no body —
  // exactOptionalPropertyTypes (tsconfig) forbids `body: undefined`.
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
  };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${path}`, init);

  if (!res.ok) {
    // FastAPI 402s carry a machine-readable code in `detail`: { code, message }.
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const data = (await res.json()) as { detail?: unknown };
      const detail = data?.detail as ApiErrorDetail | string | undefined;
      if (typeof detail === "string") {
        message = detail;
      } else if (detail && typeof detail.message === "string") {
        message = detail.message;
        code = detail.code;
      }
    } catch {
      /* no JSON body — keep the default message */
    }
    throw code
      ? new ApiError(res.status, message, code)
      : new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T; // DELETE returns No Content
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function signup(
  email: string,
  password: string,
  display_name?: string,
): Promise<WatchmanSession> {
  const data = await request<WatchmanSession & { token_type: string }>("/auth/signup", {
    method: "POST",
    body: { email, password, display_name },
  });
  setSession(data.access_token, data.user);
  return data;
}

export async function login(email: string, password: string): Promise<WatchmanSession> {
  const data = await request<WatchmanSession & { token_type: string }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  setSession(data.access_token, data.user);
  return data;
}

export function logout(): void {
  clearSession();
}

export async function getMe(): Promise<WatchmanUser> {
  return request<WatchmanUser>("/me", { token: getStoredToken() });
}

/**
 * Re-fetch the current user from /me and refresh the stored session. Called
 * after a checkout redirect so the UI picks up the (new) premium tier.
 */
export async function refreshMe(): Promise<WatchmanUser> {
  const token = getStoredToken();
  const user = await request<WatchmanUser>("/me", { token });
  if (token) setSession(token, user);
  return user;
}

// ---------------------------------------------------------------------------
// Scans
// ---------------------------------------------------------------------------
export async function detect(message: string): Promise<DetectResponse> {
  return request<DetectResponse>("/detect", {
    method: "POST",
    token: getStoredToken(),
    body: { message },
  });
}

export async function listScans(): Promise<ScanRecord[]> {
  return request<ScanRecord[]>("/scans", { token: getStoredToken() });
}

export async function deleteScan(id: string): Promise<void> {
  await request<void>(`/scans/${id}`, { method: "DELETE", token: getStoredToken() });
}