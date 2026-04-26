import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import {
  materializeRecurrence,
  type RecurrenceRuleRow,
} from "@/lib/recurrence";

type Body = {
  title?: string;
  description?: string;
  frequency?: "weekly" | "biweekly" | "monthly";
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  startLocalTime?: string; // HH:MM
  durationMinutes?: number;
  timezone?: string;
};

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family) {
      return Response.json({ needsOnboarding: true }, { status: 200 });
    }

    const rulesResponse = await supabase
      .from("call_recurrence_rules")
      .select(
        "id, title, description, frequency, day_of_week, day_of_month, start_local_time, duration_minutes, timezone, active, created_at"
      )
      .eq("family_circle_id", family.circle.id)
      .order("created_at", { ascending: true });

    return Response.json({
      needsOnboarding: false,
      rules: rulesResponse.data ?? [],
      viewerRole: family.membership.role,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (
      !family ||
      family.membership.status !== "active" ||
      family.membership.role !== "owner"
    ) {
      return Response.json(
        { error: "Only the family circle owner can manage recurring calls." },
        { status: 403 }
      );
    }

    const title = (body.title ?? "").trim();
    const frequency = body.frequency;
    const time = (body.startLocalTime ?? "").trim();
    const duration = Number(body.durationMinutes ?? 30);
    const timezone = (body.timezone ?? "America/Chicago").trim();
    if (!title) {
      return Response.json({ error: "Title is required." }, { status: 400 });
    }
    if (!frequency || !["weekly", "biweekly", "monthly"].includes(frequency)) {
      return Response.json(
        { error: "Pick a frequency." },
        { status: 400 }
      );
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return Response.json(
        { error: "Start time must be HH:MM." },
        { status: 400 }
      );
    }
    if (duration < 5 || duration > 480) {
      return Response.json(
        { error: "Duration must be 5-480 minutes." },
        { status: 400 }
      );
    }

    const insertResponse = await supabase
      .from("call_recurrence_rules")
      .insert({
        family_circle_id: family.circle.id,
        title,
        description: (body.description ?? "").trim() || null,
        frequency,
        day_of_week:
          frequency === "monthly" ? null : (body.dayOfWeek ?? new Date().getDay()),
        day_of_month: frequency === "monthly" ? (body.dayOfMonth ?? new Date().getDate()) : null,
        start_local_time: `${time}:00`,
        duration_minutes: duration,
        timezone,
        created_by_membership_id: family.membership.id,
      })
      .select(
        "id, family_circle_id, title, description, frequency, day_of_week, day_of_month, start_local_time, duration_minutes, timezone, active, last_materialized_through"
      )
      .single();
    if (insertResponse.error || !insertResponse.data) {
      return Response.json(
        { error: insertResponse.error?.message ?? "Couldn't save rule." },
        { status: 400 }
      );
    }

    // Materialize a 4-week horizon immediately so the calls show up.
    const result = await materializeRecurrence(
      supabase,
      insertResponse.data as RecurrenceRuleRow
    );

    return Response.json({
      success: true,
      id: insertResponse.data.id,
      occurrencesScheduled: result.inserted,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
