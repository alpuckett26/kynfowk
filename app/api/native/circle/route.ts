import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = {
  name?: string;
  description?: string | null;
};

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (
      !family ||
      family.membership.status !== "active" ||
      family.membership.role !== "owner"
    ) {
      return Response.json(
        { error: "Only the family circle owner can edit settings." },
        { status: 403 }
      );
    }

    const update: Record<string, unknown> = {};
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return Response.json(
          { error: "Family circle name can't be blank." },
          { status: 400 }
        );
      }
      if (name.length > 80) {
        return Response.json(
          { error: "Name is too long (80 character max)." },
          { status: 400 }
        );
      }
      update.name = name;
    }
    if (body.description !== undefined) {
      const desc = (body.description ?? "").toString().trim();
      update.description = desc.length ? desc : null;
    }
    if (Object.keys(update).length === 0) {
      return Response.json({ error: "Nothing to update." }, { status: 400 });
    }

    const updateResponse = await supabase
      .from("family_circles")
      .update(update)
      .eq("id", family.circle.id);
    if (updateResponse.error) {
      return Response.json(
        { error: updateResponse.error.message },
        { status: 400 }
      );
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "circle_updated",
      summary: `${family.membership.display_name} updated the circle settings.`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
