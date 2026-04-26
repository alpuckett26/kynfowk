import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = {
  name?: string;
  kind?: string;
  memberIds?: string[];
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (
      !family ||
      family.membership.status !== "active" ||
      family.membership.role !== "owner"
    ) {
      return Response.json(
        { error: "Only the family circle owner can manage family units." },
        { status: 403 }
      );
    }

    const unitResponse = await supabase
      .from("family_units")
      .select("id, family_circle_id")
      .eq("id", id)
      .maybeSingle();
    if (
      !unitResponse.data ||
      unitResponse.data.family_circle_id !== family.circle.id
    ) {
      return Response.json({ error: "Unit not found." }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string") {
      const v = body.name.trim();
      if (!v) {
        return Response.json(
          { error: "Name can't be blank." },
          { status: 400 }
        );
      }
      updates.name = v;
    }
    if (typeof body.kind === "string" && body.kind.trim()) {
      updates.kind = body.kind.trim();
    }
    if (Object.keys(updates).length > 0) {
      const updateResponse = await supabase
        .from("family_units")
        .update(updates)
        .eq("id", id);
      if (updateResponse.error) {
        return Response.json(
          { error: updateResponse.error.message },
          { status: 400 }
        );
      }
    }

    if (Array.isArray(body.memberIds)) {
      const memberIds = [...new Set(body.memberIds.filter(Boolean))];

      if (memberIds.length) {
        const checkResponse = await supabase
          .from("family_memberships")
          .select("id")
          .eq("family_circle_id", family.circle.id)
          .in("id", memberIds);
        if ((checkResponse.data ?? []).length !== memberIds.length) {
          return Response.json(
            { error: "One of the selected members isn't part of your circle." },
            { status: 400 }
          );
        }
      }

      // Replace the membership set: delete existing, insert new.
      await supabase
        .from("family_unit_members")
        .delete()
        .eq("family_unit_id", id);

      if (memberIds.length) {
        const insertResponse = await supabase.from("family_unit_members").insert(
          memberIds.map((mid) => ({
            family_unit_id: id,
            membership_id: mid,
          }))
        );
        if (insertResponse.error) {
          return Response.json(
            { error: insertResponse.error.message },
            { status: 400 }
          );
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}

export async function DELETE(
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
        { error: "Only the family circle owner can manage family units." },
        { status: 403 }
      );
    }

    const deleteResponse = await supabase
      .from("family_units")
      .delete()
      .eq("id", id)
      .eq("family_circle_id", family.circle.id);
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
