import Anthropic from "@anthropic-ai/sdk";

import { classifyRelationship } from "./relationship-classifier";
import { createSupabaseServerClient } from "./supabase/server";

export interface AISuggestion {
  participantIds: string[];
  focus: string;
  reason: string;
}

export interface AISuggestionInput {
  viewerMembershipId: string;
  members: Array<{
    id: string;
    display_name: string;
    relationship_label: string | null;
    status: string;
  }>;
  completedCalls: Array<{
    id: string;
    scheduled_start: string;
    actual_duration_minutes: number | null;
    participants: Array<{ membership_id: string; attended: boolean | null }>;
  }>;
}

export async function getAISuggestionInput(userId: string): Promise<AISuggestionInput | null> {
  const supabase = await createSupabaseServerClient();

  const viewerResponse = await supabase
    .from("family_memberships")
    .select("id, family_circle_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!viewerResponse.data) return null;
  const circleId = viewerResponse.data.family_circle_id;
  const viewerMembershipId = viewerResponse.data.id;

  const [membersResponse, callsResponse] = await Promise.all([
    supabase
      .from("family_memberships")
      .select("id, display_name, relationship_label, status")
      .eq("family_circle_id", circleId)
      .order("created_at", { ascending: true }),
    supabase
      .from("call_sessions")
      .select("id, scheduled_start, actual_duration_minutes")
      .eq("family_circle_id", circleId)
      .eq("status", "completed")
      .order("scheduled_start", { ascending: false })
      .limit(10)
  ]);

  const callIds = (callsResponse.data ?? []).map((c) => c.id);
  const participantsResponse = callIds.length
    ? await supabase
        .from("call_participants")
        .select("membership_id, call_session_id, attended")
        .in("call_session_id", callIds)
    : { data: [] as { membership_id: string; call_session_id: string; attended: boolean | null }[] };

  const participantsByCall = new Map<
    string,
    Array<{ membership_id: string; attended: boolean | null }>
  >();
  for (const p of participantsResponse.data ?? []) {
    const list = participantsByCall.get(p.call_session_id) ?? [];
    list.push(p);
    participantsByCall.set(p.call_session_id, list);
  }

  return {
    viewerMembershipId,
    members: (membersResponse.data ?? []) as AISuggestionInput["members"],
    completedCalls: (callsResponse.data ?? []).map((c) => ({
      ...c,
      participants: participantsByCall.get(c.id) ?? []
    }))
  };
}

export async function getAICallSuggestion(
  input: AISuggestionInput
): Promise<AISuggestion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const now = new Date();
  const activeMembers = input.members.filter(
    (m) => m.status === "active" && m.id !== input.viewerMembershipId
  );
  if (activeMembers.length === 0) return null;

  // Last attended call date per member
  const lastCallDate = new Map<string, string>();
  for (const call of input.completedCalls) {
    for (const p of call.participants) {
      if (p.attended) {
        const existing = lastCallDate.get(p.membership_id);
        if (!existing || call.scheduled_start > existing) {
          lastCallDate.set(p.membership_id, call.scheduled_start);
        }
      }
    }
  }

  const memberContext = activeMembers.map((m) => {
    const cls = classifyRelationship(m.relationship_label);
    const lastCall = lastCallDate.get(m.id);
    const daysSince = lastCall
      ? Math.floor((now.getTime() - new Date(lastCall).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: m.id,
      name: m.display_name,
      relationship: m.relationship_label ?? "Family member",
      tier: cls.tier,
      generation: cls.generation,
      days_since_last_call: daysSince ?? "never called"
    };
  });

  const prompt = `You are a warm family connection advisor. Suggest which family members to include on the next call.

Family members (from the organizer's perspective):
${JSON.stringify(memberContext, null, 2)}

Rules:
- Prioritise immediate-tier (parents, siblings, spouse, children) who haven't called recently
- Highlight cross-generational gaps (grandparent ↔ grandchild not connected in 30+ days)
- Suggest 2–4 people for a focused call; include everyone if ≤4 active members
- Be warm and specific — use real first names and relationships

Respond with JSON only, no markdown fences:
{
  "participant_ids": ["id1", "id2"],
  "focus": "Short headline, max 8 words",
  "reason": "1-2 warm sentences using real names and relationships explaining why now."
}`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages: [{ role: "user", content: prompt }]
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      participantIds: Array.isArray(parsed.participant_ids) ? parsed.participant_ids : [],
      focus: typeof parsed.focus === "string" ? parsed.focus : "Suggested connection",
      reason: typeof parsed.reason === "string" ? parsed.reason : ""
    };
  } catch {
    return null;
  }
}
