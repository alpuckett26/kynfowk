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

export type NotificationChannel = "in_app" | "email" | "push";

export type NotificationDeliveryStatus = "queued" | "sent" | "skipped" | "failed";

export type NotificationReadFilter = "all" | "unread" | "read";

export type PilotFeedbackCategory = "bug" | "confusing" | "suggestion" | "positive";

export type ProductEventName =
  | "signup_completed"
  | "signin_completed"
  | "family_circle_created"
  | "invite_claimed"
  | "availability_saved"
  | "call_scheduled"
  | "join_clicked"
  | "call_completed"
  | "recap_saved"
  | "push_enabled";

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

export interface ActivityItem {
  id: string;
  summary: string;
  createdAt: string;
  type: string;
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

export interface CallParticipantAttendance {
  membershipId: string;
  displayName: string;
  attended: boolean;
}

export interface ScheduledCallLinkDetails {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: CallStatus;
  meeting_provider: string | null;
  meeting_url: string | null;
  actual_started_at: string | null;
}

export interface CallRecoveryState {
  recovery_dismissed_at: string | null;
  show_recovery_prompt: boolean;
  suggested_reschedule_start: string | null;
  suggested_reschedule_end: string | null;
}

export interface CallDetailParticipant {
  membershipId: string;
  displayName: string;
  attended: boolean | null;
  avatarUrl: string | null;
}

export interface DashboardHighlight {
  title: string;
  value: string;
  detail: string;
  tone: "warm" | "success" | "neutral";
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

export interface NotificationTypeCount {
  type: NotificationType;
  count: number;
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
  pushSubscriptionCount?: number;
  pushDeliveryReady?: boolean;
}

export interface AdminAnalyticsSnapshot {
  totalFamilyCircles: number;
  activeMembers: number;
  pendingInvites: number;
  scheduledCalls: number;
  completedCalls: number;
  completionRate: number;
  missedCallRecoveryActions: number;
  pushOptIns: number;
  emailEnabledUsers: number;
  averageAttendeesPerCompletedCall: number;
}

export interface ProductEventCount {
  eventName: ProductEventName;
  count: number;
}

export interface PilotFeedbackItem {
  id: string;
  category: PilotFeedbackCategory;
  message: string;
  pagePath: string | null;
  callSessionId: string | null;
  createdAt: string;
}

export interface AdminDeliveryIssue {
  id: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  errorMessage: string | null;
  recipient: string | null;
  sentAt: string | null;
  createdAt: string;
  notificationTitle: string | null;
  notificationType: NotificationType | null;
}

export interface AdminCircleSummary {
  id: string;
  name: string;
  activeMembers: number;
  pendingInvites: number;
  availabilityMembers: number;
  scheduledCalls: number;
  completedCalls: number;
  pushEnabledMembers: number;
  feedbackCount: number;
  checklist: {
    onboardingComplete: boolean;
    inviteClaimed: boolean;
    availabilitySet: boolean;
    firstCallScheduled: boolean;
    firstCallCompleted: boolean;
    pushEnabled: boolean;
    feedbackReceived: boolean;
  };
}

export interface AdminFrictionSignal {
  title: string;
  detail: string;
  severity: "warning" | "neutral";
}
