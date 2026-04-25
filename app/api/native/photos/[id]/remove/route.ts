import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { id } = await context.params;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family) {
      return Response.json({ error: "Not part of a family circle" }, { status: 403 });
    }

    // RLS allows owner-of-photo OR circle creator. Either works.
    const del = await supabase
      .from("circle_carousel_photos")
      .delete()
      .eq("id", id)
      .eq("family_circle_id", family.circle.id);
    if (del.error) {
      return Response.json({ error: del.error.message }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
