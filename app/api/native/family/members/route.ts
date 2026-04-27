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

    const membersResponse = await supabase
      .from("family_memberships")
      .select(
        "id, display_name, status, role, relationship_label, invite_email, phone_number, avatar_url, is_placeholder, is_deceased, blocked_at, address, placeholder_notes, birthday, nickname, bio, favorite_food, faith_notes, prayer_intentions, pronouns, hometown, is_minor, managed_by_membership_id, parental_auto_schedule_consent"
      )
      .eq("family_circle_id", family.circle.id)
      .order("created_at", { ascending: true });

    return Response.json({
      needsOnboarding: false,
      circle: family.circle,
      viewerMembershipId: family.membership.id,
      viewerRole: family.membership.role,
      members: membersResponse.data ?? [],
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
