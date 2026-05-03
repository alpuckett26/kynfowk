/**
 * POST /api/webhook/apple-app-store
 *
 * Receives App Store Server Notifications V2 from Apple. Configured at:
 *   App Store Connect → Kynfowk → App Information →
 *     "App Store Server Notifications" → V2 endpoint URL.
 *
 * Apple POSTs `{ "signedPayload": "<JWS>" }` to this route on:
 *   - SUBSCRIBED            (initial subscription / resubscribe)
 *   - DID_RENEW             (auto-renewal succeeded)
 *   - DID_CHANGE_RENEWAL_STATUS  (user toggled auto-renew)
 *   - DID_FAIL_TO_RENEW     (billing failure, may be in grace period)
 *   - EXPIRED               (subscription has fully lapsed)
 *   - GRACE_PERIOD_EXPIRED  (Apple's grace period ran out)
 *   - REFUND                (Apple refunded the user)
 *   - REVOKE                (Family Sharing revoked entitlement)
 *
 * Reconciliation rule (v1 stance — see lib/iap-apple-jws.ts header):
 *   The webhook only DOWNGRADES (is_paid_tier=false) on terminal events.
 *   Upgrades come from /api/native/iap/apple-receipt verifying a real
 *   receipt on a real device. This means even if a notification is
 *   spoofed, an attacker can only briefly mark someone as free —
 *   their next app open restores access via verifyReceipt.
 *
 * We dedupe on `notificationUUID` so Apple's automatic retries don't
 * trigger multiple downgrades. Currently held in-memory only; for v2
 * we'd add a `processed_apple_notifications` table.
 */

import { createClient } from "@supabase/supabase-js";

import {
  type AppleNotificationPayload,
  type AppleTransactionInfo,
  decodeAndVerifyJws,
} from "@/lib/iap-apple-jws";

interface WebhookBody {
  signedPayload?: string;
}

const TERMINAL_TYPES = new Set([
  "EXPIRED",
  "GRACE_PERIOD_EXPIRED",
  "REFUND",
  "REVOKE",
]);

const RENEWED_TYPES = new Set([
  "DID_RENEW",
  "SUBSCRIBED",
]);

// Tiny in-memory dedupe cache. Apple retries the same notificationUUID
// for up to 3 days if we 5xx; the cache prevents double-handling within
// a single instance lifetime. Cross-instance dedupe is not strictly
// necessary because our handlers are idempotent (same is_paid_tier
// state on duplicate invoke) — but reduces noise.
const seenUuids = new Set<string>();

export async function POST(request: Request) {
  let body: WebhookBody;
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.signedPayload) {
    return Response.json({ error: "Missing signedPayload." }, { status: 400 });
  }

  // Decode the outer notification envelope.
  let outer;
  try {
    outer = decodeAndVerifyJws<AppleNotificationPayload>(body.signedPayload);
  } catch (err) {
    console.warn("[apple-webhook] malformed signedPayload:", err);
    return Response.json({ error: "Malformed signedPayload." }, { status: 400 });
  }

  const { payload, verified } = outer;
  const notificationType = payload.notificationType;
  const uuid = payload.notificationUUID;
  if (!uuid) {
    console.warn("[apple-webhook] missing notificationUUID; dropping.");
    return Response.json({ ok: true, deduped: false }, { status: 200 });
  }
  if (seenUuids.has(uuid)) {
    return Response.json({ ok: true, deduped: true }, { status: 200 });
  }
  seenUuids.add(uuid);

  if (!verified) {
    console.warn(
      "[apple-webhook] signature did not verify against leaf cert — proceeding only as downgrade signal."
    );
  }

  // Decode the inner signedTransactionInfo to get the originalTransactionId.
  const signedTxn = payload.data?.signedTransactionInfo;
  if (!signedTxn) {
    return Response.json(
      { ok: true, note: "no transaction info on this notification" },
      { status: 200 }
    );
  }

  let txnInfo: AppleTransactionInfo;
  try {
    txnInfo = decodeAndVerifyJws<AppleTransactionInfo>(signedTxn).payload;
  } catch (err) {
    console.warn("[apple-webhook] malformed signedTransactionInfo:", err);
    return Response.json(
      { error: "Malformed signedTransactionInfo." },
      { status: 400 }
    );
  }

  const originalTransactionId = txnInfo.originalTransactionId;
  if (!originalTransactionId) {
    return Response.json(
      { ok: true, note: "no originalTransactionId on transaction" },
      { status: 200 }
    );
  }

  // Service-role client — webhook auth is via JWS signature, not a
  // user session, so we need to bypass RLS to update the right profile.
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const profileResp = await serviceClient
    .from("profiles")
    .select("id, is_paid_tier")
    .eq("apple_original_transaction_id", originalTransactionId)
    .maybeSingle();

  if (profileResp.error) {
    console.error("[apple-webhook] profile lookup failed:", profileResp.error);
    return Response.json({ error: "Lookup failed." }, { status: 500 });
  }

  const profile = profileResp.data;
  if (!profile) {
    // Notification arrived for a transaction we don't recognize. Could
    // be: a refund event for a TestFlight receipt that was never tied
    // to a profile, a sandbox notification arriving at our prod URL,
    // or a Family Sharing recipient we never ingested. Acknowledge
    // (Apple wants 200 to stop retrying) but do nothing.
    return Response.json({ ok: true, note: "no profile match" }, { status: 200 });
  }

  // Store the latest expires-at + environment regardless of action.
  const expiresAtIso = txnInfo.expiresDate
    ? new Date(txnInfo.expiresDate).toISOString()
    : null;
  const updates: Record<string, unknown> = {
    apple_expires_at: expiresAtIso,
  };
  if (txnInfo.environment) {
    updates.apple_environment = txnInfo.environment;
  }

  if (TERMINAL_TYPES.has(notificationType)) {
    updates.is_paid_tier = false;
    updates.subscription_tier = "free";
  } else if (RENEWED_TYPES.has(notificationType) && verified) {
    // Verified renewal — safe to flip back on if a previous downgrade
    // demoted them. Only do this when JWS signature verified against
    // the leaf cert, since this is the one path that can upgrade.
    updates.is_paid_tier = true;
    updates.subscription_tier = "paid";
  }
  // DID_CHANGE_RENEWAL_STATUS and DID_FAIL_TO_RENEW: no immediate flip
  // — DID_FAIL_TO_RENEW gets a grace period; we wait for
  // GRACE_PERIOD_EXPIRED to actually downgrade.

  const update = await serviceClient
    .from("profiles")
    .update(updates)
    .eq("id", profile.id);

  if (update.error) {
    console.error("[apple-webhook] profile update failed:", update.error);
    return Response.json({ error: "Update failed." }, { status: 500 });
  }

  return Response.json(
    {
      ok: true,
      notificationType,
      profileId: profile.id,
      verified,
      action: TERMINAL_TYPES.has(notificationType)
        ? "downgraded"
        : RENEWED_TYPES.has(notificationType) && verified
          ? "upgraded"
          : "noop",
    },
    { status: 200 }
  );
}
