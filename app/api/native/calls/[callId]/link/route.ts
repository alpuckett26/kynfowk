import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { dismissCallNotifications } from "@/lib/notifications";
import {
  inferMeetingProvider,
  normalizeMeetingUrl,
} from "@/lib/utils";

type Body = {
  meetingProvider?: string | null;
  meetingUrl?: string | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ callId: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { callId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json({ error: "Not a member of any family circle" }, { status: 403 });
    }

    const meetingUrlInput = (body.meetingUrl ?? "").trim();
    const meetingProviderInput = (body.meetingProvider ?? "").trim();
    const meetingUrl = meetingUrlInput ? normalizeMeetingUrl(meetingUrlInput) : null;
    if (meetingUrlInput && !meetingUrl) {
      return Response.json(
        { error: "Please provide a valid meeting URL." },
        { status: 400 }
      );
    }
    const meetingProvider =
      meetingUrl && !meetingProviderInput
        ? inferMeetingProvider(meetingUrl)
        : meetingProviderInput || null;

    const updateResponse = await supabase
      .from("call_sessions")
      .update({
        meeting_provider: meetingProvider,
        meeting_url: meetingUrl,
        reminder_status: "pending",
        reminder_sent_at: null,
      })
      .eq("id", callId)
      .eq("family_circle_id", family.circle.id)
      .eq("status", "scheduled");
    if (updateResponse.error) {
      return Response.json({ error: updateResponse.error.message }, { status: 400 });
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: meetingUrl ? "meeting_link_saved" : "meeting_link_removed",
      summary: meetingUrl
        ? `${meetingProvider ?? "A join link"} was added to an upcoming family call.`
        : "The join link was cleared from an upcoming family call.",
    });

    if (meetingUrl) {
      await dismissCallNotifications(supabase, callId, ["missing_join_link_warning"]);
    }

    return Response.json({ success: true, meetingProvider, meetingUrl });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
