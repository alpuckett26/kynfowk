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
      return Response.json(
        { error: "Not part of a family circle" },
        { status: 403 }
      );
    }

    const membersResponse = await supabase
      .from("family_memberships")
      .select(
        "id, display_name, status, role, relationship_label, invite_email, phone_number, avatar_url, is_placeholder, is_deceased, blocked_at"
      )
      .eq("family_circle_id", family.circle.id)
      .order("created_at", { ascending: true });

    return Response.json({
      circle: family.circle,
      viewerMembershipId: family.membership.id,
      viewerRole: family.membership.role,
      members: membersResponse.data ?? [],
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
