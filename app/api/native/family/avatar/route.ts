import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = {
  membershipId?: string;
  photoUrl?: string;
};

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Only active family members can set avatars." },
        { status: 403 }
      );
    }

    const targetMembershipId = (body.membershipId ?? "").trim();
    const photoUrl = (body.photoUrl ?? "").trim();
    if (!targetMembershipId || !photoUrl) {
      return Response.json(
        { error: "membershipId and photoUrl are required." },
        { status: 400 }
      );
    }

    // Self or owner-managed.
    if (
      targetMembershipId !== family.membership.id &&
      family.membership.role !== "owner"
    ) {
      return Response.json(
        { error: "You can only update your own avatar." },
        { status: 403 }
      );
    }

    const updateResponse = await supabase
      .from("family_memberships")
      .update({ avatar_url: photoUrl })
      .eq("id", targetMembershipId)
      .eq("family_circle_id", family.circle.id);
    if (updateResponse.error) {
      return Response.json(
        { error: updateResponse.error.message },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
