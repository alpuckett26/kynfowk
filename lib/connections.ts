import { createClient } from "@/lib/supabase/server";
import type { ConnectionMetrics, FamilyConnectionStats } from "@/lib/types";
import { getWeekStart } from "@/lib/utils";

// ─── Fetch current-week metrics for a family ─────────────────────────────────

export async function getFamilyMetrics(
  familyId: string
): Promise<ConnectionMetrics> {
  const supabase = createClient();
  const weekStart = getWeekStart().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("family_connection_stats")
    .select("*")
    .eq("family_id", familyId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) {
    console.error("getFamilyMetrics error:", error);
  }

  const row = data as FamilyConnectionStats | null;

  // Also count reconnections and elder calls this week
  const { data: events } = await supabase
    .from("connection_events")
    .select("event_type")
    .eq("family_id", familyId)
    .gte("created_at", new Date(weekStart).toISOString());

  const evtList = (events ?? []) as { event_type: string }[];
  const firstReconnections = evtList.filter(
    (e) => e.event_type === "reconnection"
  ).length;
  const elderCalls = evtList.filter(
    (e) => e.event_type === "elder_call"
  ).length;

  return {
    completedCalls: row?.completed_calls ?? 0,
    totalMinutes: row?.total_minutes ?? 0,
    uniqueMembersThisWeek: row?.unique_members_connected ?? 0,
    streakWeeks: row?.streak_weeks ?? 0,
    connectionScore: row?.connection_score ?? 0,
    firstReconnections,
    elderCalls,
  };
}

// ─── Fetch metrics for a specific call (post-call summary) ───────────────────

export interface CallSummaryMetrics {
  durationMinutes: number;
  participantCount: number;
  scoreEarned: number;
  events: string[];
}

export async function getCallSummary(
  callId: string
): Promise<CallSummaryMetrics> {
  const supabase = createClient();

  const { data: call } = await supabase
    .from("calls")
    .select("duration_seconds, participant_count")
    .eq("id", callId)
    .maybeSingle();

  const { data: events } = await supabase
    .from("connection_events")
    .select("event_type, score_delta")
    .eq("call_id", callId);

  const evtList = (events ?? []) as {
    event_type: string;
    score_delta: number;
  }[];

  // Deduplicate events across participants (one label per event type)
  const seen = new Set<string>();
  const deduped = evtList.filter((e) => {
    if (seen.has(e.event_type)) return false;
    seen.add(e.event_type);
    return true;
  });

  const scoreEarned = evtList.reduce((sum, e) => sum + e.score_delta, 0);

  const eventLabels: Record<string, string> = {
    call_completed: "Connection made",
    long_call: "Quality time (10+ min)",
    group_call: "Group connection (3+ members)",
    reconnection: "Reconnection after a long time",
    elder_call: "Elder included",
  };

  return {
    durationMinutes: Math.floor((call?.duration_seconds ?? 0) / 60),
    participantCount: call?.participant_count ?? 0,
    scoreEarned,
    events: deduped.map((e) => eventLabels[e.event_type] ?? e.event_type),
  };
}

// ─── All-time family stats ────────────────────────────────────────────────────

export interface AllTimeStats {
  totalCalls: number;
  totalMinutes: number;
  totalScore: number;
  bestWeekScore: number;
  longestStreak: number;
}

export async function getAllTimeStats(familyId: string): Promise<AllTimeStats> {
  const supabase = createClient();

  const { data } = await supabase
    .from("family_connection_stats")
    .select("completed_calls, total_minutes, connection_score, streak_weeks")
    .eq("family_id", familyId);

  const rows = (data ?? []) as {
    completed_calls: number;
    total_minutes: number;
    connection_score: number;
    streak_weeks: number;
  }[];

  return {
    totalCalls: rows.reduce((s, r) => s + r.completed_calls, 0),
    totalMinutes: rows.reduce((s, r) => s + r.total_minutes, 0),
    totalScore: rows.reduce((s, r) => s + r.connection_score, 0),
    bestWeekScore: rows.reduce((m, r) => Math.max(m, r.connection_score), 0),
    longestStreak: rows.reduce((m, r) => Math.max(m, r.streak_weeks), 0),
  };
}
