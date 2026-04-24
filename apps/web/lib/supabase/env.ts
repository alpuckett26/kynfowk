/**
 * Resolves the Supabase env vars and throws a clear error if missing.
 * Both server and client supabase factories use this so a missing var
 * fails loudly at the call site instead of crashing inside the SDK.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing required Supabase env vars: " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must both be set."
    );
  }
  return { url, anonKey };
}
