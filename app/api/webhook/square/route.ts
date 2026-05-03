/**
 * POST /api/webhook/square
 *
 * Square posts subscription / invoice events here. We verify the
 * signature against SQUARE_WEBHOOK_SIGNATURE_KEY, then reconcile
 * the affected user's profiles.is_paid_tier with the new state.
 *
 * Events we care about:
 *   - subscription.updated       → status flipped (ACTIVE / PAUSED /
 *                                  DEACTIVATED / CANCELED)
 *   - invoice.payment_made       → renewal succeeded; nothing to do
 *                                  beyond logging (paid tier already on)
 *   - invoice.scheduled_charge_failed → payment failed; flip to free
 *                                       after grace period (handled
 *                                       implicitly when status flips
 *                                       to DEACTIVATED)
 *
 * We use the service-role Supabase client because the webhook isn't
 * tied to any user session — it comes from Square's servers.
 *
 * Webhook URL to register in Square Dashboard:
 *   https://kynfowk.com/api/webhook/square
 */

import {
  getSubscription,
  isSquareConfigured,
  verifyWebhookSignature,
} from "@/lib/square";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const NOTIFICATION_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://kynfowk.com") +
  "/api/webhook/square";

interface SquareWebhookEnvelope {
  merchant_id?: string;
  type?: string;
  event_id?: string;
  data?: {
    type?: string;
    id?: string;
    object?: {
      subscription?: { id: string; status: string };
    };
  };
}

export async function POST(request: Request) {
  if (!isSquareConfigured()) {
    return new Response("Square not configured", { status: 503 });
  }

  const rawBody = await request.text();
  const signatureHeader =
    request.headers.get("x-square-hmacsha256-signature") ??
    request.headers.get("X-Square-HmacSha256-Signature") ??
    "";

  const verified = await verifyWebhookSignature({
    signatureHeader,
    body: rawBody,
    notificationUrl: NOTIFICATION_URL,
  });
  if (!verified) {
    console.warn("[square-webhook] signature mismatch");
    return new Response("Bad signature", { status: 400 });
  }

  let envelope: SquareWebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody) as SquareWebhookEnvelope;
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const eventType = envelope.type ?? "";

  if (!eventType.startsWith("subscription.")) {
    // Not a subscription event we currently reconcile — acknowledge
    // so Square doesn't retry. We can broaden later to invoices etc.
    return Response.json({ ok: true, ignored: eventType }, { status: 200 });
  }

  const subscriptionId =
    envelope.data?.object?.subscription?.id ?? envelope.data?.id ?? null;
  if (!subscriptionId) {
    return Response.json(
      { ok: true, ignored: "no subscription id in payload" },
      { status: 200 }
    );
  }

  try {
    const subscription = await getSubscription(subscriptionId);
    const admin = createSupabaseAdminClient();

    // ACTIVE / PENDING → paid tier on. Anything else → off.
    const isActive =
      subscription.status === "ACTIVE" || subscription.status === "PENDING";

    const update = await admin
      .from("profiles")
      .update({
        is_paid_tier: isActive,
        subscription_tier: isActive ? "paid" : "free",
      })
      .eq("square_subscription_id", subscriptionId);

    if (update.error) {
      console.error("[square-webhook] profile update failed:", update.error);
      return new Response("Update failed", { status: 500 });
    }

    return Response.json({ ok: true, status: subscription.status });
  } catch (err) {
    console.error("[square-webhook] reconcile failed:", err);
    return new Response("Reconcile failed", { status: 500 });
  }
}
