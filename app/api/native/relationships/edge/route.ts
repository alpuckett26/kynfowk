import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

const VALID_KINDS = new Set([
  "parent",
  "child",
  "spouse",
  "sibling",
  "grandparent",
  "grandchild",
  "in_law",
  "step_parent",
  "step_child",
  "guardian",
  "ward",
  "partner",
  "other",
]);

type Body = {
  sourceMembershipId?: string;
  targetMembershipId?: string;
  kind?: string;
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
        { error: "Only the family circle owner can edit relationships." },
        { status: 403 }
      );
    }

    const source = (body.sourceMembershipId ?? "").trim();
    const target = (body.targetMembershipId ?? "").trim();
    const kind = (body.kind ?? "").trim();
    if (!source || !target || !VALID_KINDS.has(kind)) {
      return Response.json(
        { error: "source, target, and valid kind required." },
        { status: 400 }
      );
    }
    if (source === target) {
      return Response.json(
        { error: "Source and target must be different members." },
        { status: 400 }
      );
    }

    // Confirm both belong to the viewer's circle.
    const checkResponse = await supabase
      .from("family_memberships")
      .select("id")
      .eq("family_circle_id", family.circle.id)
      .in("id", [source, target]);
    if ((checkResponse.data ?? []).length !== 2) {
      return Response.json(
        { error: "Both members must belong to your family circle." },
        { status: 400 }
      );
    }

    const insertResponse = await supabase
      .from("relationship_edges")
      .insert({
        family_circle_id: family.circle.id,
        source_membership_id: source,
        target_membership_id: target,
        kind,
        notes: (body.notes ?? "").trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (insertResponse.error) {
      const lower = insertResponse.error.message.toLowerCase();
      if (lower.includes("duplicate") || lower.includes("unique")) {
        return Response.json(
          { error: "That relationship already exists." },
          { status: 409 }
        );
      }
      return Response.json(
        { error: insertResponse.error.message },
        { status: 400 }
      );
    }

    return Response.json({ success: true, id: insertResponse.data.id });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
