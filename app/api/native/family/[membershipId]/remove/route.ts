import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

export async function POST(
  request: Request,
  context: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { membershipId } = await context.params;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (
      !family ||
      family.membership.status !== "active" ||
      family.membership.role !== "owner"
    ) {
      return Response.json(
        { error: "Only the circle owner can remove members." },
        { status: 403 }
      );
    }

    const targetResponse = await supabase
      .from("family_memberships")
      .select("id, display_name, status, role")
      .eq("id", membershipId)
      .eq("family_circle_id", family.circle.id)
      .maybeSingle();
    if (!targetResponse.data) {
      return Response.json({ error: "Member not found." }, { status: 404 });
    }
    const target = targetResponse.data;

    if (target.role === "owner" || target.id === family.membership.id) {
      return Response.json(
        { error: "Owners can't remove themselves." },
        { status: 400 }
      );
    }

    if (target.status === "active") {
      const [availabilityResponse, participantResponse] = await Promise.all([
        supabase
          .from("availability_windows")
          .select("id")
          .eq("membership_id", membershipId)
          .limit(1),
        supabase
          .from("call_participants")
          .select("id")
          .eq("membership_id", membershipId)
          .limit(1),
      ]);
      if (
        (availabilityResponse.data ?? []).length ||
        (participantResponse.data ?? []).length
      ) {
        return Response.json(
          {
            error:
              "This member has availability or call history. Block them instead of removing.",
          },
          { status: 400 }
        );
      }
    }

    const deleteResponse = await supabase
      .from("family_memberships")
      .delete()
      .eq("id", membershipId)
      .eq("family_circle_id", family.circle.id);
    if (deleteResponse.error) {
      return Response.json(
        { error: deleteResponse.error.message },
        { status: 400 }
      );
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "member_removed",
      summary: `${target.display_name} was removed from the Family Circle.`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
