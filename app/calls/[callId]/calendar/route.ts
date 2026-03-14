import { buildCallCalendarFile } from "@/lib/calendar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  const { callId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const membershipResponse = await supabase
    .from("family_memberships")
    .select("family_circle_id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const callResponse = await supabase
    .from("call_sessions")
    .select("id, title, scheduled_start, scheduled_end, meeting_url, family_circle_id, family_circles(name)")
    .eq("id", callId)
    .maybeSingle();

  if (
    !membershipResponse.data ||
    !callResponse.data ||
    membershipResponse.data.family_circle_id !== callResponse.data.family_circle_id
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const familyCircleRecord = callResponse.data.family_circles as
    | { name: string }[]
    | { name: string }
    | null;
  const circleName = Array.isArray(familyCircleRecord)
    ? familyCircleRecord[0]?.name ?? "your Family Circle"
    : familyCircleRecord?.name ?? "your Family Circle";

  const calendarFile = buildCallCalendarFile({
    id: callResponse.data.id,
    title: callResponse.data.title,
    scheduledStart: callResponse.data.scheduled_start,
    scheduledEnd: callResponse.data.scheduled_end,
    meetingUrl: callResponse.data.meeting_url,
    circleName
  });

  return new Response(calendarFile.body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${calendarFile.filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
