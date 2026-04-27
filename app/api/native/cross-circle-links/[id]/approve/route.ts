import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { id } = await context.params;

    const linkResponse = await supabase
      .from("cross_circle_kin_links")
      .select(
        "id, source_membership_id, target_membership_id, status"
      )
      .eq("id", id)
      .maybeSingle();
    const link = linkResponse.data as
      | {
          id: string;
          source_membership_id: string;
          target_membership_id: string;
          status: string;
        }
      | null;
    if (!link) {
      return Response.json({ error: "Link not found." }, { status: 404 });
    }
    if (link.status !== "pending") {
      return Response.json(
        { error: "Link is not pending." },
        { status: 400 }
      );
    }

    // Resolve target membership + circle owner + minor status.
    const targetResponse = await supabase
      .from("family_memberships")
      .select(
        "id, family_circle_id, is_minor, managed_by_membership_id, family_circles(created_by)"
      )
      .eq("id", link.target_membership_id)
      .maybeSingle();
    const target = targetResponse.data as
      | {
          id: string;
          family_circle_id: string;
          is_minor: boolean;
          managed_by_membership_id: string | null;
          family_circles:
            | { created_by: string }
            | { created_by: string }[]
            | null;
        }
      | null;
    if (!target) {
      return Response.json(
        { error: "Target membership not found." },
        { status: 404 }
      );
    }

    // Determine who can approve: target circle owner OR (if target is a
    // minor) the minor's managing parent's user_id.
    const targetOwnerId = Array.isArray(target.family_circles)
      ? target.family_circles[0]?.created_by
      : target.family_circles?.created_by;

    let allowed = targetOwnerId === user.id;
    if (!allowed && target.is_minor && target.managed_by_membership_id) {
      const parentResponse = await supabase
        .from("family_memberships")
        .select("user_id")
        .eq("id", target.managed_by_membership_id)
        .maybeSingle();
      const parentUserId = (
        parentResponse.data as { user_id: string | null } | null
      )?.user_id;
      if (parentUserId === user.id) allowed = true;
    }

    if (!allowed) {
      return Response.json(
        {
          error:
            "Only the target circle's owner (or the minor's managing parent) can approve.",
        },
        { status: 403 }
      );
    }

    const updateResponse = await supabase
      .from("cross_circle_kin_links")
      .update({
        status: "active",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);
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
