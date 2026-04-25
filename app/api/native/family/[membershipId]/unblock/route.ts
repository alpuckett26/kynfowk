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
        { error: "Only the circle owner can unblock members." },
        { status: 403 }
      );
    }

    const targetResponse = await supabase
      .from("family_memberships")
      .select("id, display_name")
      .eq("id", membershipId)
      .eq("family_circle_id", family.circle.id)
      .maybeSingle();
    if (!targetResponse.data) {
      return Response.json({ error: "Member not found." }, { status: 404 });
    }

    const update = await supabase
      .from("family_memberships")
      .update({ blocked_at: null, blocked_reason: null })
      .eq("id", membershipId)
      .eq("family_circle_id", family.circle.id);
    if (update.error) {
      return Response.json({ error: update.error.message }, { status: 400 });
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "member_unblocked",
      summary: `${targetResponse.data.display_name} was welcomed back into the Family Circle.`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
