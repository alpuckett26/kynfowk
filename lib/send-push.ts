/**
 * Server-side helper: invoke the send-notification Edge Function.
 *
 * Import this in API routes / server actions that need to push notifications.
 * Never call the Edge Function directly from the client — it requires FUNCTIONS_SECRET.
 */

import type { NotificationType } from "@/lib/push-notifications";

export interface SendPushOptions {
  /** One or more Supabase user UUIDs to notify */
  userIds: string[];
  title: string;
  body: string;
  /** Optional payload forwarded as FCM/APNs data */
  data?: {
    type?: NotificationType;
    deepLink?: string;
    [key: string]: string | undefined;
  };
}

export interface SendPushResult {
  attempted: number;
  successes: number;
  failures: number;
  invalidated: number;
}

export async function sendPush(opts: SendPushOptions): Promise<SendPushResult> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`;
  const secret = process.env.FUNCTIONS_SECRET;

  if (!secret) throw new Error("FUNCTIONS_SECRET env var is not set");

  // Strip undefined values from data so the JSON payload stays clean
  const data = opts.data
    ? Object.fromEntries(
        Object.entries(opts.data).filter(([, v]) => v !== undefined)
      ) as Record<string, string>
    : undefined;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      user_ids: opts.userIds,
      title: opts.title,
      body: opts.body,
      data,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`send-notification failed: ${resp.status} ${text}`);
  }

  return resp.json() as Promise<SendPushResult>;
}
