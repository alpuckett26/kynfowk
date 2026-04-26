import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = {
  displayName?: string;
  relationshipLabel?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  birthday?: string | null;
  nickname?: string | null;
  bio?: string | null;
  favoriteFood?: string | null;
  faithNotes?: string | null;
  prayerIntentions?: string | null;
  pronouns?: string | null;
  hometown?: string | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { membershipId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Not a family circle owner." },
        { status: 403 }
      );
    }

    // Owner can edit anyone in the circle. Self can edit own row.
    const isSelf = membershipId === family.membership.id;
    const isOwner = family.membership.role === "owner";
    if (!isSelf && !isOwner) {
      return Response.json(
        { error: "Only the circle owner can edit other members." },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.displayName === "string") {
      const dn = body.displayName.trim();
      if (!dn) {
        return Response.json({ error: "Name can't be empty." }, { status: 400 });
      }
      updates.display_name = dn;
    }
    if (body.relationshipLabel !== undefined) {
      const rl = (body.relationshipLabel ?? "").trim();
      updates.relationship_label = rl || null;
    }
    if (body.phoneNumber !== undefined) {
      const pn = (body.phoneNumber ?? "").trim();
      updates.phone_number = pn || null;
    }
    if (body.address !== undefined) {
      const ad = (body.address ?? "").trim();
      updates.address = ad || null;
    }
    if (body.birthday !== undefined) {
      const b = (body.birthday ?? "").trim();
      if (b && !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
        return Response.json(
          { error: "Birthday must be YYYY-MM-DD." },
          { status: 400 }
        );
      }
      updates.birthday = b || null;
    }
    if (body.nickname !== undefined) {
      const v = (body.nickname ?? "").trim();
      updates.nickname = v || null;
    }
    if (body.bio !== undefined) {
      const v = (body.bio ?? "").trim();
      updates.bio = v || null;
    }
    if (body.favoriteFood !== undefined) {
      const v = (body.favoriteFood ?? "").trim();
      updates.favorite_food = v || null;
    }
    if (body.faithNotes !== undefined) {
      const v = (body.faithNotes ?? "").trim();
      updates.faith_notes = v || null;
    }
    if (body.prayerIntentions !== undefined) {
      const v = (body.prayerIntentions ?? "").trim();
      updates.prayer_intentions = v || null;
    }
    if (body.pronouns !== undefined) {
      const v = (body.pronouns ?? "").trim();
      updates.pronouns = v || null;
    }
    if (body.hometown !== undefined) {
      const v = (body.hometown ?? "").trim();
      updates.hometown = v || null;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ success: true, updated: false });
    }

    const updateResponse = await supabase
      .from("family_memberships")
      .update(updates)
      .eq("id", membershipId)
      .eq("family_circle_id", family.circle.id);
    if (updateResponse.error) {
      return Response.json(
        { error: updateResponse.error.message },
        { status: 400 }
      );
    }

    await supabase.from("family_activity").insert({
      family_circle_id: family.circle.id,
      actor_membership_id: family.membership.id,
      activity_type: "member_updated",
      summary: `Family details were refreshed.`,
    });

    return Response.json({ success: true, updated: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
