/**
 * lib/iap-apple-verify.ts
 *
 * Server-side validation for Apple App Store In-App Purchase receipts.
 *
 * The mobile app (react-native-iap) hands us a base64-encoded receipt
 * after a successful purchase. We POST it to Apple's verifyReceipt
 * endpoint along with our shared secret (from App Store Connect →
 * App-Specific Shared Secret). Apple replies with a status code + the
 * decoded receipt contents.
 *
 * Apple's own docs flag verifyReceipt as deprecated in favor of the
 * App Store Server API (with JWT auth + the new App Store Server
 * Notifications V2). For this v1 we use verifyReceipt because:
 *   - It works for both StoreKit 1 and StoreKit 2 receipts.
 *   - It needs only one secret (the shared secret), no key rotation.
 *   - Apple confirmed it remains supported indefinitely for existing
 *     apps; the new API is "preferred" but not required.
 *
 * The classic prod-vs-sandbox routing trick: Apple recommends always
 * trying production first; if status 21007 comes back ("this receipt
 * is from the sandbox environment"), retry against sandbox. That way
 * a single code path handles TestFlight builds + real purchases.
 */

const PROD_URL = "https://buy.itunes.apple.com/verifyReceipt";
const SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

export interface ParsedReceipt {
  /** App Store transaction id for the most recent active subscription. */
  transactionId: string;
  /**
   * Stable id that doesn't change across renewals. We use this to
   * look the user up when an App Store Server Notification arrives.
   */
  originalTransactionId: string;
  /** Apple's product identifier (e.g. "kynfowk.plus.monthly"). */
  productId: string;
  /** Original purchase date — never changes for a renewing subscription. */
  originalPurchaseDateMs: number;
  /** Expiration date of the current period in ms. */
  expiresDateMs: number;
  /** True if the subscription is currently within its paid window. */
  isActive: boolean;
  /** Environment Apple verified against — "Production" or "Sandbox". */
  environment: "Production" | "Sandbox";
}

interface AppleVerifyResponse {
  status: number;
  environment?: string;
  latest_receipt_info?: Array<{
    transaction_id: string;
    original_transaction_id: string;
    product_id: string;
    original_purchase_date_ms: string;
    expires_date_ms: string;
    is_trial_period?: string;
  }>;
}

/**
 * Verify a base64 receipt against Apple. Returns the parsed receipt
 * for the latest active subscription, or null if the receipt is
 * invalid / expired / for a product we don't recognize.
 *
 * Throws only on network / configuration errors (no shared secret),
 * not on receipt validation failures — those return null.
 */
export async function verifyAppleReceipt(
  receiptData: string,
  expectedProductIds: string[]
): Promise<ParsedReceipt | null> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  if (!sharedSecret) {
    throw new Error(
      "APPLE_SHARED_SECRET is not set. Get it from App Store Connect → App-Specific Shared Secret."
    );
  }

  const body = JSON.stringify({
    "receipt-data": receiptData,
    password: sharedSecret,
    "exclude-old-transactions": true,
  });

  // Try production first; if Apple says it's a sandbox receipt, retry.
  let payload = await postReceipt(PROD_URL, body);
  if (payload.status === 21007) {
    payload = await postReceipt(SANDBOX_URL, body);
  }

  if (payload.status !== 0 || !payload.latest_receipt_info?.length) {
    return null;
  }

  // Find the most recent transaction for one of our expected products.
  // Apple sorts ascending by date, so iterate in reverse.
  const sorted = payload.latest_receipt_info
    .slice()
    .sort((a, b) => Number(b.expires_date_ms) - Number(a.expires_date_ms));
  const match = sorted.find((entry) =>
    expectedProductIds.includes(entry.product_id)
  );
  if (!match) return null;

  const expiresDateMs = Number(match.expires_date_ms);
  const isActive = expiresDateMs > Date.now();

  return {
    transactionId: match.transaction_id,
    originalTransactionId: match.original_transaction_id,
    productId: match.product_id,
    originalPurchaseDateMs: Number(match.original_purchase_date_ms),
    expiresDateMs,
    isActive,
    environment: payload.environment === "Sandbox" ? "Sandbox" : "Production",
  };
}

async function postReceipt(url: string, body: string): Promise<AppleVerifyResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!response.ok) {
    throw new Error(
      `Apple verifyReceipt returned HTTP ${response.status}.`
    );
  }
  return (await response.json()) as AppleVerifyResponse;
}
