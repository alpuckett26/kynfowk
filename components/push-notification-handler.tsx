"use client";

/**
 * PushNotificationHandler
 *
 * Mounted once in the root layout. Handles the full native push lifecycle:
 *   1. Permission request (skips if already granted/denied)
 *   2. Device token registration → saved to /api/push-token
 *   3. Foreground notification → dispatches kynfowk:notification DOM event
 *   4. Notification tap (background / cold-start) → deep-link navigation
 *
 * Only runs inside the Capacitor native shell (no-op on web).
 */

import { useEffect } from "react";
import { routeNotificationDeepLink, type PushData } from "@/lib/push-notifications";

export function PushNotificationHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const getPlatform = cap.getPlatform?.bind(cap) ?? (() => "unknown");

    let didCleanup = false;

    async function setup() {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const { App } = await import("@capacitor/app");

      // ── 1. Permission ───────────────────────────────────────────────────
      const { receive } = await PushNotifications.checkPermissions();

      if (receive === "denied") return; // user explicitly denied — respect it

      if (receive !== "granted") {
        const { receive: result } = await PushNotifications.requestPermissions();
        if (result !== "granted") return;
      }

      if (didCleanup) return;

      // ── 2. Register ──────────────────────────────────────────────────────
      await PushNotifications.register();

      // ── 3. Token received → POST to backend ─────────────────────────────
      await PushNotifications.addListener("registration", async (token) => {
        try {
          let appVersion: string | undefined;
          try {
            const info = await App.getInfo();
            appVersion = info.version;
          } catch {
            // getInfo() throws in browser/dev — safe to ignore
          }

          await fetch("/api/push-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token:       token.value,
              platform:    getPlatform(),
              app_version: appVersion,
            }),
          });
        } catch (err) {
          console.error("[push] Failed to save token:", err);
        }
      });

      // ── 4. Registration error ────────────────────────────────────────────
      await PushNotifications.addListener("registrationError", (err) => {
        console.error("[push] Registration error:", err.error);
      });

      // ── 5. Foreground notification received ──────────────────────────────
      // iOS/Android don't auto-show a banner when the app is open.
      // Dispatch a DOM event so any in-app UI can pick it up.
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        window.dispatchEvent(
          new CustomEvent<typeof notification>("kynfowk:notification", {
            detail: notification,
          })
        );
      });

      // ── 6. Notification tapped (background + cold-start) ─────────────────
      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action.notification.data as Partial<PushData>;
        if (data?.deepLink) {
          routeNotificationDeepLink(data.deepLink);
        }
      });
    }

    setup();

    return () => {
      didCleanup = true;
      import("@capacitor/push-notifications").then(({ PushNotifications }) => {
        PushNotifications.removeAllListeners();
      });
    };
  }, []);

  return null;
}
