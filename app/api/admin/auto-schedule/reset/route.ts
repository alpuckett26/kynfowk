import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { logAdminAction, requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Body = { userId?: string; circleId?: string };

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);
    const body = (await request.json().catch(() => ({}))) as Body;
    const admin = createSupabaseAdminClient();

    let circleIds: string[] = [];
    if (body.circleId) {
      circleIds = [body.circleId];
    } else if (body.userId) {
      const memberships = await admin
        .from("family_memberships")
        .select("family_circle_id")
        .eq("user_id", body.userId);
      circleIds = Array.from(
        new Set(
          ((memberships.data ?? []) as { family_circle_id: string }[]).map(
            (m) => m.family_circle_id
          )
        )
      );
    } else {
      return Response.json(
        { error: "userId or circleId required" },
        { status: 400 }
      );
    }

    if (circleIds.length === 0) {
      return Response.json({ success: true, canceled: 0 });
    }

    const cancel = await admin
      .from("call_sessions")
      .update({ status: "canceled" })
      .in("family_circle_id", circleIds)
      .eq("auto_scheduled", true)
      .in("status", ["scheduled", "live"])
      .gte("scheduled_start", new Date().toISOString())
      .select("id");
    if (cancel.error) {
      return Response.json({ error: cancel.error.message }, { status: 500 });
    }

    const canceled = (cancel.data ?? []).length;
    await logAdminAction(admin, {
      actorUserId: user.id,
      kind: "auto_schedule.reset",
      targetUserId: body.userId ?? null,
      targetCircleId: body.circleId ?? null,
      payload: { canceled, circleIds },
    });
    return Response.json({ success: true, canceled });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
