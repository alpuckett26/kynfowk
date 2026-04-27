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

    // Same authorization as approve — either circle's owner OR the
    // minor's managing parent (when the target is a minor).
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
    if (!link) return Response.json({ error: "Not found." }, { status: 404 });

    const memberResponses = await supabase
      .from("family_memberships")
      .select(
        "id, is_minor, managed_by_membership_id, family_circles(created_by)"
      )
      .in("id", [link.source_membership_id, link.target_membership_id]);
    const members = (memberResponses.data ?? []) as Array<{
      id: string;
      is_minor: boolean;
      managed_by_membership_id: string | null;
      family_circles: { created_by: string } | { created_by: string }[] | null;
    }>;

    const ownerIds = new Set<string>();
    for (const m of members) {
      const owner = Array.isArray(m.family_circles)
        ? m.family_circles[0]?.created_by
        : m.family_circles?.created_by;
      if (owner) ownerIds.add(owner);
    }

    let allowed = ownerIds.has(user.id);
    if (!allowed) {
      for (const m of members) {
        if (m.is_minor && m.managed_by_membership_id) {
          const parentResponse = await supabase
            .from("family_memberships")
            .select("user_id")
            .eq("id", m.managed_by_membership_id)
            .maybeSingle();
          const parentUserId = (
            parentResponse.data as { user_id: string | null } | null
          )?.user_id;
          if (parentUserId === user.id) {
            allowed = true;
            break;
          }
        }
      }
    }
    if (!allowed) {
      return Response.json(
        { error: "Not authorized to decline this link." },
        { status: 403 }
      );
    }

    const updateResponse = await supabase
      .from("cross_circle_kin_links")
      .update({ status: "declined" })
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
