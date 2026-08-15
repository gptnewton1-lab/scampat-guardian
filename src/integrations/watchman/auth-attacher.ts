// Attaches our Watchman API bearer token to every server-function RPC.
import { createMiddleware } from "@tanstack/react-start";
import { getStoredToken } from "@/lib/watchman-api";

// Must be registered as a global `functionMiddleware` in `src/start.ts`; otherwise
// the browser never attaches the bearer token to serverFn RPCs.
export const attachWatchmanAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = getStoredToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);