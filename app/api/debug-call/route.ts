import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// TEMPORARY debug endpoint for E2E test diagnostics only.
// Returns raw Supabase query results so we can understand what the server sees.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callId = searchParams.get("callId");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!callId) {
    return NextResponse.json({ error: "callId required" }, { status: 400 });
  }

  const [membershipRes, circleRes, callRes, callFullRes] = await Promise.all([
    supabase
      .from("family_memberships")
      .select("id, family_circle_id, status, role, created_at")
      .eq("user_id", user?.id ?? "")
      .order("created_at", { ascending: true }),
    supabase
      .from("family_circles")
      .select("id, name")
      .limit(5),
    supabase
      .from("call_sessions")
      .select("id, family_circle_id, status, created_by")
      .eq("id", callId)
      .maybeSingle(),
    // Same select as getCallDetailData
    supabase
      .from("call_sessions")
      .select("id, title, scheduled_start, scheduled_end, status, actual_duration_minutes, meeting_provider, meeting_url, actual_started_at, actual_ended_at, recovery_dismissed_at, reminder_status, reminder_sent_at, family_circle_id")
      .eq("id", callId)
      .maybeSingle()
  ]);

  return NextResponse.json({
    userId: user?.id,
    memberships: membershipRes.data,
    membershipError: membershipRes.error,
    circles: circleRes.data,
    circleError: circleRes.error,
    call: callRes.data,
    callError: callRes.error,
    callFull: callFullRes.data,
    callFullError: callFullRes.error
  });
}
