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
      return Response.json({ error: "Not a member of any family circle" }, { status: 403 });
    }

    const updateResponse = await supabase
      .from("call_sessions")
      .update({
        status: "canceled",
        reminder_status: "not_needed",
      })
      .eq("id", callId)
      .eq("family_circle_id", family.circle.id)
      .in("status", ["scheduled", "live"]);
    if (updateResponse.error) {
      return Response.json({ error: updateResponse.error.message }, { status: 400 });
    }

    await dismissCallNotifications(supabase, callId, [
      "reminder_24h_before",
      "reminder_15m_before",
      "starting_now",
      "missing_join_link_warning",
      "call_passed_without_completion",
    ]);

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
