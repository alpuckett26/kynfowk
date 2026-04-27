import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);
    const url = new URL(request.url);
    const actor = url.searchParams.get("actor");
    const targetUser = url.searchParams.get("targetUser");
    const targetCircle = url.searchParams.get("targetCircle");
    const kind = url.searchParams.get("kind");
    const limit = Math.min(
      Number.parseInt(url.searchParams.get("limit") ?? "100", 10) || 100,
      500
    );

    const admin = createSupabaseAdminClient();
    let query = admin
      .from("admin_audit_log")
      .select(
        "id, actor_user_id, action_kind, target_user_id, target_circle_id, payload, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (actor) query = query.eq("actor_user_id", actor);
    if (targetUser) query = query.eq("target_user_id", targetUser);
    if (targetCircle) query = query.eq("target_circle_id", targetCircle);
    if (kind) query = query.eq("action_kind", kind);

    const result = await query;
    if (result.error) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }
    const rows = (result.data ?? []) as Array<{
      id: string;
      actor_user_id: string;
      action_kind: string;
      target_user_id: string | null;
      target_circle_id: string | null;
      payload: unknown;
      created_at: string;
    }>;

    const actorIds = Array.from(new Set(rows.map((r) => r.actor_user_id)));
    const profiles = actorIds.length
      ? (
          await admin
            .from("profiles")
            .select("id, email, full_name")
            .in("id", actorIds)
        ).data ?? []
      : [];
    const profileById = new Map(
      (profiles as { id: string; email: string | null; full_name: string | null }[]).map(
        (p) => [p.id, p]
      )
    );

    return Response.json({
      entries: rows.map((r) => ({
        ...r,
        actor_email: profileById.get(r.actor_user_id)?.email ?? null,
        actor_name: profileById.get(r.actor_user_id)?.full_name ?? null,
      })),
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
