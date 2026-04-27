import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { logAdminAction, requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Body = { isSuperAdmin: boolean };

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);
    const { id: targetId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Partial<Body>;
    if (typeof body.isSuperAdmin !== "boolean") {
      return Response.json({ error: "isSuperAdmin required" }, { status: 400 });
    }
    const admin = createSupabaseAdminClient();
    const update = await admin
      .from("profiles")
      .update({ is_super_admin: body.isSuperAdmin })
      .eq("id", targetId)
      .select("id, is_super_admin")
      .maybeSingle();
    if (update.error) {
      return Response.json({ error: update.error.message }, { status: 500 });
    }
    await logAdminAction(admin, {
      actorUserId: user.id,
      kind: body.isSuperAdmin ? "user.promote" : "user.demote",
      targetUserId: targetId,
      payload: { isSuperAdmin: body.isSuperAdmin },
    });
    return Response.json({ success: true, profile: update.data });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
