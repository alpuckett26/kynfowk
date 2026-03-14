import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackProductEvent } from "@/lib/product-insights";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  const requestUrl = new URL(request.url);
  const { callId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/sign-in", requestUrl.origin));
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
    .select("id, family_circle_id, meeting_url, status, actual_started_at")
    .eq("id", callId)
    .maybeSingle();

  if (
    !membershipResponse.data ||
    !callResponse.data ||
    membershipResponse.data.family_circle_id !== callResponse.data.family_circle_id
  ) {
    return NextResponse.redirect(new URL("/dashboard?status=schedule-forbidden", requestUrl.origin));
  }

  if (!callResponse.data.meeting_url) {
    return NextResponse.redirect(new URL("/dashboard?status=join-link-missing", requestUrl.origin));
  }

  if (callResponse.data.status === "scheduled" && !callResponse.data.actual_started_at) {
    await supabase
      .from("call_sessions")
      .update({
        actual_started_at: new Date().toISOString()
      })
      .eq("id", callId)
      .eq("family_circle_id", callResponse.data.family_circle_id)
      .is("actual_started_at", null);
  }

  await trackProductEvent(supabase, {
    eventName: "join_clicked",
    userId: user.id,
    familyCircleId: callResponse.data.family_circle_id,
    callSessionId: callId
  });

  return NextResponse.redirect(callResponse.data.meeting_url);
}
