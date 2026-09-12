"use client";

import { useEffect } from "react";

/**
 * Registers /public/sw.js on mount. Client component so it only runs in
 * the browser; failures are swallowed (unsupported browser, blocked by
 * an extension, etc.) since the app must work identically without a
 * service worker — installability is a bonus, not a requirement.
 */
export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal: the app works fine uninstalled/without a worker.
      });
    }
  }, []);

  return null;
}
