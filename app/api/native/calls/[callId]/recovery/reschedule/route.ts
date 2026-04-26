import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { buildRecoveryRescheduleWindow } from "@/lib/utils";
import { createNotifications, dismissCallNotifications } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/product-insights";

type Body = {
  scheduledStart?: string;
  scheduledEnd?: string;
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
      return Response.json(
        { error: "Only active family members can reschedule." },
        { status: 403 }
      );
    }

    const callResponse = await supabase
      .from("call_sessions")
      .select(
        "id, title, scheduled_start, scheduled_end, status, family_circle_id"
      )
      .eq("id", callId)
      .maybeSingle();
    if (
      !callResponse.data ||
      callResponse.data.family_circle_id !== family.circle.id
    ) {
      return Response.json({ error: "Call not found" }, { status: 404 });
    }

    const window =
      body.scheduledStart && body.scheduledEnd
        ? { startAt: body.scheduledStart, endAt: body.scheduledEnd }
        : buildRecoveryRescheduleWindow(
            callResponse.data.scheduled_start,
            callResponse.data.scheduled_end
          );

    // Build a fresh call session at the new time, copy participants over.
    const newCallInsert = await supabase
      .from("call_sessions")
      .insert({
        family_circle_id: family.circle.id,
        title: callResponse.data.title,
        scheduled_start: window.startAt,
        scheduled_end: window.endAt,
        status: "scheduled",
        meeting_provider: "Kynfowk",
        reminder_status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (newCallInsert.error || !newCallInsert.data) {
      return Response.json(
        { error: newCallInsert.error?.message ?? "Couldn't reschedule." },
        { status: 400 }
      );
    }

    const participantsResponse = await supabase
      .from("call_participants")
      .select("membership_id")
      .eq("call_session_id", callId);
    const ids = new Set((participantsResponse.data ?? []).map((p) => p.membership_id));
    ids.add(family.membership.id);
    if (ids.size > 0) {
      await supabase.from("call_participants").insert(
        [...ids].map((id) => ({
          call_session_id: newCallInsert.data!.id,
          membership_id: id,
        }))
      );
    }

    // Mark the old call as canceled so it stops nagging.
    await supabase
      .from("call_sessions")
      .update({
        status: "canceled",
        reminder_status: "not_needed",
        recovery_dismissed_at: new Date().toISOString(),
      })
      .eq("id", callId)
      .eq("family_circle_id", family.circle.id);
    await dismissCallNotifications(supabase, callId, [
      "reminder_24h_before",
      "reminder_15m_before",
      "starting_now",
      "missing_join_link_warning",
      "call_passed_without_completion",
    ]);

    const dateLabel = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(window.startAt));

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "call_rescheduled",
      summary: `${callResponse.data.title} was rescheduled for ${dateLabel}.`,
    });

    const recipientsResponse = await supabase
      .from("family_memberships")
      .select("user_id, display_name, profiles(email, timezone)")
      .eq("family_circle_id", family.circle.id)
      .in("id", [...ids]);
    await createNotifications(supabase, {
      familyCircleId: family.circle.id,
      callSessionId: newCallInsert.data.id,
      type: "call_scheduled",
      title: `${callResponse.data.title} was rescheduled`,
      body: `New time: ${dateLabel}.`,
      ctaLabel: "Open call",
      ctaHref: `/calls/${newCallInsert.data.id}`,
      dedupeKeyPrefix: `reschedule:${newCallInsert.data.id}`,
      recipients: (recipientsResponse.data ?? [])
        .filter((m) => m.user_id)
        .map((m) => {
          const profile = m.profiles as
            | { email: string | null; timezone: string }[]
            | { email: string | null; timezone: string }
            | null;
          return {
            userId: m.user_id as string,
            displayName: m.display_name,
            email: Array.isArray(profile)
              ? profile[0]?.email ?? null
              : profile?.email ?? null,
            timezone: Array.isArray(profile)
              ? profile[0]?.timezone ?? "America/Chicago"
              : profile?.timezone ?? "America/Chicago",
          };
        }),
    });

    await trackProductEvent(supabase, {
      eventName: "call_scheduled",
      userId: user.id,
      familyCircleId: family.circle.id,
      callSessionId: newCallInsert.data.id,
      metadata: { rescheduledFrom: callId },
    });

    return Response.json({ success: true, callId: newCallInsert.data.id });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
