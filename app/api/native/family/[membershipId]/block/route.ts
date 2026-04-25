import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = { reason?: string };

export async function POST(
  request: Request,
  context: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { membershipId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (
      !family ||
      family.membership.status !== "active" ||
      family.membership.role !== "owner"
    ) {
      return Response.json(
        { error: "Only the circle owner can block members." },
        { status: 403 }
      );
    }

    if (membershipId === family.membership.id) {
      return Response.json(
        { error: "You can't block yourself." },
        { status: 400 }
      );
    }

    const targetResponse = await supabase
      .from("family_memberships")
      .select("id, display_name, role")
      .eq("id", membershipId)
      .eq("family_circle_id", family.circle.id)
      .maybeSingle();
    if (!targetResponse.data) {
      return Response.json({ error: "Member not found." }, { status: 404 });
    }
    if (targetResponse.data.role === "owner") {
      return Response.json(
        { error: "Owners can't be blocked." },
        { status: 400 }
      );
    }

    const reason = (body.reason ?? "").trim() || null;

    const update = await supabase
      .from("family_memberships")
      .update({ blocked_at: new Date().toISOString(), blocked_reason: reason })
      .eq("id", membershipId)
      .eq("family_circle_id", family.circle.id);
    if (update.error) {
      return Response.json({ error: update.error.message }, { status: 400 });
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "member_blocked",
      summary: `${targetResponse.data.display_name} was blocked from the Family Circle.`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
