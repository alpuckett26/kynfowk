"use client";

import { useEffect } from "react";

export function PwaBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/kynfowk-push-sw.js").catch(() => {
      // Keep the app functional even if service worker registration fails.
    });
  }, []);

  return null;
}
