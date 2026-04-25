import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { createNotifications } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/product-insights";

type Body = {
  summary?: string;
  highlight?: string;
  nextStep?: string;
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
      .select("family_circle_id")
      .eq("id", callId)
      .maybeSingle();
    if (!callResponse.data || callResponse.data.family_circle_id !== family.circle.id) {
      return Response.json({ error: "Call not found" }, { status: 404 });
    }

    const summary = (body.summary ?? "").trim() || null;
    const highlight = (body.highlight ?? "").trim() || null;
    const nextStep = (body.nextStep ?? "").trim() || null;

    const upsert = await supabase.from("call_recaps").upsert(
      {
        call_session_id: callId,
        summary,
        highlight,
        next_step: nextStep,
        created_by: user.id,
      },
      { onConflict: "call_session_id" }
    );
    if (upsert.error) {
      return Response.json({ error: upsert.error.message }, { status: 400 });
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "recap_saved",
      summary: highlight
        ? `A post-call summary was saved: ${highlight}`
        : "A post-call summary was saved for the latest family call.",
    });

    const recipientsResponse = await supabase
      .from("family_memberships")
      .select("user_id, display_name, profiles(email, timezone)")
      .eq("family_circle_id", family.circle.id)
      .eq("status", "active");

    await createNotifications(supabase, {
      familyCircleId: family.circle.id,
      callSessionId: callId,
      type: "recap_posted",
      title: "A new recap is ready",
      body: highlight
        ? `A fresh family recap was posted: ${highlight}`
        : "A fresh family recap was posted so everyone can revisit what mattered most.",
      ctaLabel: "Open recap",
      ctaHref: `/calls/${callId}`,
      dedupeKeyPrefix: `recap-posted:${callId}:${Date.now()}`,
      recipients: (recipientsResponse.data ?? [])
        .filter((m) => m.user_id)
        .map((m) => {
          const profileRecord = m.profiles as
            | { email: string | null; timezone: string }[]
            | { email: string | null; timezone: string }
            | null;
          return {
            userId: m.user_id as string,
            displayName: m.display_name,
            email: Array.isArray(profileRecord)
              ? profileRecord[0]?.email ?? null
              : profileRecord?.email ?? null,
            timezone: Array.isArray(profileRecord)
              ? profileRecord[0]?.timezone ?? "America/Chicago"
              : profileRecord?.timezone ?? "America/Chicago",
          };
        }),
    });

    await trackProductEvent(supabase, {
      eventName: "recap_saved",
      userId: user.id,
      familyCircleId: family.circle.id,
      callSessionId: callId,
    });

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
