import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { trackProductEvent } from "@/lib/product-insights";
import {
  buildAvailabilitySummary,
  type AvailabilityWindowLike,
} from "@/lib/availability";

type Body = {
  slots?: string[];
};

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Not a member of any family circle" },
        { status: 403 }
      );
    }

    const incoming = [...new Set((body.slots ?? []).filter(Boolean))];
    const parsed = incoming.map((slot) => {
      const [weekday, startHour, endHour] = slot.split("|").map(Number);
      return { weekday, start_hour: startHour, end_hour: endHour };
    });

    const isInvalid = parsed.some(
      (s) =>
        !Number.isInteger(s.weekday) ||
        !Number.isInteger(s.start_hour) ||
        !Number.isInteger(s.end_hour) ||
        s.weekday < 0 ||
        s.weekday > 6 ||
        s.start_hour < 0 ||
        s.start_hour > 23 ||
        s.end_hour < 1 ||
        s.end_hour > 24 ||
        s.end_hour <= s.start_hour
    );
    if (isInvalid) {
      return Response.json(
        { error: "One of the availability windows isn't valid." },
        { status: 400 }
      );
    }

    const deleteResponse = await supabase
      .from("availability_windows")
      .delete()
      .eq("family_circle_id", family.circle.id)
      .eq("membership_id", family.membership.id)
      .eq("user_id", user.id);
    if (deleteResponse.error) {
      return Response.json(
        { error: deleteResponse.error.message },
        { status: 400 }
      );
    }

    if (parsed.length) {
      const insertResponse = await supabase.from("availability_windows").insert(
        parsed.map((s) => ({
          family_circle_id: family.circle.id,
          membership_id: family.membership.id,
          user_id: user.id,
          weekday: s.weekday,
          start_hour: s.start_hour,
          end_hour: s.end_hour,
        }))
      );
      if (insertResponse.error) {
        return Response.json(
          { error: insertResponse.error.message },
          { status: 400 }
        );
      }
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: parsed.length ? "availability_updated" : "availability_cleared",
      summary: parsed.length
        ? "Availability was updated to reflect a new weekly rhythm."
        : "Availability was cleared for now.",
    });

    await trackProductEvent(supabase, {
      eventName: "availability_saved",
      userId: user.id,
      familyCircleId: family.circle.id,
      metadata: { slotsSaved: parsed.length },
    });

    const summary = buildAvailabilitySummary(parsed as AvailabilityWindowLike[]);

    return Response.json({ success: true, slots: incoming, summary });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
