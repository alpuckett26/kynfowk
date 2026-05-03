/**
 * lib/square.ts
 *
 * Lightweight server-side wrapper around Square's REST API. Used by:
 *   - app/api/upgrade/square-subscribe/route.ts (creates Customer +
 *     Subscription when a user upgrades)
 *   - app/api/webhook/square/route.ts (verifies webhook signatures +
 *     reads subscription status on incoming events)
 *
 * Why fetch instead of Square's official Node SDK:
 *   - We only need a handful of endpoints; the SDK adds ~1 MB to
 *     the bundle and has historically had Next.js ESM/CJS interop
 *     issues.
 *   - Webhook signature verification only needs Web Crypto; pulling
 *     in the SDK just for that is overkill.
 *
 * Env vars (Vercel, server-side only — never expose to client):
 *   SQUARE_ACCESS_TOKEN          OAuth access token from Square Dashboard.
 *   SQUARE_LOCATION_ID           The location subscriptions are created at.
 *   SQUARE_PLAN_VARIATION_ID     Catalog plan variation for "Plus monthly".
 *   SQUARE_WEBHOOK_SIGNATURE_KEY Used by /api/webhook/square to verify.
 *   SQUARE_ENV                   "sandbox" or "production". Defaults sandbox.
 *
 * The matching `NEXT_PUBLIC_SQUARE_*` vars used by the client-side
 * <SquarePaymentForm> live separately so they're inlined into the
 * browser bundle.
 */

const SANDBOX_BASE = "https://connect.squareupsandbox.com";
const PRODUCTION_BASE = "https://connect.squareup.com";

export type SquareEnv = "sandbox" | "production";

export function getSquareEnv(): SquareEnv {
  return process.env.SQUARE_ENV === "production" ? "production" : "sandbox";
}

export function getSquareBaseUrl(): string {
  return getSquareEnv() === "production" ? PRODUCTION_BASE : SANDBOX_BASE;
}

export function isSquareConfigured(): boolean {
  return Boolean(
    process.env.SQUARE_ACCESS_TOKEN &&
      process.env.SQUARE_LOCATION_ID &&
      process.env.SQUARE_PLAN_VARIATION_ID
  );
}

interface SquareError extends Error {
  squareErrors?: Array<{ code: string; detail?: string; field?: string }>;
}

async function squareFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {}
): Promise<T> {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("SQUARE_ACCESS_TOKEN is not set.");
  }

  const url = `${getSquareBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Square-Version": "2024-12-18",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const err = new Error(
      body?.errors?.[0]?.detail ?? `Square API ${response.status} on ${path}`
    ) as SquareError;
    err.squareErrors = body?.errors;
    throw err;
  }

  return body as T;
}

interface SquareCustomer {
  id: string;
  email_address?: string;
  reference_id?: string;
}

/**
 * Create a Square Customer (or return the existing one keyed by our
 * Supabase user id via `reference_id`). Idempotent on retries.
 */
export async function getOrCreateSquareCustomer(args: {
  userId: string;
  email: string;
  givenName?: string | null;
}): Promise<SquareCustomer> {
  // First search by reference_id — if we've already created a customer
  // for this Kynfowk user, reuse it instead of creating duplicates.
  const search = await squareFetch<{ customers?: SquareCustomer[] }>(
    "/v2/customers/search",
    {
      method: "POST",
      body: JSON.stringify({
        query: {
          filter: { reference_id: { exact: args.userId } },
        },
        limit: 1,
      }),
    }
  );
  if (search.customers?.[0]) return search.customers[0];

  const created = await squareFetch<{ customer: SquareCustomer }>(
    "/v2/customers",
    {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: `kynfowk-customer-${args.userId}`,
        email_address: args.email,
        given_name: args.givenName ?? undefined,
        reference_id: args.userId,
      }),
    }
  );
  return created.customer;
}

/**
 * Attach a tokenized card (the `nonce` from the client-side Web
 * Payments SDK) to a customer. Returns the resulting Square Card id
 * which is what subscriptions bill against.
 */
export async function attachCardToCustomer(args: {
  customerId: string;
  cardNonce: string;
}): Promise<{ cardId: string }> {
  const result = await squareFetch<{ card: { id: string } }>("/v2/cards", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: `kynfowk-card-${args.customerId}-${Date.now()}`,
      source_id: args.cardNonce,
      card: {
        customer_id: args.customerId,
      },
    }),
  });
  return { cardId: result.card.id };
}

interface SquareSubscription {
  id: string;
  status: string; // ACTIVE, PAUSED, DEACTIVATED, CANCELED, PENDING
  customer_id: string;
  card_id: string;
  plan_variation_id: string;
  start_date?: string;
  charged_through_date?: string;
}

/**
 * Create a recurring subscription against the configured plan variation.
 * Returns the new subscription record from Square. Idempotent per
 * customer — re-running with the same customer / plan reuses the same
 * idempotency key for safety.
 */
export async function createSquareSubscription(args: {
  customerId: string;
  cardId: string;
}): Promise<SquareSubscription> {
  const planVariationId = process.env.SQUARE_PLAN_VARIATION_ID;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!planVariationId || !locationId) {
    throw new Error("SQUARE_PLAN_VARIATION_ID and SQUARE_LOCATION_ID must be set.");
  }

  const result = await squareFetch<{ subscription: SquareSubscription }>(
    "/v2/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: `kynfowk-sub-${args.customerId}-${planVariationId}`,
        location_id: locationId,
        plan_variation_id: planVariationId,
        customer_id: args.customerId,
        card_id: args.cardId,
      }),
    }
  );
  return result.subscription;
}

export async function getSubscription(
  subscriptionId: string
): Promise<SquareSubscription> {
  const result = await squareFetch<{ subscription: SquareSubscription }>(
    `/v2/subscriptions/${subscriptionId}`,
    { method: "GET" }
  );
  return result.subscription;
}

/**
 * Verify Square's webhook signature header. Square signs with HMAC-SHA1
 * (legacy) and HMAC-SHA256 (recommended). We verify the SHA-256 form.
 *
 * Returns true if signatureHeader matches the expected HMAC of
 * (notificationUrl + body) using SQUARE_WEBHOOK_SIGNATURE_KEY.
 */
export async function verifyWebhookSignature(args: {
  signatureHeader: string;
  body: string;
  notificationUrl: string;
}): Promise<boolean> {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key) return false;

  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    enc.encode(args.notificationUrl + args.body)
  );
  const expected = Buffer.from(sig).toString("base64");
  return safeEqual(args.signatureHeader, expected);
}

/** Constant-time string compare to dodge timing attacks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
