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
    if (
      !family ||
      family.membership.status !== "active" ||
      family.membership.role !== "owner"
    ) {
      return Response.json(
        { error: "Only the family circle owner can close prompts." },
        { status: 403 }
      );
    }

    const updateResponse = await supabase
      .from("family_prompts")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", id)
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
