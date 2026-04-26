import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { logAdminAction } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Server-side no-op — the client drops its impersonation session and
 * restores the stashed super-admin session. This endpoint just records
 * the audit event under the impersonating user (which by the time this
 * runs is the original super admin).
 */
export async function POST(request: Request) {
  try {
    const { user } = await authenticateNativeRequest(request);
    const admin = createSupabaseAdminClient();
    await logAdminAction(admin, {
      actorUserId: user.id,
      kind: "impersonate.end",
    });
    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
