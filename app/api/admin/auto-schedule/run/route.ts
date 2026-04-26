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

type Body = { userId?: string; dryRun?: boolean };

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);
    const body = (await request.json().catch(() => ({}))) as Body;
    const dryRun = Boolean(body.dryRun);
    const admin = createSupabaseAdminClient();

    let userIds: string[];
    if (body.userId) {
      userIds = [body.userId];
    } else {
      const usersResponse = await admin
        .from("profiles")
        .select("id")
        .eq("auto_schedule_enabled", true);
      userIds = ((usersResponse.data ?? []) as { id: string }[]).map((r) => r.id);
    }

    const aggregate: AutoScheduleResult = {
      attempted: 0,
      scheduled: 0,
      skippedByCooldown: 0,
      skippedByNoOverlap: 0,
      skippedByMinorParent: 0,
      skippedByCap: 0,
      skippedByConsent: 0,
    };
    const perUser: Array<{
      userId: string;
      result: AutoScheduleResult;
      proposals?: ReturnType<typeof emptyProposals>;
    }> = [];

    for (const id of userIds) {
      try {
        const { proposals, ...result } = await runAutoScheduleForUser(
          admin,
          id,
          { dryRun }
        );
        perUser.push({
          userId: id,
          result,
          proposals: dryRun ? proposals : undefined,
        });
        aggregate.attempted += result.attempted;
        aggregate.scheduled += result.scheduled;
        aggregate.skippedByCooldown += result.skippedByCooldown;
        aggregate.skippedByNoOverlap += result.skippedByNoOverlap;
        aggregate.skippedByMinorParent += result.skippedByMinorParent;
        aggregate.skippedByCap += result.skippedByCap;
        aggregate.skippedByConsent += result.skippedByConsent;
      } catch (e) {
        console.error("[admin auto-schedule] user failed", id, e);
      }
    }

    await logAdminAction(admin, {
      actorUserId: user.id,
      kind: dryRun ? "auto_schedule.dry_run" : "auto_schedule.run",
      targetUserId: body.userId ?? null,
      payload: { aggregate, userCount: userIds.length },
    });

    return Response.json({ aggregate, perUser, dryRun });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}

function emptyProposals() {
  return [] as Array<{
    selfMembershipId: string;
    selfDisplayName: string;
    kinMembershipId: string;
    kinDisplayName: string;
    tier: string;
    scheduledStart: string;
    scheduledEnd: string;
    participantMembershipIds: string[];
  }>;
}
