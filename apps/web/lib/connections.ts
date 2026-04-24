// Server-side wrappers around the shared @kynfowk/connections package.
// Pages call these directly without needing to know about Supabase env config,
// auth state, or demo-mode fallbacks — all are handled here.

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

/** A scheduled call surfaced on the dashboard. Web-side shape only —
 * the schema's `calls` row has more, but the dashboard only needs these. */
export type UpcomingCall = {
  id: string;
  title: string;
  /** ISO timestamp. */
  scheduledAt: string;
};

// ─── Demo-mode fallbacks ────────────────────────────────────────────────────
// Returned when NEXT_PUBLIC_SUPABASE_URL is unset, the user is not signed in,
// or a Supabase query throws. Lets every page render believable data without
// per-page boilerplate.

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

const DEMO_FAMILY_NAME = "Henderson";

/** Sentinel callId that always returns the demo summary, even with a live DB. */
export const DEMO_CALL_ID = "demo-call-id";

function demoUpcoming(): UpcomingCall[] {
  // Anchored relative to "now" so the demo data never looks stale.
  const day = (offsetDays: number, hour: number, min = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };
  return [
    { id: DEMO_CALL_ID, title: "Sunday catch-up", scheduledAt: day(3, 18) },
    { id: DEMO_CALL_ID, title: "Check-in with Gran", scheduledAt: day(6, 11) },
  ];
}

function isDemoMode() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

// ─── Session / family resolution ────────────────────────────────────────────

export type CurrentFamily = {
  id: string;
  name: string;
  /** True when the page is rendering with the signed-in user's real family. */
  signedIn: true;
} | {
  id: null;
  name: string;
  /** True when no session — pages should render demo content. */
  signedIn: false;
};

/**
 * Resolves the family for the current request. Returns signedIn:false when
 * env vars are missing, no user is signed in, or no family_member is linked.
 * Used by pages to render the right family name and decide whether to show
 * "sign in" prompts.
 */
export async function getCurrentFamily(): Promise<CurrentFamily> {
  if (isDemoMode()) {
    return { id: null, name: DEMO_FAMILY_NAME, signedIn: false };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { id: null, name: DEMO_FAMILY_NAME, signedIn: false };
  }

  const { data } = await supabase
    .from("family_members")
    .select("family_id, families(name)")
    .eq("user_id", user.id)
    .maybeSingle<{ family_id: string; families: { name: string } | null }>();

  if (!data?.family_id) {
    return { id: null, name: DEMO_FAMILY_NAME, signedIn: false };
  }

  return {
    id: data.family_id,
    name: data.families?.name ?? "Your Family",
    signedIn: true,
  };
}

// ─── Public wrappers ────────────────────────────────────────────────────────

export async function getFamilyMetrics(): Promise<ConnectionMetrics> {
  const family = await getCurrentFamily();
  if (!family.signedIn) return DEMO_METRICS;
  try {
    return await _getFamilyMetrics(createClient(), family.id);
  } catch {
    return DEMO_METRICS;
  }
}

export async function getAllTimeStats(): Promise<AllTimeStats> {
  const family = await getCurrentFamily();
  if (!family.signedIn) return DEMO_ALL_TIME;
  try {
    return await _getAllTimeStats(createClient(), family.id);
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

/**
 * Upcoming scheduled calls for the current user's family. Returns demo
 * data when not signed in. Limit 5 for the dashboard surface.
 */
export async function getUpcomingCalls(): Promise<UpcomingCall[]> {
  const family = await getCurrentFamily();
  if (!family.signedIn) return demoUpcoming();

  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("calls")
      .select("id, title, scheduled_at")
      .eq("family_id", family.id)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5);

    const rows = (data ?? []) as {
      id: string;
      title: string | null;
      scheduled_at: string;
    }[];

    return rows.map((c) => ({
      id: c.id,
      title: c.title ?? "Family call",
      scheduledAt: c.scheduled_at,
    }));
  } catch {
    return [];
  }
}
