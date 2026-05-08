import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

/**
 * M42 — global push routing for the mobile app.
 *
 * Mounted once in the RootLayout. Listens for two events:
 *
 *   1. Tap on a notification while the app is in background or
 *      cold-launched from a notification (addNotificationResponseReceivedListener)
 *   2. Notification arrives while the app is in foreground
 *      (addNotificationReceivedListener)
 *
 * For type === "incoming_call" we route to the ring screen in either
 * case so the recipient sees the Accept/Decline UI immediately.
 *
 * Other notification types fall through to the existing UX (banner +
 * inbox), no navigation forced.
 */
export function usePushRouting() {
  useEffect(() => {
    const handlePayload = (data: Record<string, unknown> | null | undefined) => {
      if (!data) return;
      if (data.type === "incoming_call" && typeof data.callId === "string") {
        const callerName =
          typeof data.callerName === "string" ? data.callerName : "";
        const circleName =
          typeof data.circleName === "string" ? data.circleName : "";
        const params = new URLSearchParams();
        if (callerName) params.set("callerName", callerName);
        if (circleName) params.set("circleName", circleName);
        const qs = params.toString() ? `?${params.toString()}` : "";
        router.push(`/calls/${data.callId}/ring${qs}`);
      }
    };

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handlePayload(
          response.notification.request.content.data as
            | Record<string, unknown>
            | null
            | undefined
        );
      }
    );

    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        handlePayload(
          notification.request.content.data as
            | Record<string, unknown>
            | null
            | undefined
        );
      }
    );

    // If the app cold-launched from a notification tap, the response
    // listener above may have missed it. Check getLastNotificationResponseAsync.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        handlePayload(
          response.notification.request.content.data as
            | Record<string, unknown>
            | null
            | undefined
        );
      })
      .catch(() => {
        // expo-notifications can throw on web; safe to ignore.
      });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, []);
}
