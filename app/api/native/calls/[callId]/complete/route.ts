import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { dismissCallNotifications } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/product-insights";

type Body = {
  durationMinutes?: number;
  attendedMembershipIds?: string[];
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

    const callResponse = await supabase
      .from("call_sessions")
      .select("actual_started_at, scheduled_start, family_circle_id, status")
      .eq("id", callId)
      .maybeSingle();
    if (!callResponse.data || callResponse.data.family_circle_id !== family.circle.id) {
      return Response.json({ error: "Call not found" }, { status: 404 });
    }

    const participantsResponse = await supabase
      .from("call_participants")
      .select("membership_id")
      .eq("call_session_id", callId);
    const scheduledMembershipIds = (participantsResponse.data ?? []).map(
      (p) => p.membership_id
    );
    if (!scheduledMembershipIds.length) {
      return Response.json(
        { error: "Call has no participants" },
        { status: 400 }
      );
    }

    const attendedMembershipIds = new Set(
      (body.attendedMembershipIds ?? []).filter((id) =>
        scheduledMembershipIds.includes(id)
      )
    );

    const requested = body.durationMinutes ?? 45;
    const normalizedDuration =
      Number.isFinite(requested) && requested >= 5 ? requested : 45;
    const actualEndedAt = new Date().toISOString();
    const actualStartedAt =
      callResponse.data.actual_started_at ??
      new Date(Date.now() - normalizedDuration * 60_000).toISOString();

    const updateResponse = await supabase
      .from("call_sessions")
      .update({
        status: "completed",
        actual_duration_minutes: normalizedDuration,
        actual_started_at: actualStartedAt,
        actual_ended_at: actualEndedAt,
        recovery_dismissed_at: null,
        reminder_status: "not_needed",
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

    const attendanceResults = await Promise.all(
      scheduledMembershipIds.map((membershipId) =>
        supabase
          .from("call_participants")
          .update({ attended: attendedMembershipIds.has(membershipId) })
          .eq("call_session_id", callId)
          .eq("membership_id", membershipId)
      )
    );
    const attendanceError = attendanceResults.find((r) => r.error)?.error;
    if (attendanceError) {
      return Response.json({ error: attendanceError.message }, { status: 400 });
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "call_completed",
      summary: `A family call was marked complete with ${normalizedDuration} minutes of Time Together and ${attendedMembershipIds.size} family member${attendedMembershipIds.size === 1 ? "" : "s"} present.`,
    });

    await dismissCallNotifications(supabase, callId, [
      "reminder_24h_before",
      "reminder_15m_before",
      "starting_now",
      "missing_join_link_warning",
      "call_passed_without_completion",
    ]);

    await trackProductEvent(supabase, {
      eventName: "call_completed",
      userId: user.id,
      familyCircleId: family.circle.id,
      callSessionId: callId,
      metadata: {
        durationMinutes: normalizedDuration,
        attendees: attendedMembershipIds.size,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
