import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { createNotifications } from "@/lib/notifications";

type Body = {
  title?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  description?: string;
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
        { error: "Only active family members can edit calls." },
        { status: 403 }
      );
    }

    const title = (body.title ?? "").trim();
    if (!title) {
      return Response.json(
        { error: "A call title is required." },
        { status: 400 }
      );
    }

    const wantsReschedule = Boolean(body.scheduledStart || body.scheduledEnd);
    if (wantsReschedule && (!body.scheduledStart || !body.scheduledEnd)) {
      return Response.json(
        { error: "Provide both a new start and end time to reschedule." },
        { status: 400 }
      );
    }

    let startIso: string | undefined;
    let endIso: string | undefined;
    if (wantsReschedule) {
      const start = new Date(body.scheduledStart!);
      const end = new Date(body.scheduledEnd!);
      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end.getTime() <= start.getTime()
      ) {
        return Response.json(
          { error: "End must be after start." },
          { status: 400 }
        );
      }
      if (start.getTime() <= Date.now()) {
        return Response.json(
          { error: "Pick a future time." },
          { status: 400 }
        );
      }
      startIso = start.toISOString();
      endIso = end.toISOString();
    }

    const callResponse = await supabase
      .from("call_sessions")
      .select("id, status, title")
      .eq("id", callId)
      .eq("family_circle_id", family.circle.id)
      .maybeSingle();
    if (!callResponse.data) {
      return Response.json({ error: "Call not found." }, { status: 404 });
    }
    if (wantsReschedule && callResponse.data.status !== "scheduled") {
      return Response.json(
        { error: "Only scheduled calls can be rescheduled." },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {
      title,
      meeting_provider: "Kynfowk",
    };
    if (startIso) update.scheduled_start = startIso;
    if (endIso) update.scheduled_end = endIso;
    if (wantsReschedule) {
      update.recovery_dismissed_at = null;
      update.reminder_status = "pending";
      update.reminder_sent_at = null;
    }

    const updateResponse = await supabase
      .from("call_sessions")
      .update(update)
      .eq("id", callId)
      .eq("family_circle_id", family.circle.id)
      .eq("status", "scheduled");
    if (updateResponse.error) {
      return Response.json(
        { error: updateResponse.error.message },
        { status: 400 }
      );
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: wantsReschedule ? "call_rescheduled" : "call_updated",
      summary: wantsReschedule
        ? `${title} was moved to a new time.`
        : `${title} was updated for the Family Circle.`,
    });

    if (wantsReschedule && startIso) {
      const dateLabel = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(startIso));

      const participantsResponse = await supabase
        .from("call_participants")
        .select("membership_id")
        .eq("call_session_id", callId);
      const participantIds = (participantsResponse.data ?? []).map(
        (p) => p.membership_id
      );

      if (participantIds.length) {
        const recipientsResponse = await supabase
          .from("family_memberships")
          .select("id, user_id, display_name, profiles(email, timezone)")
          .eq("family_circle_id", family.circle.id)
          .eq("status", "active")
          .in("id", participantIds);

        const recipients = (recipientsResponse.data ?? [])
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
          });

        await createNotifications(supabase, {
          familyCircleId: family.circle.id,
          callSessionId: callId,
          type: "call_scheduled",
          title: `${title} has a new time`,
          body: `Your Family Circle now has ${title} set for ${dateLabel}.`,
          ctaLabel: "Open call",
          ctaHref: `/calls/${callId}`,
          dedupeKeyPrefix: `call-rescheduled-update:${callId}:${Date.now()}`,
          recipients,
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
