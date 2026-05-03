/**
 * POST /api/native/iap/apple-receipt
 *
 * Endpoint the mobile app calls after a successful Apple In-App
 * Purchase. Body: { receiptData: string (base64), productId: string }.
 *
 * Flow:
 *   1. Authenticate the bearer token (existing native-auth helper).
 *   2. Validate the receipt against Apple's verifyReceipt (handles
 *      prod / sandbox routing automatically).
 *   3. If valid + matches one of our known product IDs + currently
 *      active → flip profiles.is_paid_tier = true and store the
 *      latest transaction id + expires-at for the eventual webhook
 *      reconciliation.
 *
 * Renewal / cancellation / refund reconciliation lives in
 * /api/webhook/apple-app-store (M62 — App Store Server Notifications
 * V2). This route stores `apple_original_transaction_id` so that
 * webhook can find the profile when Apple notifies us.
 *
 * Out of scope here (separate PRs):
 *   - Cross-device entitlement transfer (Family Sharing).
 */

import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { verifyAppleReceipt } from "@/lib/iap-apple-verify";

const KNOWN_PRODUCT_IDS = [
  "kynfowk.plus.monthly",
  "kynfowk.plus.yearly",
];

interface Body {
  receiptData?: string;
  productId?: string;
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const receiptData = body.receiptData;
    if (!receiptData || typeof receiptData !== "string") {
      return Response.json(
        { error: "receiptData (base64) required." },
        { status: 400 }
      );
    }

    let parsed;
    try {
      parsed = await verifyAppleReceipt(receiptData, KNOWN_PRODUCT_IDS);
    } catch (err) {
      console.error("[iap/apple-receipt] verify error:", err);
      return Response.json(
        { error: "Couldn't reach the App Store to verify your purchase. Try again in a moment." },
        { status: 502 }
      );
    }

    if (!parsed) {
      return Response.json(
        { error: "Receipt isn't valid for any current Kynfowk subscription." },
        { status: 400 }
      );
    }

    if (!parsed.isActive) {
      // Receipt parsed but the subscription has lapsed — make sure
      // we mirror that state on the profile too. Still record the
      // original transaction id so a later App Store Server
      // Notification (e.g. a re-subscribe) can find this profile.
      await supabase
        .from("profiles")
        .update({
          is_paid_tier: false,
          subscription_tier: "free",
          apple_original_transaction_id: parsed.originalTransactionId,
          apple_expires_at: new Date(parsed.expiresDateMs).toISOString(),
          apple_environment: parsed.environment,
        })
        .eq("id", user.id);
      return Response.json(
        {
          ok: true,
          status: "expired",
          expiresAt: new Date(parsed.expiresDateMs).toISOString(),
        },
        { status: 200 }
      );
    }

    // Active subscription — flip the bit. Tier stays "paid" regardless
    // of which product (monthly vs yearly) for now; we can split later
    // if pricing tiers diverge. Capture the original transaction id +
    // expiry so the M62 webhook can later reconcile renewals/cancels
    // against this profile.
    const update = await supabase
      .from("profiles")
      .update({
        is_paid_tier: true,
        subscription_tier: "paid",
        apple_original_transaction_id: parsed.originalTransactionId,
        apple_expires_at: new Date(parsed.expiresDateMs).toISOString(),
        apple_environment: parsed.environment,
      })
      .eq("id", user.id);

    if (update.error) {
      console.error("[iap/apple-receipt] profile update failed:", update.error);
      return Response.json(
        { error: "Verified the purchase but couldn't update your account. Contact support." },
        { status: 500 }
      );
    }

    return Response.json(
      {
        ok: true,
        status: "active",
        productId: parsed.productId,
        environment: parsed.environment,
        expiresAt: new Date(parsed.expiresDateMs).toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    return nativeErrorResponse(err);
  }
}
