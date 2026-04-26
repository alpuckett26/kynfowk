import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = {
  displayName?: string;
  relationshipLabel?: string;
  isDeceased?: boolean;
  isMinor?: boolean;
  managedByMembershipId?: string;
  notes?: string;
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
        { error: "Only the circle owner can add placeholder members." },
        { status: 403 }
      );
    }

    const displayName = (body.displayName ?? "").trim();
    const relationshipLabel = (body.relationshipLabel ?? "").trim();
    const notes = (body.notes ?? "").trim();
    const isDeceased = !!body.isDeceased;
    const isMinor = !!body.isMinor;
    const managedBy = (body.managedByMembershipId ?? "").trim() || null;

    if (!displayName) {
      return Response.json({ error: "Name is required." }, { status: 400 });
    }

    if (managedBy) {
      const checkResponse = await supabase
        .from("family_memberships")
        .select("id")
        .eq("id", managedBy)
        .eq("family_circle_id", family.circle.id)
        .maybeSingle();
      if (!checkResponse.data) {
        return Response.json(
          { error: "Manager must be a member of your family circle." },
          { status: 400 }
        );
      }
    }

    const insert = await supabase
      .from("family_memberships")
      .insert({
        family_circle_id: family.circle.id,
        display_name: displayName,
        relationship_label: relationshipLabel || null,
        status: "invited",
        role: "member",
        is_placeholder: true,
        is_deceased: isDeceased,
        is_minor: isMinor,
        managed_by_membership_id: managedBy,
        placeholder_notes: notes || null,
      })
      .select("id")
      .single();
    if (insert.error || !insert.data) {
      return Response.json(
        { error: insert.error?.message ?? "Couldn't add member." },
        { status: 400 }
      );
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "placeholder_added",
      summary: isDeceased
        ? `${displayName} was added in memoriam to the Family Circle.`
        : `${displayName} was added as a placeholder family member.`,
    });

    return Response.json({ success: true, membershipId: insert.data.id });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
