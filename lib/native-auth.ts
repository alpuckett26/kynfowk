import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

/**
 * Build a Supabase client scoped to the bearer token sent by the native
 * app. The client respects RLS as that user — same security posture as
 * a logged-in web session, but stateless (no cookie).
 */
export function createNativeSupabaseClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Validate the bearer token on an incoming /api/native/* request and
 * return the authed user + a Supabase client scoped to them. Throws
 * NativeAuthError on missing/invalid token; route handlers should
 * convert that to a 401 JSON response.
 */
export async function authenticateNativeRequest(request: Request): Promise<{
  user: User;
  supabase: SupabaseClient;
  accessToken: string;
}> {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    throw new NativeAuthError("Missing Authorization bearer token", 401);
  }

  const supabase = createNativeSupabaseClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new NativeAuthError(error?.message ?? "Invalid token", 401);
  }

  return { user: data.user, supabase, accessToken: token };
}

export class NativeAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function nativeErrorResponse(error: unknown): Response {
  if (error instanceof NativeAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Server error";
  return Response.json({ error: message }, { status: 500 });
}
