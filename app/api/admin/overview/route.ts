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
    const admin = createSupabaseAdminClient();

    const [circles, users, autoCalls] = await Promise.all([
      admin
        .from("family_circles")
        .select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("auto_scheduled", true)
        .gte("scheduled_start", new Date().toISOString())
        .lte(
          "scheduled_start",
          new Date(Date.now() + 7 * 86_400_000).toISOString()
        )
        .in("status", ["scheduled", "live"]),
    ]);

    return Response.json({
      circleCount: circles.count ?? 0,
      userCount: users.count ?? 0,
      autoScheduledNext7Days: autoCalls.count ?? 0,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
