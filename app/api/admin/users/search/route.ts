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
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return Response.json({ users: [] });
    }
    const admin = createSupabaseAdminClient();
    const profilesResponse = await admin
      .from("profiles")
      .select("id, email, full_name, timezone, is_super_admin, created_at")
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(25);
    return Response.json({ users: profilesResponse.data ?? [] });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
