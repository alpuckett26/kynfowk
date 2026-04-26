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
        { error: "Only the family circle owner can manage family units." },
        { status: 403 }
      );
    }

    const name = (body.name ?? "").trim();
    const kind = (body.kind ?? "household").trim();
    const memberIds = [...new Set((body.memberIds ?? []).filter(Boolean))];
    if (!name) {
      return Response.json({ error: "Name is required." }, { status: 400 });
    }

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

    const insertResponse = await supabase
      .from("family_units")
      .insert({
        family_circle_id: family.circle.id,
        name,
        kind,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (insertResponse.error) {
      return Response.json(
        { error: insertResponse.error.message },
        { status: 400 }
      );
    }

    if (memberIds.length) {
      const membersInsert = await supabase.from("family_unit_members").insert(
        memberIds.map((mid) => ({
          family_unit_id: insertResponse.data.id,
          membership_id: mid,
        }))
      );
      if (membersInsert.error) {
        return Response.json(
          { error: membersInsert.error.message },
          { status: 400 }
        );
      }
    }

    return Response.json({ success: true, id: insertResponse.data.id });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
