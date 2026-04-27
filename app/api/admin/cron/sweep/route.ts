import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { logAdminAction, requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sweepAllNotifications } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);
    const admin = createSupabaseAdminClient();
    const result = await sweepAllNotifications(admin);
    await logAdminAction(admin, {
      actorUserId: user.id,
      kind: "cron.sweep",
      payload: { ...result },
    });
    return Response.json({ success: true, ...result });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
