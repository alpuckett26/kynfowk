import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { dismissCallNotifications } from "@/lib/notifications";

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
        { error: "Only active family members can dismiss recovery prompts." },
        { status: 403 }
      );
    }

    const callResponse = await supabase
      .from("call_sessions")
      .select("id, title, status, family_circle_id, scheduled_end")
      .eq("id", callId)
      .maybeSingle();
    if (
      !callResponse.data ||
      callResponse.data.family_circle_id !== family.circle.id
    ) {
      return Response.json({ error: "Call not found" }, { status: 404 });
    }
    if (
      callResponse.data.status === "completed" ||
      callResponse.data.status === "canceled"
    ) {
      return Response.json({ success: true });
    }

    const update = await supabase
      .from("call_sessions")
      .update({ recovery_dismissed_at: new Date().toISOString() })
      .eq("id", callId)
      .eq("family_circle_id", family.circle.id)
      .in("status", ["scheduled", "live"]);
    if (update.error) {
      return Response.json({ error: update.error.message }, { status: 400 });
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "call_recovery_dismissed",
      summary: `${callResponse.data.title} was cleared from the missed-call list.`,
    });

    await dismissCallNotifications(supabase, callId, [
      "call_passed_without_completion",
    ]);

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
