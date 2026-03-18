import Anthropic from "@anthropic-ai/sdk";

import { classifyRelationship } from "./relationship-classifier";
import { createSupabaseServerClient } from "./supabase/server";

export interface AISuggestion {
  participantIds: string[];
  focus: string;
  reason: string;
  isAI: boolean; // false = data-driven fallback, no Claude call
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
  try {
    const supabase = await createSupabaseServerClient();

    const viewerResponse = await supabase
      .from("family_memberships")
      .select("id, family_circle_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (viewerResponse.error) {
      console.error("[AI] viewer fetch error:", viewerResponse.error.message);
      return null;
    }
    if (!viewerResponse.data) {
      console.error("[AI] no active membership found for user", userId);
      return null;
    }

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

    if (membersResponse.error) console.error("[AI] members fetch error:", membersResponse.error.message);
    if (callsResponse.error) console.error("[AI] calls fetch error:", callsResponse.error.message);

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
  } catch (err) {
    console.error("[AI] getAISuggestionInput threw:", err);
    return null;
  }
}

// Build a data-driven fallback suggestion without calling Claude
function buildFallbackSuggestion(input: AISuggestionInput): AISuggestion | null {
  const now = new Date();
  const activeMembers = input.members.filter(
    (m) => m.status === "active" && m.id !== input.viewerMembershipId
  );
  if (activeMembers.length === 0) return null;

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

  // Sort by longest gap first, then by tier (immediate first)
  const tierOrder: Record<string, number> = { immediate: 0, secondary: 1, extended: 2, other: 3 };
  const sorted = [...activeMembers].sort((a, b) => {
    const aLast = lastCallDate.get(a.id);
    const bLast = lastCallDate.get(b.id);
    const aDays = aLast ? (now.getTime() - new Date(aLast).getTime()) / 86400000 : 9999;
    const bDays = bLast ? (now.getTime() - new Date(bLast).getTime()) / 86400000 : 9999;
    if (Math.abs(aDays - bDays) > 5) return bDays - aDays;
    const aTier = tierOrder[classifyRelationship(a.relationship_label).tier] ?? 3;
    const bTier = tierOrder[classifyRelationship(b.relationship_label).tier] ?? 3;
    return aTier - bTier;
  });

  const pick = sorted.slice(0, Math.min(3, sorted.length));
  const lastName = lastCallDate.get(sorted[0].id);
  const daysSince = lastName
    ? Math.floor((now.getTime() - new Date(lastName).getTime()) / 86400000)
    : null;

  const rel = sorted[0].relationship_label ?? "family member";
  const reason = daysSince != null
    ? `${sorted[0].display_name} (${rel}) was last on a call ${daysSince} day${daysSince === 1 ? "" : "s"} ago — a good time to reconnect.`
    : `${sorted[0].display_name} hasn't been on a call yet — now's a great time to start.`;

  return {
    participantIds: pick.map((m) => m.id),
    focus: daysSince != null ? "Time to reconnect" : "First call together",
    reason,
    isAI: false
  };
}

export async function getAICallSuggestion(
  input: AISuggestionInput
): Promise<AISuggestion | null> {
  const activeMembers = input.members.filter(
    (m) => m.status === "active" && m.id !== input.viewerMembershipId
  );
  if (activeMembers.length === 0) return null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[AI] ANTHROPIC_API_KEY not set — using fallback");
    return buildFallbackSuggestion(input);
  }

  const now = new Date();
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
      days_since_last_call: daysSince ?? "never"
    };
  });

  const prompt = `You are a warm family connection advisor. Suggest which family members to include on the next call.

Family members:
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

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages: [{ role: "user", content: prompt }]
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    console.log("[AI] raw response:", raw);
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed.participant_ids) || !parsed.reason) {
      throw new Error("unexpected shape: " + JSON.stringify(parsed));
    }

    return {
      participantIds: parsed.participant_ids,
      focus: typeof parsed.focus === "string" ? parsed.focus : "Suggested connection",
      reason: parsed.reason,
      isAI: true
    };
  } catch (err) {
    console.error("[AI] Claude call failed, using fallback:", err);
    return buildFallbackSuggestion(input);
  }
}
