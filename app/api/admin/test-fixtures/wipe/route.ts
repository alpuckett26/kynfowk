import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { logAdminAction, requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);
    const admin = createSupabaseAdminClient();

    const circlesResponse = await admin
      .from("family_circles")
      .select("id, name")
      .ilike("name", "Test Family%");
    const circles = (circlesResponse.data ?? []) as { id: string; name: string }[];
    if (circles.length === 0) {
      return Response.json({ success: true, deleted: 0 });
    }
    const ids = circles.map((c) => c.id);
    const del = await admin.from("family_circles").delete().in("id", ids);
    if (del.error) {
      return Response.json({ error: del.error.message }, { status: 500 });
    }
    await logAdminAction(admin, {
      actorUserId: user.id,
      kind: "test_fixture.family_wiped",
      payload: { circleIds: ids, count: ids.length },
    });
    return Response.json({ success: true, deleted: ids.length });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
