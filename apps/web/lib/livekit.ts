import { AccessToken } from "livekit-server-sdk";

/**
 * LiveKit Cloud / self-hosted env config.
 * Three env vars needed (set in Vercel / .env.local):
 *   NEXT_PUBLIC_LIVEKIT_URL  — wss://<your-project>.livekit.cloud (public)
 *   LIVEKIT_API_KEY          — server-side only
 *   LIVEKIT_API_SECRET       — server-side only
 *
 * When any are missing, isLiveKitConfigured() returns false and the
 * /call route falls back to a placeholder.
 */
export function getLiveKitConfig() {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

export function isLiveKitConfigured(): boolean {
  return getLiveKitConfig() !== null;
}

/**
 * Issue a LiveKit access token for the given identity to join the given
 * room. Identity should be unique per user (we use the supabase user id).
 * Returns the JWT string. Throws if LiveKit isn't configured.
 */
export async function issueLiveKitToken({
  identity,
  name,
  roomName,
  ttlSeconds = 60 * 60 * 4, // 4 hours
}: {
  identity: string;
  name?: string;
  roomName: string;
  ttlSeconds?: number;
}): Promise<string> {
  const cfg = getLiveKitConfig();
  if (!cfg) {
    throw new Error(
      "LiveKit not configured — set NEXT_PUBLIC_LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET."
    );
  }

  const token = new AccessToken(cfg.apiKey, cfg.apiSecret, {
    identity,
    name,
    ttl: ttlSeconds,
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return await token.toJwt();
}
