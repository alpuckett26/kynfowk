// ─── Database row types ────────────────────────────────────────────────────

export type CallStatus = "scheduled" | "in_progress" | "completed" | "missed";

export interface Family {
  id: string;
  name: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  display_name: string;
  email: string;
  is_elder: boolean;
  avatar_url: string | null;
  created_at: string;
}

export interface Call {
  id: string;
  family_id: string;
  title: string | null;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  status: CallStatus;
  participant_count: number | null;
  created_at: string;
}

export interface CallParticipant {
  id: string;
  call_id: string;
  member_id: string;
  joined_at: string;
  left_at: string | null;
}

export interface ConnectionEvent {
  id: string;
  family_id: string;
  call_id: string;
  member_id: string;
  event_type:
    | "call_completed"
    | "long_call"
    | "group_call"
    | "reconnection"
    | "elder_call";
  score_delta: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface FamilyConnectionStats {
  family_id: string;
  week_start: string;
  completed_calls: number;
  total_minutes: number;
  unique_members_connected: number;
  connection_score: number;
  streak_weeks: number;
  updated_at: string;
}

// ─── UI / derived types ────────────────────────────────────────────────────

export interface ConnectionMetrics {
  completedCalls: number;
  totalMinutes: number;
  uniqueMembersThisWeek: number;
  streakWeeks: number;
  connectionScore: number;
  firstReconnections: number;
  elderCalls: number;
}

export interface WeeklyMetricDelta {
  value: number;
  delta: number | null; // vs previous week
  trend: "up" | "down" | "neutral";
}

// ─── Case Studies ──────────────────────────────────────────────────────────

export interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  familyType: string;
  familyLabel: string;
  problem: string;
  howTheyUsed: string;
  measuredOutcome: string;
  emotionalOutcome: string;
  quote: string;
  quoteName: string;
  quoteRelation: string;
  tags: string[];
  accentColor: string;
  iconEmoji: string;
}
