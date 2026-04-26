import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

const KINDS = new Set(["memory", "open_text", "photo_request"]);

type Body = {
  kind?: string;
  promptText?: string;
};

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family) {
      return Response.json({ needsOnboarding: true }, { status: 200 });
    }

    const promptsResponse = await supabase
      .from("family_prompts")
      .select(
        "id, kind, prompt_text, created_at, closed_at, created_by_membership_id"
      )
      .eq("family_circle_id", family.circle.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const promptIds = (promptsResponse.data ?? []).map((p) => p.id);
    const responsesResponse = promptIds.length
      ? await supabase
          .from("family_prompt_responses")
          .select(
            "id, prompt_id, membership_id, text_response, photo_url, created_at"
          )
          .in("prompt_id", promptIds)
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

    const responsesByPrompt = new Map<
      string,
      Array<{
        id: string;
        membershipId: string;
        displayName: string;
        textResponse: string | null;
        photoUrl: string | null;
        createdAt: string;
      }>
    >();
    for (const r of (responsesResponse.data ?? []) as Array<{
      id: string;
      prompt_id: string;
      membership_id: string;
      text_response: string | null;
      photo_url: string | null;
      created_at: string;
    }>) {
      const list = responsesByPrompt.get(r.prompt_id) ?? [];
      list.push({
        id: r.id,
        membershipId: r.membership_id,
        displayName: memberMap.get(r.membership_id) ?? "Family",
        textResponse: r.text_response,
        photoUrl: r.photo_url,
        createdAt: r.created_at,
      });
      responsesByPrompt.set(r.prompt_id, list);
    }

    return Response.json({
      needsOnboarding: false,
      viewerMembershipId: family.membership.id,
      viewerRole: family.membership.role,
      prompts: (promptsResponse.data ?? []).map((p) => ({
        id: p.id,
        kind: p.kind,
        promptText: p.prompt_text,
        createdAt: p.created_at,
        closedAt: p.closed_at,
        createdByMembershipId: p.created_by_membership_id,
        responses: responsesByPrompt.get(p.id) ?? [],
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
    if (
      !family ||
      family.membership.status !== "active" ||
      family.membership.role !== "owner"
    ) {
      return Response.json(
        { error: "Only the family circle owner can add prompts." },
        { status: 403 }
      );
    }

    const kind = (body.kind ?? "").trim();
    const promptText = (body.promptText ?? "").trim();
    if (!KINDS.has(kind)) {
      return Response.json(
        { error: "kind must be memory, open_text, or photo_request." },
        { status: 400 }
      );
    }
    if (!promptText) {
      return Response.json(
        { error: "Prompt text is required." },
        { status: 400 }
      );
    }

    const insertResponse = await supabase
      .from("family_prompts")
      .insert({
        family_circle_id: family.circle.id,
        kind,
        prompt_text: promptText,
        created_by_membership_id: family.membership.id,
      })
      .select("id")
      .single();
    if (insertResponse.error || !insertResponse.data) {
      return Response.json(
        { error: insertResponse.error?.message ?? "Couldn't add prompt." },
        { status: 400 }
      );
    }

    return Response.json({ success: true, id: insertResponse.data.id });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
