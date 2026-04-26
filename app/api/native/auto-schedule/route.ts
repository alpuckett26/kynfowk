import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

type Body = {
  enabled?: boolean;
  pausedUntil?: string | null;
  maxPerWeek?: number;
};

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);

    const [profileResponse, tiersResponse] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "auto_schedule_enabled, auto_schedule_paused_until, auto_schedule_max_per_week"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("connection_tiers")
        .select("id, name, min_days_between, ordinal")
        .order("ordinal", { ascending: true }),
    ]);

    return Response.json({
      enabled:
        (profileResponse.data as { auto_schedule_enabled?: boolean } | null)
          ?.auto_schedule_enabled ?? true,
      pausedUntil:
        (profileResponse.data as
          | { auto_schedule_paused_until?: string | null }
          | null)?.auto_schedule_paused_until ?? null,
      maxPerWeek:
        (profileResponse.data as { auto_schedule_max_per_week?: number } | null)
          ?.auto_schedule_max_per_week ?? 7,
      tiers: tiersResponse.data ?? [],
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const update: Record<string, unknown> = {};
    if (typeof body.enabled === "boolean") {
      update.auto_schedule_enabled = body.enabled;
    }
    if (body.pausedUntil !== undefined) {
      update.auto_schedule_paused_until = body.pausedUntil;
    }
    if (typeof body.maxPerWeek === "number") {
      const n = Math.max(3, Math.min(14, Math.floor(body.maxPerWeek)));
      update.auto_schedule_max_per_week = n;
    }

    if (Object.keys(update).length === 0) {
      return Response.json({ error: "Nothing to update." }, { status: 400 });
    }

    const updateResponse = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id);
    if (updateResponse.error) {
      return Response.json(
        { error: updateResponse.error.message },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
