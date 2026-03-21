"use client";

/**
 * DeepLinkHandler — listens for incoming kynfowk:// URLs on native platforms
 * and navigates the WebView to the corresponding path.
 *
 * URL mapping:
 *   kynfowk://auth/callback?code=xxx  →  /auth/callback?code=xxx
 *   kynfowk://calls/456               →  /calls/456
 *   kynfowk://dashboard               →  /dashboard
 *
 * Uses window.location.assign (hard nav) so server routes like
 * /auth/callback execute properly and cookies are set.
 */

import { useEffect } from "react";

export function DeepLinkHandler() {
  useEffect(() => {
    // Only run inside the Capacitor native shell
    if (typeof window === "undefined") return;
    if (!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) return;

    let cleanup: (() => void) | null = null;

    async function setup() {
      const { App } = await import("@capacitor/app");

      const handle = await App.addListener("appUrlOpen", (event) => {
        // Strip "kynfowk://" → "/path?query"
        // e.g. "kynfowk://auth/callback?code=abc" → "/auth/callback?code=abc"
        const path = "/" + event.url.replace(/^kynfowk:\/\//, "");

        if (path && path !== "/") {
          // Full navigation ensures server route handlers (auth callback) run
          window.location.assign(path);
        }
      });

      cleanup = () => handle.remove();
    }

    setup();

    return () => { cleanup?.(); };
  }, []);

  return null;
}
