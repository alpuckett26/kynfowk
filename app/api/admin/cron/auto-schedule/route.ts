import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { logAdminAction, requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  runAutoScheduleForUser,
  type AutoScheduleResult,
} from "@/lib/auto-schedule";

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);
    const admin = createSupabaseAdminClient();

    const usersResponse = await admin
      .from("profiles")
      .select("id")
      .eq("auto_schedule_enabled", true);
    const userIds = ((usersResponse.data ?? []) as { id: string }[]).map(
      (r) => r.id
    );

    const aggregate: AutoScheduleResult = {
      attempted: 0,
      scheduled: 0,
      skippedByCooldown: 0,
      skippedByNoOverlap: 0,
      skippedByMinorParent: 0,
      skippedByCap: 0,
      skippedByConsent: 0,
    };
    const perUser: Array<{ userId: string; result: AutoScheduleResult }> = [];

    for (const id of userIds) {
      try {
        const { proposals: _p, ...result } = await runAutoScheduleForUser(
          admin,
          id
        );
        perUser.push({ userId: id, result });
        aggregate.attempted += result.attempted;
        aggregate.scheduled += result.scheduled;
        aggregate.skippedByCooldown += result.skippedByCooldown;
        aggregate.skippedByNoOverlap += result.skippedByNoOverlap;
        aggregate.skippedByMinorParent += result.skippedByMinorParent;
        aggregate.skippedByCap += result.skippedByCap;
        aggregate.skippedByConsent += result.skippedByConsent;
      } catch (e) {
        console.error("[admin cron auto-schedule] user failed", id, e);
      }
    }

    await logAdminAction(admin, {
      actorUserId: user.id,
      kind: "cron.auto_schedule",
      payload: { aggregate, userCount: userIds.length },
    });

    return Response.json({ success: true, aggregate, perUser });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
