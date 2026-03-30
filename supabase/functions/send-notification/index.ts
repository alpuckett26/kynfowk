/**
 * send-notification — Supabase Edge Function
 *
 * Sends native push notifications to one or more users via:
 *   - APNs HTTP/2 (iOS)  — token-based auth (ES256 JWT, .p8 key)
 *   - FCM HTTP v1 (Android) — OAuth2 service-account JWT (RS256)
 *
 * Request body:
 *   {
 *     user_ids:  string[];        // required — who to notify
 *     title:     string;          // notification title
 *     body:      string;          // notification body
 *     data?:     Record<string, string>;  // optional extra data (deepLink, type, etc.)
 *   }
 *
 * Required secrets (set with `supabase secrets set …`):
 *   APNS_KEY_ID          — 10-char key ID from Apple Developer portal
 *   APNS_TEAM_ID         — 10-char team ID
 *   APNS_PRIVATE_KEY     — contents of the .p8 file (including -----BEGIN/END PRIVATE KEY-----)
 *   APNS_BUNDLE_ID       — com.kynfowk.app
 *   APNS_ENVIRONMENT     — "sandbox" | "production"
 *   FCM_PROJECT_ID       — Firebase project ID
 *   FCM_SERVICE_ACCOUNT_KEY — full JSON string of the Firebase service account key file
 *   FUNCTIONS_SECRET     — shared secret; callers must send  Authorization: Bearer <secret>
 *   SUPABASE_URL         — injected automatically by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — injected automatically by Supabase
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RequestBody {
  user_ids: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: "ios" | "android" | "web";
}

type SendResult = "ok" | "invalid" | "error";

// ── Helpers: base64url ────────────────────────────────────────────────────────

function base64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlEncode(str: string): string {
  return base64url(new TextEncoder().encode(str));
}

// ── APNs JWT (ES256) ──────────────────────────────────────────────────────────

let apnsTokenCache: { token: string; expiresAt: number } | null = null;

async function makeApnsJwt(): Promise<string> {
  // APNs tokens are valid for up to 1 hour; cache with 50-min window
  const now = Math.floor(Date.now() / 1000);
  if (apnsTokenCache && apnsTokenCache.expiresAt > now) {
    return apnsTokenCache.token;
  }

  const keyId = Deno.env.get("APNS_KEY_ID")!;
  const teamId = Deno.env.get("APNS_TEAM_ID")!;
  const pemRaw = Deno.env.get("APNS_PRIVATE_KEY")!;

  // Strip PEM headers and decode to DER
  const pem = pemRaw.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = base64urlEncode(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = base64urlEncode(JSON.stringify({ iss: teamId, iat: now }));
  const signingInput = `${header}.${payload}`;

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  );

  const token = `${signingInput}.${base64url(sig)}`;
  apnsTokenCache = { token, expiresAt: now + 50 * 60 };
  return token;
}

// ── FCM OAuth2 access token (RS256 service-account JWT) ───────────────────────

let fcmTokenCache: { token: string; expiresAt: number } | null = null;

async function getFcmAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (fcmTokenCache && fcmTokenCache.expiresAt > now) {
    return fcmTokenCache.token;
  }

  const saJson = Deno.env.get("FCM_SERVICE_ACCOUNT_KEY")!;
  const sa = JSON.parse(saJson) as {
    client_email: string;
    private_key: string;
    token_uri: string;
  };

  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const iat = now;
  const exp = now + 3600;
  const header = base64urlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64urlEncode(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: sa.token_uri,
      iat,
      exp,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    })
  );

  const signingInput = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(signingInput)
  );

  const assertion = `${signingInput}.${base64url(sig)}`;

  const resp = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!resp.ok) {
    throw new Error(`FCM token exchange failed: ${resp.status} ${await resp.text()}`);
  }

  const json = (await resp.json()) as { access_token: string; expires_in: number };
  fcmTokenCache = { token: json.access_token, expiresAt: now + json.expires_in - 60 };
  return json.access_token;
}

// ── Send via APNs ─────────────────────────────────────────────────────────────

async function sendApns(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<SendResult> {
  const bundleId = Deno.env.get("APNS_BUNDLE_ID")!;
  const env = Deno.env.get("APNS_ENVIRONMENT") ?? "production";
  const host =
    env === "sandbox"
      ? "api.sandbox.push.apple.com"
      : "api.push.apple.com";

  const jwt = await makeApnsJwt();

  const payload = JSON.stringify({
    aps: {
      alert: { title, body },
      sound: "default",
      badge: 1,
    },
    ...data,
  });

  const resp = await fetch(`https://${host}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-push-type": "alert",
      "apns-topic": bundleId,
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: payload,
  });

  if (resp.status === 200) return "ok";

  const errBody = await resp.json().catch(() => ({})) as { reason?: string };
  const reason = errBody.reason ?? "";

  // Apple's "unregistered" or "bad device token" signals the token is stale
  if (
    resp.status === 410 ||
    reason === "Unregistered" ||
    reason === "BadDeviceToken"
  ) {
    return "invalid";
  }

  console.error(`[apns] ${resp.status} ${reason} for token ${deviceToken.slice(0, 8)}…`);
  return "error";
}

// ── Send via FCM HTTP v1 ───────────────────────────────────────────────────────

async function sendFcm(
  registrationToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<SendResult> {
  const projectId = Deno.env.get("FCM_PROJECT_ID")!;
  const accessToken = await getFcmAccessToken();

  const message = {
    message: {
      token: registrationToken,
      notification: { title, body },
      android: {
        notification: { sound: "default", default_vibrate_timings: true },
      },
      data,
    },
  };

  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  if (resp.status === 200) return "ok";

  const errBody = await resp.json().catch(() => ({})) as {
    error?: { status?: string; message?: string };
  };
  const status = errBody.error?.status ?? "";

  if (
    status === "UNREGISTERED" ||
    status === "INVALID_ARGUMENT"
  ) {
    return "invalid";
  }

  console.error(
    `[fcm] ${resp.status} ${status} ${errBody.error?.message ?? ""} for token ${registrationToken.slice(0, 8)}…`
  );
  return "error";
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Auth check
  const secret = Deno.env.get("FUNCTIONS_SECRET");
  const authHeader = req.headers.get("authorization") ?? "";
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  let reqBody: RequestBody;
  try {
    reqBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { user_ids, title, body, data = {} } = reqBody;

  if (!user_ids?.length || !title || !body) {
    return new Response(
      JSON.stringify({ error: "user_ids, title, and body are required" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  // Service-role client bypasses RLS so we can read any user's tokens
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Stale cutoff: ignore tokens not seen in 90 days
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - 90);

  const { data: rows, error: dbErr } = await supabase
    .from("device_tokens")
    .select("id, user_id, token, platform")
    .in("user_id", user_ids)
    .eq("notifications_enabled", true)
    .gte("last_seen_at", staleCutoff.toISOString())
    .in("platform", ["ios", "android"]);

  if (dbErr) {
    console.error("[send-notification] DB error:", dbErr.message);
    return new Response(JSON.stringify({ error: dbErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const tokens = (rows ?? []) as DeviceToken[];

  // Deduplicate by token value (same device, multiple rows shouldn't happen
  // thanks to the unique index, but be safe)
  const seen = new Set<string>();
  const unique = tokens.filter((t) => {
    if (seen.has(t.token)) return false;
    seen.add(t.token);
    return true;
  });

  const attempted = unique.length;
  let successes = 0;
  let failures = 0;
  const invalidIds: string[] = [];

  // Send in parallel — cap concurrency to avoid overwhelming APNs/FCM
  const CHUNK = 25;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map((t) => {
        if (t.platform === "ios") return sendApns(t.token, title, body, data);
        if (t.platform === "android") return sendFcm(t.token, title, body, data);
        return Promise.resolve<SendResult>("error");
      })
    );

    for (let j = 0; j < chunk.length; j++) {
      const result = results[j];
      if (result === "ok") {
        successes++;
      } else if (result === "invalid") {
        invalidIds.push(chunk[j].id);
        failures++;
      } else {
        failures++;
      }
    }
  }

  // Disable stale/invalid tokens so we don't attempt them again
  if (invalidIds.length > 0) {
    const { error: disableErr } = await supabase
      .from("device_tokens")
      .update({ notifications_enabled: false, updated_at: new Date().toISOString() })
      .in("id", invalidIds);

    if (disableErr) {
      console.error("[send-notification] Failed to disable invalid tokens:", disableErr.message);
    }
  }

  const responseBody = {
    attempted,
    successes,
    failures,
    invalidated: invalidIds.length,
  };

  console.log("[send-notification]", JSON.stringify(responseBody));

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
