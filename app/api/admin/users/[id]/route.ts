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
    const { id: targetId } = await context.params;
    const admin = createSupabaseAdminClient();

    const profileResponse = await admin
      .from("profiles")
      .select(
        "id, email, full_name, timezone, is_super_admin, auto_schedule_enabled, auto_schedule_paused_until, auto_schedule_max_per_week, created_at"
      )
      .eq("id", targetId)
      .maybeSingle();
    if (!profileResponse.data) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const membershipsResponse = await admin
      .from("family_memberships")
      .select(
        "id, family_circle_id, display_name, role, status, is_minor, managed_by_membership_id, parental_auto_schedule_consent, family_circles(id, name)"
      )
      .eq("user_id", targetId);
    const memberships = (membershipsResponse.data ?? []) as Array<{
      id: string;
      family_circle_id: string;
      display_name: string;
      role: string;
      status: string;
      is_minor: boolean;
      managed_by_membership_id: string | null;
      parental_auto_schedule_consent: boolean;
      family_circles: { id: string; name: string } | { id: string; name: string }[] | null;
    }>;

    const membershipIds = memberships.map((m) => m.id);
    const recentCallsResponse = membershipIds.length
      ? await admin
          .from("call_participants")
          .select(
            "membership_id, call_session_id, attended, call_sessions(id, title, scheduled_start, status, auto_scheduled, auto_schedule_tier, family_circle_id)"
          )
          .in("membership_id", membershipIds)
          .limit(40)
      : { data: [] };

    return Response.json({
      profile: profileResponse.data,
      memberships: memberships.map((m) => ({
        ...m,
        family_circles: Array.isArray(m.family_circles)
          ? m.family_circles[0] ?? null
          : m.family_circles ?? null,
      })),
      recentCalls: recentCallsResponse.data ?? [],
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
