import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

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
  "cousin",
  "aunt",
  "uncle",
  "niece",
  "nephew",
  "great_grandparent",
  "great_grandchild",
]);

type CreateBody = {
  sourceMembershipId?: string;
  targetMembershipId?: string;
  kind?: string;
};

export async function GET(request: Request) {
  try {
    const { supabase } = await authenticateNativeRequest(request);

    const linksResponse = await supabase
      .from("cross_circle_kin_links")
      .select(
        "id, source_membership_id, target_membership_id, kind, status, created_at, approved_at"
      )
      .order("created_at", { ascending: false });

    const ids = new Set<string>();
    for (const row of (linksResponse.data ?? []) as Array<{
      source_membership_id: string;
      target_membership_id: string;
    }>) {
      ids.add(row.source_membership_id);
      ids.add(row.target_membership_id);
    }
    const membersResponse = ids.size
      ? await supabase
          .from("family_memberships")
          .select(
            "id, display_name, family_circle_id, family_circles(name), is_minor, managed_by_membership_id"
          )
          .in("id", Array.from(ids))
      : { data: [] };

    return Response.json({
      links: linksResponse.data ?? [],
      members: (membersResponse.data ?? []).map(
        (m: {
          id: string;
          display_name: string;
          family_circle_id: string;
          family_circles:
            | { name: string }
            | { name: string }[]
            | null;
          is_minor: boolean;
          managed_by_membership_id: string | null;
        }) => ({
          id: m.id,
          displayName: m.display_name,
          familyCircleId: m.family_circle_id,
          familyCircleName: Array.isArray(m.family_circles)
            ? m.family_circles[0]?.name
            : m.family_circles?.name ?? "Family",
          isMinor: m.is_minor,
          managedByMembershipId: m.managed_by_membership_id,
        })
      ),
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as CreateBody;

    const sourceId = (body.sourceMembershipId ?? "").trim();
    const targetId = (body.targetMembershipId ?? "").trim();
    const kind = (body.kind ?? "").trim();
    if (!sourceId || !targetId || !VALID_KINDS.has(kind)) {
      return Response.json(
        { error: "source, target, and valid kind required." },
        { status: 400 }
      );
    }
    if (sourceId === targetId) {
      return Response.json(
        { error: "Source and target must differ." },
        { status: 400 }
      );
    }

    // Caller must be the owner of the source membership's family circle.
    const sourceResponse = await supabase
      .from("family_memberships")
      .select("id, family_circle_id, family_circles(created_by)")
      .eq("id", sourceId)
      .maybeSingle();
    const sourceRow = sourceResponse.data as
      | {
          id: string;
          family_circle_id: string;
          family_circles:
            | { created_by: string }
            | { created_by: string }[]
            | null;
        }
      | null;
    if (!sourceRow) {
      return Response.json(
        { error: "Source membership not found." },
        { status: 404 }
      );
    }
    const sourceOwner = Array.isArray(sourceRow.family_circles)
      ? sourceRow.family_circles[0]?.created_by
      : sourceRow.family_circles?.created_by;
    if (sourceOwner !== user.id) {
      return Response.json(
        { error: "Only the source circle's owner can request a link." },
        { status: 403 }
      );
    }

    // Disallow same-circle source/target — that's M16 territory.
    const targetResponse = await supabase
      .from("family_memberships")
      .select("family_circle_id")
      .eq("id", targetId)
      .maybeSingle();
    const targetRow = targetResponse.data as
      | { family_circle_id: string }
      | null;
    if (!targetRow) {
      return Response.json(
        { error: "Target membership not found." },
        { status: 404 }
      );
    }
    if (targetRow.family_circle_id === sourceRow.family_circle_id) {
      return Response.json(
        {
          error:
            "Source and target are in the same circle — use the in-circle relationship instead.",
        },
        { status: 400 }
      );
    }

    const insertResponse = await supabase
      .from("cross_circle_kin_links")
      .insert({
        source_membership_id: sourceId,
        target_membership_id: targetId,
        kind,
        status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (insertResponse.error || !insertResponse.data) {
      const lower = insertResponse.error?.message.toLowerCase() ?? "";
      if (lower.includes("duplicate")) {
        return Response.json(
          { error: "That link already exists." },
          { status: 409 }
        );
      }
      return Response.json(
        { error: insertResponse.error?.message ?? "Couldn't create link." },
        { status: 400 }
      );
    }

    return Response.json({ success: true, id: insertResponse.data.id });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
