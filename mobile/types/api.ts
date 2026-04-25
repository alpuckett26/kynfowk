/**
 * Hand-typed mirror of the JSON shapes returned by /api/native/* on the
 * web app. These must stay in sync with lib/data.ts and lib/types.ts on
 * the web side. Keep this file the single source of truth for native
 * API shapes — every response type lives here.
 */

export type CallStatus = "scheduled" | "live" | "completed" | "canceled";
export type ReminderStatus = "pending" | "sent" | "not_needed";

export type NotificationType =
  | "call_scheduled"
  | "reminder_24h_before"
  | "reminder_15m_before"
  | "starting_now"
  | "missing_join_link_warning"
  | "call_passed_without_completion"
  | "invite_claimed"
  | "recap_posted"
  | "weekly_connection_digest";

export interface Suggestion {
  start_at: string;
  end_at: string;
  duration_minutes: number;
  participant_count: number;
  participant_names: string[];
  participant_ids: string[];
  overlap_strength_label: string;
  coverage: number;
  label: string;
  rationale: string;
}

export interface DashboardStats {
  completedCalls: number;
  totalMinutes: number;
  uniqueConnectedThisWeek: number;
  weeklyStreak: number;
  connectionScore: number;
}

export interface DashboardHighlight {
  title: string;
  value: string;
  detail: string;
  tone: "warm" | "success" | "neutral";
}

export interface ActivityItem {
  id: string;
  summary: string;
  createdAt: string;
  type: string;
}

export interface AvailabilitySummaryItem {
  weekday: number;
  dayLabel: string;
  label: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferenceSettings {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  weeklyDigestEnabled: boolean;
  reminder24hEnabled: boolean;
  reminder15mEnabled: boolean;
  startingNowEnabled: boolean;
  pushEnabled: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  timezone: string;
}

export interface CallRecap {
  callId: string;
  title: string;
  scheduledStart: string;
  actualDurationMinutes: number;
  summary: string | null;
  highlight: string | null;
  nextStep: string | null;
}

export interface DashboardUpcomingCall {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: CallStatus;
  meeting_provider: string | null;
  meeting_url: string | null;
  actual_started_at: string | null;
  reminder_status: ReminderStatus;
  reminder_sent_at: string | null;
  reminder_label: string;
  needs_join_link_prompt: boolean;
  needs_completion_prompt: boolean;
  recovery_dismissed_at: string | null;
  show_recovery_prompt: boolean;
  suggested_reschedule_start: string | null;
  suggested_reschedule_end: string | null;
}

export interface DashboardCompletedCall {
  id: string;
  title: string;
  scheduled_start: string;
  actual_duration_minutes: number | null;
  attended_count: number;
}

export interface DashboardMember {
  id: string;
  display_name: string;
  status: "active" | "invited";
  invite_email: string | null;
}

export interface DashboardSnapshot {
  circle: { id: string; name: string; description: string | null };
  memberships: DashboardMember[];
  upcomingCalls: DashboardUpcomingCall[];
  completedCalls: DashboardCompletedCall[];
  recentActivity: ActivityItem[];
  stats: DashboardStats;
  highlights: DashboardHighlight[];
  suggestions: Suggestion[];
  latestRecap: CallRecap | null;
  readiness: {
    activeMembers: number;
    invitedMembers: number;
    withAvailability: number;
    completionRate: number;
  };
  viewerAvailability: {
    slotsCount: number;
    summary: AvailabilitySummaryItem[];
  };
  inbox: {
    notifications: NotificationItem[];
    unreadCount: number;
  };
  notificationPreferences: NotificationPreferenceSettings;
  viewerTimezone: string;
}

export type DashboardResponse =
  | { needsOnboarding: true }
  | { needsOnboarding: false; snapshot: DashboardSnapshot };

export interface CallDetailParticipant {
  membershipId: string;
  displayName: string;
  attended: boolean | null;
  avatarUrl: string | null;
}

export interface CallDetailSnapshot {
  circle: { id: string; name: string; description: string | null };
  call: {
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    status: CallStatus;
    actual_duration_minutes: number | null;
    meeting_provider: string | null;
    meeting_url: string | null;
    actual_started_at: string | null;
    actual_ended_at: string | null;
    reminder_status: ReminderStatus;
    reminder_sent_at: string | null;
    reminder_label: string;
    needs_join_link_prompt: boolean;
    needs_completion_prompt: boolean;
    recovery_dismissed_at: string | null;
    show_recovery_prompt: boolean;
    suggested_reschedule_start: string | null;
    suggested_reschedule_end: string | null;
    can_reschedule: boolean;
  };
  participants: CallDetailParticipant[];
  recap: CallRecap | null;
  viewerTimezone: string;
  viewerTimezoneLabel: string;
  viewerMembershipId: string;
  canManageFamily: boolean;
}

export type CallDetailResponse = { snapshot: CallDetailSnapshot };

export type CompleteCallBody = {
  durationMinutes: number;
  attendedMembershipIds: string[];
};

export type SaveRecapBody = {
  summary?: string;
  highlight?: string;
  nextStep?: string;
};

export type SaveLinkBody = {
  meetingProvider?: string | null;
  meetingUrl?: string | null;
};

export interface AvailabilityWindow {
  weekday: number;
  start_hour: number;
  end_hour: number;
}

export interface AvailabilityResponse {
  circle: { id: string; name: string; description: string | null };
  membershipId: string;
  slots: string[];
  windows: AvailabilityWindow[];
  summary: AvailabilitySummaryItem[];
}

export interface SaveAvailabilityResponse {
  success: true;
  slots: string[];
  summary: AvailabilitySummaryItem[];
}

export interface FamilyMember {
  id: string;
  display_name: string;
  status: "active" | "invited";
  role: "owner" | "member";
  relationship_label: string | null;
  invite_email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  is_placeholder: boolean;
  is_deceased: boolean;
  blocked_at: string | null;
  address: string | null;
  placeholder_notes: string | null;
}

export interface FamilyMembersResponse {
  circle: { id: string; name: string; description: string | null };
  viewerMembershipId: string;
  viewerRole: "owner" | "member";
  members: FamilyMember[];
}

export interface ScheduleCallBody {
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  participantMembershipIds: string[];
}

export interface ScheduleCallResponse {
  callId: string;
}

export interface InviteMemberBody {
  displayName: string;
  inviteEmail: string;
  relationshipLabel?: string;
}

export interface InviteMemberResponse {
  success: true;
  membershipId: string;
  alreadyClaimed: boolean;
}

export interface UpdateMemberBody {
  displayName?: string;
  relationshipLabel?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
}

export interface BlockMemberBody {
  reason?: string;
}

export interface AddPlaceholderBody {
  displayName: string;
  relationshipLabel?: string;
  isDeceased?: boolean;
  notes?: string;
}

export interface AddPlaceholderResponse {
  success: true;
  membershipId: string;
}
