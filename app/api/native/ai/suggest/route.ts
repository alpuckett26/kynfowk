import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { getAICallSuggestion, type AISuggestionInput } from "@/lib/ai-suggestions";

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Not a member of any family circle." },
        { status: 403 }
      );
    }

    const [membersResponse, callsResponse] = await Promise.all([
      supabase
        .from("family_memberships")
        .select("id, display_name, relationship_label, status")
        .eq("family_circle_id", family.circle.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("call_sessions")
        .select("id, scheduled_start, actual_duration_minutes")
        .eq("family_circle_id", family.circle.id)
        .eq("status", "completed")
        .order("scheduled_start", { ascending: false })
        .limit(10),
    ]);

    const callIds = (callsResponse.data ?? []).map((c) => c.id);
    const participantsResponse = callIds.length
      ? await supabase
          .from("call_participants")
          .select("membership_id, call_session_id, attended")
          .in("call_session_id", callIds)
      : { data: [] };

    const participantsByCall = new Map<
      string,
      Array<{ membership_id: string; attended: boolean | null }>
    >();
    for (const row of (participantsResponse.data ?? []) as Array<{
      membership_id: string;
      call_session_id: string;
      attended: boolean | null;
    }>) {
      const list = participantsByCall.get(row.call_session_id) ?? [];
      list.push({ membership_id: row.membership_id, attended: row.attended });
      participantsByCall.set(row.call_session_id, list);
    }

    const input: AISuggestionInput = {
      viewerMembershipId: family.membership.id,
      members: (membersResponse.data ?? []) as AISuggestionInput["members"],
      completedCalls: (callsResponse.data ?? []).map((c) => ({
        id: c.id,
        scheduled_start: c.scheduled_start,
        actual_duration_minutes: c.actual_duration_minutes,
        participants: participantsByCall.get(c.id) ?? [],
      })),
    };

    const suggestion = await getAICallSuggestion(input);
    if (!suggestion) {
      return Response.json({ suggestion: null });
    }

    const nameById = new Map(
      ((membersResponse.data ?? []) as Array<{ id: string; display_name: string }>)
        .map((m) => [m.id, m.display_name])
    );
    const participantNames = suggestion.participantIds
      .map((id) => nameById.get(id))
      .filter((n): n is string => Boolean(n));

    return Response.json({
      suggestion: {
        focus: suggestion.focus,
        reason: suggestion.reason,
        participantIds: suggestion.participantIds,
        participantNames,
        isAI: suggestion.isAI,
      },
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
