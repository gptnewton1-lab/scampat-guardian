import { useCallback, useEffect, useState } from "react";

import {
  getStoredToken,
  getStoredUser,
  refreshMe,
  type UserTier,
  type WatchmanSession,
  type WatchmanUser,
} from "@/lib/watchman-api";

/** Tracks the current Watchman API session + tier on the client (localStorage). */
export function useAuth() {
  const [session, setSession] = useState<WatchmanSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read our JWT + user from localStorage (set by watchman-api login/signup).
    const token = getStoredToken();
    const user = getStoredUser();
    setSession(token && user ? { access_token: token, user } : null);
    setLoading(false);
  }, []);

  /** Re-fetch /me after a checkout redirect so the UI picks up a new tier. */
  const refreshTier = useCallback(async (): Promise<WatchmanUser> => {
    const updated = await refreshMe();
    setSession((s) => (s ? { ...s, user: updated } : s));
    return updated;
  }, []);

  const user = session?.user ?? null;
  const tier: UserTier = user?.tier ?? "free";
  return { session, user, tier, loading, refreshTier };
}