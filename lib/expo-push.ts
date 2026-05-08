/**
 * Server-side Expo Push fan-out.
 *
 * Mobile clients (`mobile/lib/push.ts`) register their Expo push tokens
 * at /api/native/push/register, which stores them in `push_subscriptions`
 * with an "expo:" endpoint prefix. This helper looks those up by user_id
 * and dispatches a push through Expo's hosted service, which routes via
 * APNs (iOS) and FCM (Android).
 *
 * Used directly by ring fan-out where we need a synchronous push without
 * going through the queued notification_deliveries pipeline.
 */

type ExpoPushFanoutInput = {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string | undefined>;
};

type ExpoPushFanoutResult = {
  attempted: number;
  successes: number;
  failures: number;
  invalidated: number;
};

type AppSupabaseClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>
>;

const EXPO_PREFIX = "expo:";

export async function sendExpoPushToUsers(
  supabase: AppSupabaseClient,
  input: ExpoPushFanoutInput,
): Promise<ExpoPushFanoutResult> {
  const result: ExpoPushFanoutResult = {
    attempted: 0,
    successes: 0,
    failures: 0,
    invalidated: 0,
  };

  if (input.userIds.length === 0) return result;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint")
    .in("user_id", input.userIds);

  const expoSubs = (subs ?? []).filter((s) =>
    s.endpoint.startsWith(EXPO_PREFIX),
  );
  if (expoSubs.length === 0) return result;

  result.attempted = expoSubs.length;

  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const cleanData = input.data
    ? (Object.fromEntries(
        Object.entries(input.data).filter(([, v]) => v !== undefined),
      ) as Record<string, string>)
    : undefined;

  const invalidIds: string[] = [];
  const errorSamples: string[] = [];

  await Promise.all(
    expoSubs.map(async (sub) => {
      const token = sub.endpoint.slice(EXPO_PREFIX.length);
      const tokenSuffix = token.slice(-10);
      try {
        const resp = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers,
          body: JSON.stringify({
            to: token,
            title: input.title,
            body: input.body,
            sound: "default",
            priority: "high",
            data: cleanData,
          }),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          errorSamples.push(
            `[${tokenSuffix}] http ${resp.status}: ${text.slice(0, 200)}`,
          );
          result.failures += 1;
          return;
        }
        const payload = (await resp.json().catch(() => null)) as
          | {
              data?: {
                id?: string;
                status?: string;
                message?: string;
                details?: { error?: string };
              };
              errors?: Array<{ code?: string; message?: string }>;
            }
          | null;
        if (payload?.errors?.length) {
          errorSamples.push(
            `[${tokenSuffix}] expo errors: ${JSON.stringify(payload.errors).slice(0, 200)}`,
          );
          result.failures += 1;
          return;
        }
        const ticket = payload?.data;
        if (ticket?.status === "error") {
          errorSamples.push(
            `[${tokenSuffix}] ticket ${ticket.details?.error ?? "unknown"}: ${ticket.message ?? ""}`,
          );
          if (ticket.details?.error === "DeviceNotRegistered") {
            invalidIds.push(sub.id);
            result.invalidated += 1;
          } else {
            result.failures += 1;
          }
          return;
        }
        result.successes += 1;
      } catch (err) {
        errorSamples.push(
          `[${tokenSuffix}] threw: ${err instanceof Error ? err.message : String(err)}`,
        );
        result.failures += 1;
      }
    }),
  );

  if (invalidIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", invalidIds);
  }

  if (result.failures > 0 || result.invalidated > 0) {
    console.log(
      "[expo-push]",
      JSON.stringify({
        attempted: result.attempted,
        successes: result.successes,
        failures: result.failures,
        invalidated: result.invalidated,
        errorSamples,
      }),
    );
  }

  return result;
}
