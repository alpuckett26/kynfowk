import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

export async function POST(
  request: Request,
  context: { params: Promise<{ callId: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { callId } = await context.params;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Only active family members can mark reminders." },
        { status: 403 }
      );
    }

    const updateResponse = await supabase
      .from("call_sessions")
      .update({
        reminder_status: "sent",
        reminder_sent_at: new Date().toISOString(),
      })
      .eq("id", callId)
      .eq("family_circle_id", family.circle.id)
      .in("status", ["scheduled", "live"]);
    if (updateResponse.error) {
      return Response.json(
        { error: updateResponse.error.message },
        { status: 400 }
      );
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "call_reminder_marked",
      summary:
        "A family call reminder was marked as sent so everyone has a gentle nudge.",
    });

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
