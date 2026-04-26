import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = {
  textResponse?: string;
  photoUrl?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { id: promptId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Only active members can respond." },
        { status: 403 }
      );
    }

    // Confirm prompt belongs to viewer's circle and is open.
    const promptResponse = await supabase
      .from("family_prompts")
      .select("id, family_circle_id, closed_at")
      .eq("id", promptId)
      .maybeSingle();
    if (
      !promptResponse.data ||
      promptResponse.data.family_circle_id !== family.circle.id
    ) {
      return Response.json({ error: "Prompt not found." }, { status: 404 });
    }
    if (promptResponse.data.closed_at) {
      return Response.json({ error: "Prompt is closed." }, { status: 400 });
    }

    const text = (body.textResponse ?? "").trim();
    const photo = (body.photoUrl ?? "").trim();
    if (!text && !photo) {
      return Response.json(
        { error: "Provide a text response or photo." },
        { status: 400 }
      );
    }

    // Upsert by (prompt_id, membership_id).
    const upsertResponse = await supabase
      .from("family_prompt_responses")
      .upsert(
        {
          prompt_id: promptId,
          membership_id: family.membership.id,
          text_response: text || null,
          photo_url: photo || null,
        },
        { onConflict: "prompt_id,membership_id" }
      );
    if (upsertResponse.error) {
      return Response.json(
        { error: upsertResponse.error.message },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
