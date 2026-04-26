import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);
    const { id: circleId } = await context.params;
    const admin = createSupabaseAdminClient();

    const circleResponse = await admin
      .from("family_circles")
      .select("id, name, description, created_at, created_by")
      .eq("id", circleId)
      .maybeSingle();
    if (!circleResponse.data) {
      return Response.json({ error: "Circle not found" }, { status: 404 });
    }

    const [membersResponse, callsResponse, activityResponse] = await Promise.all([
      admin
        .from("family_memberships")
        .select(
          "id, user_id, display_name, status, role, is_minor, managed_by_membership_id, parental_auto_schedule_consent, invite_email, created_at"
        )
        .eq("family_circle_id", circleId)
        .order("created_at", { ascending: true }),
      admin
        .from("call_sessions")
        .select(
          "id, title, scheduled_start, scheduled_end, status, auto_scheduled, auto_schedule_tier, created_at"
        )
        .eq("family_circle_id", circleId)
        .order("scheduled_start", { ascending: false })
        .limit(40),
      admin
        .from("family_activity")
        .select("id, activity_type, summary, created_at, actor_membership_id")
        .eq("family_circle_id", circleId)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    return Response.json({
      circle: circleResponse.data,
      members: membersResponse.data ?? [],
      calls: callsResponse.data ?? [],
      activity: activityResponse.data ?? [],
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
