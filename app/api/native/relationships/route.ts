import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family) {
      return Response.json({ needsOnboarding: true }, { status: 200 });
    }

    const [edgesResponse, unitsResponse, unitMembersResponse, membersResponse] =
      await Promise.all([
        supabase
          .from("relationship_edges")
          .select(
            "id, source_membership_id, target_membership_id, kind, notes, created_at"
          )
          .eq("family_circle_id", family.circle.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("family_units")
          .select("id, name, kind, created_at")
          .eq("family_circle_id", family.circle.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("family_unit_members")
          .select("family_unit_id, membership_id, role")
          .in(
            "family_unit_id",
            (
              await supabase
                .from("family_units")
                .select("id")
                .eq("family_circle_id", family.circle.id)
            ).data?.map((u) => u.id) ?? []
          ),
        supabase
          .from("family_memberships")
          .select("id, display_name, status")
          .eq("family_circle_id", family.circle.id),
      ]);

    return Response.json({
      needsOnboarding: false,
      circle: family.circle,
      viewerMembershipId: family.membership.id,
      viewerRole: family.membership.role,
      members: membersResponse.data ?? [],
      edges: edgesResponse.data ?? [],
      units: (unitsResponse.data ?? []).map((u) => ({
        ...u,
        memberIds:
          (unitMembersResponse.data ?? [])
            .filter((m) => m.family_unit_id === u.id)
            .map((m) => ({ membershipId: m.membership_id, role: m.role })),
      })),
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
