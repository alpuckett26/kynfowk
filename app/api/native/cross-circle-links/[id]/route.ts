import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { id } = await context.params;

    // Only the source circle's owner can hard-delete a link.
    const linkResponse = await supabase
      .from("cross_circle_kin_links")
      .select("source_membership_id")
      .eq("id", id)
      .maybeSingle();
    const link = linkResponse.data as
      | { source_membership_id: string }
      | null;
    if (!link) return Response.json({ error: "Not found." }, { status: 404 });

    const sourceResponse = await supabase
      .from("family_memberships")
      .select("family_circles(created_by)")
      .eq("id", link.source_membership_id)
      .maybeSingle();
    const ownerId = (() => {
      const fc = (sourceResponse.data as
        | {
            family_circles:
              | { created_by: string }
              | { created_by: string }[]
              | null;
          }
        | null)?.family_circles;
      if (Array.isArray(fc)) return fc[0]?.created_by;
      return fc?.created_by;
    })();
    if (ownerId !== user.id) {
      return Response.json(
        { error: "Only the source circle's owner can remove the link." },
        { status: 403 }
      );
    }

    const deleteResponse = await supabase
      .from("cross_circle_kin_links")
      .delete()
      .eq("id", id);
    if (deleteResponse.error) {
      return Response.json(
        { error: deleteResponse.error.message },
        { status: 400 }
      );
    }
    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
