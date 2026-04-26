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
        { error: "Only active family members can decline calls." },
        { status: 403 }
      );
    }

    // Confirm the call is auto-scheduled and in the viewer's circle.
    const callResponse = await supabase
      .from("call_sessions")
      .select("id, family_circle_id, auto_scheduled, status")
      .eq("id", callId)
      .maybeSingle();
    const call = callResponse.data as
      | {
          id: string;
          family_circle_id: string;
          auto_scheduled: boolean;
          status: string;
        }
      | null;
    if (!call || call.family_circle_id !== family.circle.id) {
      return Response.json({ error: "Call not found." }, { status: 404 });
    }
    if (!call.auto_scheduled) {
      return Response.json(
        { error: "Use cancel for non-auto-scheduled calls." },
        { status: 400 }
      );
    }
    if (!["scheduled", "live"].includes(call.status)) {
      return Response.json(
        { error: "Call has already finished or been canceled." },
        { status: 400 }
      );
    }

    const updateResponse = await supabase
      .from("call_sessions")
      .update({ status: "canceled", reminder_status: "not_needed" })
      .eq("id", callId);
    if (updateResponse.error) {
      return Response.json(
        { error: updateResponse.error.message },
        { status: 400 }
      );
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "call_auto_declined",
      summary: `${family.membership.display_name} declined an auto-scheduled call.`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
