"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PushNotificationSettings({
  enabled,
  subscriptionCount,
  publicKey,
  deliveryReady
}: {
  enabled: boolean;
  subscriptionCount: number;
  publicKey: string | null;
  deliveryReady: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const canSubscribe =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(publicKey);

  async function enablePush() {
    if (!canSubscribe || !publicKey) {
      setMessage(
        "Push setup still needs browser support and a VAPID public key before this device can opt in."
      );
      return;
    }

    try {
      setWorking(true);
      setMessage(null);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Browser notifications were not allowed, so push could not be turned on.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/kynfowk-push-sw.js");
      const existingSubscription = await registration.pushManager.getSubscription();

      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        }));

      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON())
      });

      if (!response.ok) {
        throw new Error("Push subscription could not be saved.");
      }

      setMessage(
        deliveryReady
          ? "Push is enabled for this browser. Kynfowk can use it for timely nudges."
          : "This browser is subscribed. Delivery is still scaffolded until the push provider is fully wired."
      );
      router.refresh();
    } catch {
      setMessage("Push setup hit a snag. Please try again from this browser.");
    } finally {
      setWorking(false);
    }
  }

  async function disablePush() {
    try {
      setWorking(true);
      setMessage(null);
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/kynfowk-push-sw.js");
        const subscription = await registration?.pushManager.getSubscription();

        if (subscription) {
          await fetch(
            `/api/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`,
            {
              method: "DELETE"
            }
          );
          await subscription.unsubscribe();
        } else {
          await fetch("/api/push-subscriptions", { method: "DELETE" });
        }
      }

      setMessage("Push was turned off for this browser.");
      router.refresh();
    } catch {
      setMessage("Kynfowk could not remove push from this browser yet. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="push-settings-card stack-sm">
      <p className="meta">
        {enabled
          ? subscriptionCount
            ? `${subscriptionCount} browser subscription${subscriptionCount === 1 ? "" : "s"} saved.`
            : "Push is enabled in preferences, but this browser has not subscribed yet."
          : "Turn on push in your preferences first if you want this browser to get a gentle nudge."}
      </p>
      <div className="call-actions">
        <button
          className="button button-secondary"
          disabled={working || !enabled}
          onClick={enablePush}
          type="button"
        >
          {working ? "Saving push..." : "Enable this browser"}
        </button>
        <button
          className="button button-secondary"
          disabled={working}
          onClick={disablePush}
          type="button"
        >
          Remove this browser
        </button>
      </div>
      <p className="microcopy">
        {deliveryReady
          ? "Push delivery is configured to move through the same quiet-hours and preference rules as your other reminders."
          : "Push delivery is scaffolded. Subscription capture and routing are ready, but production delivery still needs VAPID-backed sending."}
      </p>
      {message ? <p className="form-message">{message}</p> : null}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(normalized);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}
