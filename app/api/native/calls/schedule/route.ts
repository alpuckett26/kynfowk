import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { createNotifications } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/product-insights";

type Body = {
  title?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  participantMembershipIds?: string[];
};

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Only active family members can schedule calls." },
        { status: 403 }
      );
    }

    const title = (body.title ?? "").trim() || "Family Connections call";
    const startStr = body.scheduledStart;
    const endStr = body.scheduledEnd;
    if (!startStr || !endStr) {
      return Response.json(
        { error: "Start and end times are required." },
        { status: 400 }
      );
    }

    const start = new Date(startStr);
    const end = new Date(endStr);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end.getTime() <= start.getTime()
    ) {
      return Response.json(
        { error: "End time must be after start time." },
        { status: 400 }
      );
    }
    if (start.getTime() < Date.now() - 5 * 60_000) {
      return Response.json(
        { error: "Start time must be in the future." },
        { status: 400 }
      );
    }

    const wantedIds = [...new Set(body.participantMembershipIds ?? [])];
    if (wantedIds.length < 1) {
      return Response.json(
        { error: "Pick at least one family member to invite." },
        { status: 400 }
      );
    }

    // Validate every requested membership belongs to the same circle.
    const membersResponse = await supabase
      .from("family_memberships")
      .select("id, user_id, display_name, status, profiles(email, timezone)")
      .eq("family_circle_id", family.circle.id)
      .in("id", wantedIds);
    const valid = (membersResponse.data ?? []).filter(
      (m) => m.status === "active" || m.status === "invited"
    );
    if (valid.length !== wantedIds.length) {
      return Response.json(
        { error: "One of the selected members isn't part of the circle." },
        { status: 400 }
      );
    }

    // Always include the viewer in the call.
    const participantIds = new Set<string>(wantedIds);
    participantIds.add(family.membership.id);

    const callInsert = await supabase
      .from("call_sessions")
      .insert({
        family_circle_id: family.circle.id,
        title,
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        meeting_provider: "Kynfowk",
        reminder_status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (callInsert.error || !callInsert.data) {
      return Response.json(
        { error: callInsert.error?.message ?? "Couldn't schedule the call." },
        { status: 400 }
      );
    }

    const participantsInsert = await supabase.from("call_participants").insert(
      [...participantIds].map((id) => ({
        call_session_id: callInsert.data.id,
        membership_id: id,
      }))
    );
    if (participantsInsert.error) {
      return Response.json(
        { error: participantsInsert.error.message },
        { status: 400 }
      );
    }

    const dateLabel = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(start);

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "call_scheduled",
      summary: `${title} was scheduled for ${dateLabel}.`,
    });

    const recipients = (membersResponse.data ?? [])
      .filter((m) => m.user_id && participantIds.has(m.id))
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
      callSessionId: callInsert.data.id,
      type: "call_scheduled",
      title: `${title} is on the calendar`,
      body: `A new family call is set for ${dateLabel}.`,
      ctaLabel: "Open call",
      ctaHref: `/calls/${callInsert.data.id}`,
      dedupeKeyPrefix: `call-scheduled:${callInsert.data.id}`,
      recipients,
    });

    await trackProductEvent(supabase, {
      eventName: "call_scheduled",
      userId: user.id,
      familyCircleId: family.circle.id,
      callSessionId: callInsert.data.id,
    });

    return Response.json({ callId: callInsert.data.id });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
