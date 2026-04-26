import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = { message?: string };

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Only active members can respond." },
        { status: 403 }
      );
    }

    const intentionResponse = await supabase
      .from("prayer_intentions")
      .select("id, family_circle_id, status")
      .eq("id", id)
      .maybeSingle();
    if (
      !intentionResponse.data ||
      intentionResponse.data.family_circle_id !== family.circle.id
    ) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
    if (intentionResponse.data.status === "archived") {
      return Response.json(
        { error: "Intention is archived." },
        { status: 400 }
      );
    }

    const insertResponse = await supabase.from("prayer_responses").insert({
      intention_id: id,
      membership_id: family.membership.id,
      message: (body.message ?? "").trim() || null,
    });
    if (insertResponse.error) {
      return Response.json(
        { error: insertResponse.error.message },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
