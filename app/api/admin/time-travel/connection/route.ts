import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { logAdminAction, requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Body = {
  membershipA: string;
  membershipB: string;
  daysAgo: number;
};

/**
 * Time-travel the most-recent attended call between two memberships so
 * the cooldown window appears expired. If no shared call exists, creates
 * a synthetic completed call dated `daysAgo` in the past with both as
 * attended participants.
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);
    const body = (await request.json().catch(() => ({}))) as Partial<Body>;
    if (
      !body.membershipA ||
      !body.membershipB ||
      typeof body.daysAgo !== "number"
    ) {
      return Response.json(
        { error: "membershipA, membershipB, daysAgo required" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const target = new Date(
      Date.now() - body.daysAgo * 24 * 60 * 60 * 1000
    ).toISOString();

    // Find the most recent completed call that has both memberships
    // attended.
    const partsResponse = await admin
      .from("call_participants")
      .select(
        "membership_id, call_session_id, attended, call_sessions(id, scheduled_start, status, family_circle_id)"
      )
      .in("membership_id", [body.membershipA, body.membershipB])
      .eq("attended", true);

    const byCall = new Map<
      string,
      { ids: Set<string>; session: { id: string; status: string; family_circle_id: string; scheduled_start: string } }
    >();
    for (const row of (partsResponse.data ?? []) as Array<{
      membership_id: string;
      call_session_id: string;
      call_sessions:
        | { id: string; scheduled_start: string; status: string; family_circle_id: string }
        | { id: string; scheduled_start: string; status: string; family_circle_id: string }[]
        | null;
    }>) {
      const session = Array.isArray(row.call_sessions)
        ? row.call_sessions[0]
        : row.call_sessions;
      if (!session || session.status !== "completed") continue;
      const entry = byCall.get(row.call_session_id) ?? {
        ids: new Set<string>(),
        session,
      };
      entry.ids.add(row.membership_id);
      byCall.set(row.call_session_id, entry);
    }

    const matches = Array.from(byCall.values())
      .filter((e) => e.ids.has(body.membershipA!) && e.ids.has(body.membershipB!))
      .sort(
        (a, b) =>
          new Date(b.session.scheduled_start).getTime() -
          new Date(a.session.scheduled_start).getTime()
      );

    if (matches.length > 0) {
      const target = matches[0].session;
      const update = await admin
        .from("call_sessions")
        .update({ scheduled_start: new Date(Date.now() - body.daysAgo * 86_400_000).toISOString() })
        .eq("id", target.id)
        .select("id, scheduled_start");
      if (update.error) {
        return Response.json({ error: update.error.message }, { status: 500 });
      }
      await logAdminAction(admin, {
        actorUserId: user.id,
        kind: "time_travel.shifted_existing",
        targetCircleId: target.family_circle_id,
        payload: {
          callId: target.id,
          daysAgo: body.daysAgo,
          memberships: [body.membershipA, body.membershipB],
        },
      });
      return Response.json({
        success: true,
        mode: "shifted_existing",
        callId: target.id,
      });
    }

    // No shared call exists — create a synthetic one dated `daysAgo` ago.
    // Need a circle id; pull it from membershipA.
    const memARow = await admin
      .from("family_memberships")
      .select("family_circle_id")
      .eq("id", body.membershipA)
      .maybeSingle();
    const circleId = (memARow.data as { family_circle_id?: string } | null)
      ?.family_circle_id;
    if (!circleId) {
      return Response.json(
        { error: "Membership not found" },
        { status: 404 }
      );
    }

    const start = new Date(target);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const insert = await admin
      .from("call_sessions")
      .insert({
        family_circle_id: circleId,
        title: "Time-travel synthetic",
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        meeting_provider: "Kynfowk",
        reminder_status: "not_needed",
        status: "completed",
        actual_started_at: start.toISOString(),
        actual_ended_at: end.toISOString(),
        actual_duration_minutes: 30,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (insert.error || !insert.data) {
      return Response.json(
        { error: insert.error?.message ?? "Failed to insert call" },
        { status: 500 }
      );
    }

    await admin.from("call_participants").insert([
      {
        call_session_id: insert.data.id,
        membership_id: body.membershipA,
        attended: true,
      },
      {
        call_session_id: insert.data.id,
        membership_id: body.membershipB,
        attended: true,
      },
    ]);

    await logAdminAction(admin, {
      actorUserId: user.id,
      kind: "time_travel.synthetic_call",
      targetCircleId: circleId,
      payload: {
        callId: insert.data.id,
        daysAgo: body.daysAgo,
        memberships: [body.membershipA, body.membershipB],
      },
    });
    return Response.json({
      success: true,
      mode: "synthetic_call",
      callId: insert.data.id,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
