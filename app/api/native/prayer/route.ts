import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = { body?: string };

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family) {
      return Response.json({ needsOnboarding: true }, { status: 200 });
    }

    const intentionsResponse = await supabase
      .from("prayer_intentions")
      .select(
        "id, body, status, created_at, author_membership_id"
      )
      .eq("family_circle_id", family.circle.id)
      .order("created_at", { ascending: false })
      .limit(60);

    const intentionIds = (intentionsResponse.data ?? []).map((i) => i.id);
    const responsesResponse = intentionIds.length
      ? await supabase
          .from("prayer_responses")
          .select("id, intention_id, membership_id, message, created_at")
          .in("intention_id", intentionIds)
          .order("created_at", { ascending: true })
      : { data: [] };

    const memberMap = new Map<string, string>();
    const memberRows = await supabase
      .from("family_memberships")
      .select("id, display_name")
      .eq("family_circle_id", family.circle.id);
    for (const m of memberRows.data ?? []) {
      memberMap.set(m.id, m.display_name);
    }

    const respByIntent = new Map<
      string,
      Array<{
        id: string;
        membershipId: string;
        displayName: string;
        message: string | null;
        createdAt: string;
      }>
    >();
    for (const r of (responsesResponse.data ?? []) as Array<{
      id: string;
      intention_id: string;
      membership_id: string;
      message: string | null;
      created_at: string;
    }>) {
      const list = respByIntent.get(r.intention_id) ?? [];
      list.push({
        id: r.id,
        membershipId: r.membership_id,
        displayName: memberMap.get(r.membership_id) ?? "Family",
        message: r.message,
        createdAt: r.created_at,
      });
      respByIntent.set(r.intention_id, list);
    }

    return Response.json({
      needsOnboarding: false,
      viewerMembershipId: family.membership.id,
      intentions: (intentionsResponse.data ?? []).map((i) => ({
        id: i.id,
        body: i.body,
        status: i.status,
        createdAt: i.created_at,
        authorMembershipId: i.author_membership_id,
        authorDisplayName: memberMap.get(i.author_membership_id) ?? "Family",
        responses: respByIntent.get(i.id) ?? [],
      })),
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Only active members can post intentions." },
        { status: 403 }
      );
    }

    const text = (body.body ?? "").trim();
    if (!text) {
      return Response.json(
        { error: "Intention text is required." },
        { status: 400 }
      );
    }

    const insertResponse = await supabase
      .from("prayer_intentions")
      .insert({
        family_circle_id: family.circle.id,
        author_membership_id: family.membership.id,
        body: text,
      })
      .select("id")
      .single();
    if (insertResponse.error || !insertResponse.data) {
      return Response.json(
        { error: insertResponse.error?.message ?? "Couldn't post." },
        { status: 400 }
      );
    }

    return Response.json({ success: true, id: insertResponse.data.id });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
