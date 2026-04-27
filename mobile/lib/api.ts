import { supabase } from "@/lib/supabase";

// Use || not ?? — CI passes EXPO_PUBLIC_WEB_API_BASE_URL="" when the
// secret is unset, and ?? would let an empty string through, leaving
// fetch with a relative URL like "/api/native/dashboard" → "Invalid URL".
const ENV_BASE_URL = process.env.EXPO_PUBLIC_WEB_API_BASE_URL;
const BASE_URL =
  ENV_BASE_URL && ENV_BASE_URL.length > 0
    ? ENV_BASE_URL
    : "https://kynfowk.com";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * Authenticated request to /api/native/* on the web app. Forwards the
 * Supabase access token as a Bearer header so the route can recreate
 * the user's RLS context server-side.
 */
export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new ApiError("Not signed in", 401, null);
  }

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  // Belt-and-suspenders client timeout so the UI never hangs forever
  // on a slow server (e.g. Supabase Auth invite-email hang).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const signal = opts.signal ?? controller.signal;

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Request timed out", 0, null);
    }
    throw error;
  }
  clearTimeout(timeout);

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}
