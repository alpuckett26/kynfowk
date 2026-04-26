import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, timezone")
      .eq("id", user.id)
      .maybeSingle();

    return Response.json({
      profile: {
        id: user.id,
        email: data?.email ?? user.email ?? null,
        fullName: data?.full_name ?? null,
        timezone: data?.timezone ?? "America/Chicago",
      },
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}

type Body = { fullName?: string; timezone?: string };

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const fullName = (body.fullName ?? "").trim();
    const timezone =
      typeof body.timezone === "string" && isValidTimezone(body.timezone)
        ? body.timezone
        : "America/Chicago";

    if (!fullName) {
      return Response.json({ error: "Name is required." }, { status: 400 });
    }

    const upsert = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      timezone,
    });
    if (upsert.error) {
      return Response.json({ error: upsert.error.message }, { status: 400 });
    }

    // Keep the user's display_name on their owner membership in sync.
    await supabase
      .from("family_memberships")
      .update({ display_name: fullName })
      .eq("user_id", user.id);

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
