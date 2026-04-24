// Server-side wrappers around the shared @kynfowk/connections package.
// Pages call these directly without needing to know about Supabase env config
// or demo-mode fallbacks — both are handled here.

import {
  getFamilyMetrics as _getFamilyMetrics,
  getCallSummary as _getCallSummary,
  getAllTimeStats as _getAllTimeStats,
} from "@kynfowk/connections";
import type {
  CallSummaryMetrics,
  AllTimeStats,
} from "@kynfowk/connections";
import type { ConnectionMetrics } from "@kynfowk/types";
import { createClient } from "@/lib/supabase/server";

// Re-export the shared types so pages can `import { CallSummaryMetrics } from "@/lib/connections"`.
export type { CallSummaryMetrics, AllTimeStats };

// ─── Demo-mode fallbacks ────────────────────────────────────────────────────
// Returned when NEXT_PUBLIC_SUPABASE_URL is unset (local dev / preview without
// a live backend) or when a Supabase query throws. Lets every page render
// believable data without per-page boilerplate.

const DEMO_METRICS: ConnectionMetrics = {
  completedCalls: 3,
  totalMinutes: 122,
  uniqueMembersThisWeek: 4,
  streakWeeks: 4,
  connectionScore: 28,
  firstReconnections: 1,
  elderCalls: 2,
};

const DEMO_ALL_TIME: AllTimeStats = {
  totalCalls: 47,
  totalMinutes: 2340,
  totalScore: 210,
  bestWeekScore: 28,
  longestStreak: 8,
};

const DEMO_CALL_SUMMARY: CallSummaryMetrics = {
  durationMinutes: 45,
  participantCount: 4,
  scoreEarned: 5,
  events: [
    "Connection made",
    "Quality time (10+ min)",
    "Group connection (3+ members)",
    "Elder included",
  ],
};

/** Sentinel callId that always returns the demo summary, even with a live DB. */
export const DEMO_CALL_ID = "demo-call-id";

function isDemoMode() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

// ─── Public wrappers ────────────────────────────────────────────────────────

export async function getFamilyMetrics(
  familyId: string
): Promise<ConnectionMetrics> {
  if (isDemoMode()) return DEMO_METRICS;
  try {
    return await _getFamilyMetrics(createClient(), familyId);
  } catch {
    return DEMO_METRICS;
  }
}

export async function getAllTimeStats(
  familyId: string
): Promise<AllTimeStats> {
  if (isDemoMode()) return DEMO_ALL_TIME;
  try {
    return await _getAllTimeStats(createClient(), familyId);
  } catch {
    return DEMO_ALL_TIME;
  }
}

export async function getCallSummary(
  callId: string
): Promise<CallSummaryMetrics> {
  if (isDemoMode() || callId === DEMO_CALL_ID) return DEMO_CALL_SUMMARY;
  try {
    return await _getCallSummary(createClient(), callId);
  } catch {
    return DEMO_CALL_SUMMARY;
  }
}
