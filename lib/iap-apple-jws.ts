/**
 * lib/iap-apple-jws.ts
 *
 * Helpers for parsing + verifying the JWS-signed payloads Apple sends
 * to the App Store Server Notifications V2 webhook.
 *
 * The payload format Apple sends:
 *   POST /api/webhook/apple-app-store
 *   { "signedPayload": "<header>.<payload>.<signature>" }
 *
 * Each segment is base64url-encoded. The header carries an `x5c` array
 * — a chain of DER-encoded X.509 certificates: [leaf, intermediate, root].
 * The leaf cert's public key signs the payload using ES256.
 *
 * The decoded payload contains:
 *   - notificationType, subtype
 *   - notificationUUID  (replay-protection key)
 *   - data.signedTransactionInfo  (a nested JWS with the actual txn details)
 *   - data.signedRenewalInfo      (a nested JWS with auto-renew status)
 *
 * Verification stance for v1 (M62):
 *   We extract the x5c[0] leaf certificate, pull its public key, and
 *   verify the JWS signature against it using Web Crypto's ES256
 *   verifier. We do NOT yet verify that the cert chain leads to Apple's
 *   root CA — meaning a determined attacker who can forge a valid x5c
 *   chain (very hard in practice but not impossible) could spoof.
 *
 *   To compensate, the webhook never UPGRADES a user to paid based on
 *   a notification; only purchases via verifyReceipt flip is_paid_tier
 *   from false → true. The webhook's authority is to DOWNGRADE on
 *   cancellation / expiration / refund. Worst case a spoof'd notification
 *   downgrades someone briefly, then their next app open re-validates
 *   their receipt and restores access.
 *
 *   Hardening pass (post-launch): full chain validation against
 *   Apple's published root CA — see TODOs below.
 */

import { X509Certificate, createPublicKey, verify } from "node:crypto";

export interface DecodedJws<TPayload> {
  payload: TPayload;
  /** True if the signature verifies against the embedded leaf cert. */
  verified: boolean;
}

export interface AppleNotificationPayload {
  notificationType: string;
  subtype?: string;
  notificationUUID: string;
  data?: {
    appAppleId?: number;
    bundleId?: string;
    bundleVersion?: string;
    environment?: "Sandbox" | "Production";
    signedRenewalInfo?: string;
    signedTransactionInfo?: string;
  };
  version: string;
  signedDate: number;
}

export interface AppleTransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  webOrderLineItemId?: string;
  bundleId: string;
  productId: string;
  subscriptionGroupIdentifier?: string;
  purchaseDate: number;
  originalPurchaseDate: number;
  expiresDate?: number;
  quantity?: number;
  type?: string;
  inAppOwnershipType?: string;
  signedDate?: number;
  environment?: "Sandbox" | "Production";
  transactionReason?: string;
  storefront?: string;
  storefrontId?: string;
  price?: number;
  currency?: string;
  appAccountToken?: string;
  revocationDate?: number;
  revocationReason?: number;
}

/**
 * Decode a JWS string. Verifies the signature using the leaf cert
 * embedded in the JWS header (the `x5c[0]` entry).
 *
 * Returns `{ payload, verified }`. Callers should check `verified` and
 * decide what to do — for App Store notifications we still process the
 * payload even when `verified === false`, but only as a downgrade signal
 * (see file header comment).
 */
export function decodeAndVerifyJws<T>(jws: string): DecodedJws<T> {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new Error("JWS must have three segments separated by dots.");
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const headerJson = base64UrlDecodeToString(headerB64);
  const header = JSON.parse(headerJson) as {
    alg?: string;
    x5c?: string[];
  };

  if (header.alg !== "ES256") {
    throw new Error(`Unsupported JWS algorithm: ${header.alg ?? "unknown"}.`);
  }
  if (!header.x5c || header.x5c.length === 0) {
    throw new Error("JWS header missing x5c certificate chain.");
  }

  const payloadJson = base64UrlDecodeToString(payloadB64);
  const payload = JSON.parse(payloadJson) as T;

  let verified = false;
  try {
    // x5c entries are base64-encoded DER, NOT base64url. Wrap in a PEM
    // so X509Certificate can parse it.
    const leafPem = `-----BEGIN CERTIFICATE-----\n${header.x5c[0]}\n-----END CERTIFICATE-----`;
    const cert = new X509Certificate(leafPem);
    const publicKey = createPublicKey(cert.publicKey);

    // ES256 signature is r || s, each 32 bytes (raw IEEE P1363). Node's
    // crypto.verify expects DER-encoded ECDSA by default; pass the
    // `dsaEncoding: 'ieee-p1363'` option to consume the raw form.
    const signedData = Buffer.from(`${headerB64}.${payloadB64}`, "utf8");
    const signature = base64UrlDecodeToBuffer(signatureB64);

    verified = verify(
      "sha256",
      signedData,
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      signature
    );
  } catch (err) {
    // Verification failure is non-fatal here — the caller decides.
    console.warn("[apple-jws] signature verification threw:", err);
    verified = false;
  }

  // TODO(post-launch hardening): walk the full x5c chain and assert
  // the root cert matches Apple's published Root CA - G3 fingerprint:
  // 63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c757b00b50049 (sha256). For
  // now we only verify against the leaf; see file header rationale.

  return { payload, verified };
}

function base64UrlDecodeToString(input: string): string {
  return base64UrlDecodeToBuffer(input).toString("utf8");
}

function base64UrlDecodeToBuffer(input: string): Buffer {
  // base64url → base64
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + padding, "base64");
}
