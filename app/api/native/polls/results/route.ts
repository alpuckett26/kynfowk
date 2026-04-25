import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family) {
      return Response.json({ error: "Not part of a family circle" }, { status: 403 });
    }

    const [pollsRes, responsesRes, membersRes] = await Promise.all([
      supabase
        .from("family_polls")
        .select("id, question, option_a, option_b, emoji_a, emoji_b, category")
        .order("created_at", { ascending: true }),
      supabase
        .from("family_poll_responses")
        .select("poll_id, membership_id, choice")
        .eq("family_circle_id", family.circle.id),
      supabase
        .from("family_memberships")
        .select("id, display_name")
        .eq("family_circle_id", family.circle.id)
        .eq("status", "active"),
    ]);

    const polls = pollsRes.data ?? [];
    const responses = responsesRes.data ?? [];
    const members = membersRes.data ?? [];
    const nameMap = new Map(members.map((m) => [m.id, m.display_name]));

    const results = polls
      .map((poll) => {
        const pollResponses = responses.filter((r) => r.poll_id === poll.id);
        if (pollResponses.length === 0) return null;
        const viewer = pollResponses.find((r) => r.membership_id === family.membership.id);
        return {
          ...poll,
          count_a: pollResponses.filter((r) => r.choice === "a").length,
          count_b: pollResponses.filter((r) => r.choice === "b").length,
          viewer_choice: (viewer?.choice ?? null) as "a" | "b" | null,
          responses: pollResponses.map((r) => ({
            displayName: nameMap.get(r.membership_id) ?? "Family member",
            choice: r.choice as "a" | "b",
          })),
        };
      })
      .filter(Boolean);

    return Response.json({ results });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
