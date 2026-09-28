"use client";

import { useEffect } from "react";

/**
 * Registers the offline-caching service worker. Production only: in dev,
 * `next dev` isn't the static export the service worker is built for, and
 * a registered worker there would serve stale pages over HMR.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline caching is a progressive enhancement; the app still works without it.
    });
  }, []);
  return null;
}
