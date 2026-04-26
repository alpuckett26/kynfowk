import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = { status?: "open" | "answered" | "archived" };

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
        { error: "Only active members can update intentions." },
        { status: 403 }
      );
    }

    const status = body.status;
    if (!status || !["open", "answered", "archived"].includes(status)) {
      return Response.json(
        { error: "status must be open, answered, or archived." },
        { status: 400 }
      );
    }

    const intentionResponse = await supabase
      .from("prayer_intentions")
      .select("id, family_circle_id, author_membership_id")
      .eq("id", id)
      .maybeSingle();
    if (
      !intentionResponse.data ||
      intentionResponse.data.family_circle_id !== family.circle.id
    ) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    // Author or owner can change status.
    if (
      intentionResponse.data.author_membership_id !== family.membership.id &&
      family.membership.role !== "owner"
    ) {
      return Response.json(
        { error: "Only the author or the circle owner can change status." },
        { status: 403 }
      );
    }

    const updateResponse = await supabase
      .from("prayer_intentions")
      .update({ status })
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
