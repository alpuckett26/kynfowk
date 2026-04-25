import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? "50")));

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family) {
      return Response.json({ error: "Not part of a family circle" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("family_activity")
      .select("id, summary, created_at, activity_type, actor_membership_id")
      .eq("family_circle_id", family.circle.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    const items = (data ?? []).map((row) => ({
      id: row.id,
      summary: row.summary,
      createdAt: row.created_at,
      type: row.activity_type,
      actorMembershipId: row.actor_membership_id,
    }));

    return Response.json({ items });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
