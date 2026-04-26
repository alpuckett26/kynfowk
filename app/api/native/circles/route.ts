import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);

    const [profileResponse, membershipsResponse] = await Promise.all([
      supabase
        .from("profiles")
        .select("active_family_circle_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("family_memberships")
        .select(
          "id, family_circle_id, role, status, family_circles(id, name, description)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    const activeId = (profileResponse.data as
      | { active_family_circle_id: string | null }
      | null)?.active_family_circle_id ?? null;

    const circles = (membershipsResponse.data ?? []).map((row) => {
      const c = row.family_circles as
        | { id: string; name: string; description: string | null }[]
        | { id: string; name: string; description: string | null }
        | null;
      const circle = Array.isArray(c) ? c[0] : c;
      return {
        membershipId: row.id,
        circleId: row.family_circle_id,
        name: circle?.name ?? "(unknown)",
        description: circle?.description ?? null,
        role: row.role,
        status: row.status,
        active:
          activeId !== null
            ? row.family_circle_id === activeId
            : row === membershipsResponse.data?.[0],
      };
    });

    return Response.json({ circles, activeCircleId: activeId });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
