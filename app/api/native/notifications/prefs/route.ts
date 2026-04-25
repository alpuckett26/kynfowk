import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

type Body = {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  weeklyDigestEnabled?: boolean;
  reminder24hEnabled?: boolean;
  reminder15mEnabled?: boolean;
  startingNowEnabled?: boolean;
  pushEnabled?: boolean;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
  timezone?: string;
};

function parseQuietHour(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < 0 || value > 23) return null;
  return value;
}

function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const timezone =
      typeof body.timezone === "string" && isValidTimezone(body.timezone)
        ? body.timezone
        : "America/Chicago";

    const upsert = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        in_app_enabled: !!body.inAppEnabled,
        email_enabled: !!body.emailEnabled,
        weekly_digest_enabled: !!body.weeklyDigestEnabled,
        reminder_24h_enabled: !!body.reminder24hEnabled,
        reminder_15m_enabled: !!body.reminder15mEnabled,
        starting_now_enabled: !!body.startingNowEnabled,
        push_enabled: !!body.pushEnabled,
        quiet_hours_start: parseQuietHour(body.quietHoursStart),
        quiet_hours_end: parseQuietHour(body.quietHoursEnd),
        timezone,
      },
      { onConflict: "user_id" }
    );
    if (upsert.error) {
      return Response.json({ error: upsert.error.message }, { status: 400 });
    }

    await supabase.from("profiles").update({ timezone }).eq("id", user.id);

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
