import { redirect } from "next/navigation";

import { buildAvailabilitySummary, getAvailabilitySlotKey } from "@/lib/availability";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import {
  ensureNotificationPreferences,
  getNotificationInboxData,
  sweepFamilyCircleNotifications
} from "@/lib/notifications";
import { buildSuggestions } from "@/lib/scheduling";
import type {
  ActivityItem,
  AvailabilitySummaryItem,
  AdminAnalyticsSnapshot,
  AdminCircleSummary,
  AdminDeliveryIssue,
  AdminFrictionSignal,
  CallRecoveryState,
  CallStatus,
  CallDetailParticipant,
  CallParticipantAttendance,
  CallRecap,
  DashboardHighlight,
  DashboardStats,
  NotificationItem,
  NotificationPreferenceSettings,
  NotificationReadFilter,
  NotificationType,
  NotificationTypeCount,
  PilotFeedbackItem,
  ProductEventCount,
  ReminderStatus,
  ScheduledCallLinkDetails,
  Suggestion
} from "@/lib/types";
import {
  buildRecoveryRescheduleWindow,
  formatReminderState,
  formatTimezoneLabel,
  getWeekKey,
  isCallNear,
  isCallPastDue,
  isFutureCall,
  normalizeReminderStatus
} from "@/lib/utils";

function buildCallRecoveryState(call: {
  status: CallStatus;
  scheduled_start: string;
  scheduled_end: string;
  recovery_dismissed_at: string | null;
}): CallRecoveryState {
  const isPastDue = isCallPastDue(call.status, call.scheduled_end);
  const rescheduleWindow = isPastDue
    ? buildRecoveryRescheduleWindow(call.scheduled_start, call.scheduled_end)
    : null;

  return {
    recovery_dismissed_at: call.recovery_dismissed_at,
    show_recovery_prompt: isPastDue && !call.recovery_dismissed_at,
    suggested_reschedule_start: rescheduleWindow?.startAt ?? null,
    suggested_reschedule_end: rescheduleWindow?.endAt ?? null
  };
}

export async function getViewer() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export async function requireViewer() {
  const user = await getViewer();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return user;
}

export async function getViewerFamilyCircle(userId: string) {
  const supabase = await createSupabaseServerClient();
  const membershipResponse = await supabase
    .from("family_memberships")
    .select("id, family_circle_id, display_name, role, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const membership = membershipResponse.data;
  if (!membership) {
    return null;
  }

  const circleResponse = await supabase
    .from("family_circles")
    .select("id, name, description")
    .eq("id", membership.family_circle_id)
    .maybeSingle();

  if (!circleResponse.data) {
    return null;
  }

  return {
    membership,
    circle: circleResponse.data
  };
}

async function getViewerTimezone(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
) {
  const [preferenceResponse, profileResponse] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle()
  ]);

  return (
    preferenceResponse.data?.timezone ?? profileResponse.data?.timezone ?? "America/Chicago"
  );
}

export async function getAvailabilityManagementData(userId: string): Promise<{
  circle: { id: string; name: string; description: string | null };
  membership: {
    id: string;
    display_name: string;
    status: "active" | "invited";
  };
  currentSlots: string[];
  currentWindows: {
    weekday: number;
    start_hour: number;
    end_hour: number;
  }[];
  summary: AvailabilitySummaryItem[];
  nextBestOverlap: Suggestion | null;
}> {
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);

  if (!family) {
    redirect("/onboarding");
  }

  if (family.membership.status !== "active") {
    redirect("/dashboard");
  }

  const [availabilityResponse, membershipsResponse] = await Promise.all([
    supabase
      .from("availability_windows")
      .select("weekday, start_hour, end_hour")
      .eq("family_circle_id", family.circle.id)
      .eq("membership_id", family.membership.id)
      .order("weekday", { ascending: true })
      .order("start_hour", { ascending: true }),
    supabase
      .from("family_memberships")
      .select("id, display_name, status")
      .eq("family_circle_id", family.circle.id)
      .order("created_at", { ascending: true })
  ]);

  const currentWindows = availabilityResponse.data ?? [];
  const currentSlots = currentWindows.map((window) => getAvailabilitySlotKey(window));
  const summary = buildAvailabilitySummary(currentWindows);

  const allWindowsResponse = await supabase
    .from("availability_windows")
    .select("weekday, start_hour, end_hour, membership_id")
    .eq("family_circle_id", family.circle.id);

  return {
    circle: family.circle,
    membership: family.membership,
    currentSlots,
    currentWindows,
    summary,
    nextBestOverlap:
      buildSuggestions(allWindowsResponse.data ?? [], membershipsResponse.data ?? [])[0] ?? null
  };
}

export async function getHomepageStats(): Promise<{
  totalMinutes: number;
  totalCalls: number;
  totalFamilies: number;
  totalMembers: number;
}> {
  if (!hasSupabaseEnv()) {
    return { totalMinutes: 0, totalCalls: 0, totalFamilies: 0, totalMembers: 0 };
  }

  try {
    const admin = createSupabaseAdminClient();
    const [callsRes, circlesRes, membersRes] = await Promise.all([
      admin
        .from("call_sessions")
        .select("actual_duration_minutes")
        .eq("status", "completed"),
      admin.from("family_circles").select("id", { count: "exact", head: true }),
      admin
        .from("family_memberships")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
    ]);

    const calls = callsRes.data ?? [];
    const totalMinutes = calls.reduce(
      (sum, c) => sum + (c.actual_duration_minutes ?? 0),
      0
    );

    return {
      totalMinutes,
      totalCalls: calls.length,
      totalFamilies: circlesRes.count ?? 0,
      totalMembers: membersRes.count ?? 0
    };
  } catch {
    return { totalMinutes: 0, totalCalls: 0, totalFamilies: 0, totalMembers: 0 };
  }
}

export async function getDashboardData(userId: string): Promise<{
  circle: { id: string; name: string; description: string | null };
  memberships: {
    id: string;
    display_name: string;
    status: "active" | "invited";
    invite_email: string | null;
  }[];
  upcomingCalls: {
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
  }[];
  completedCalls: {
    id: string;
    title: string;
    scheduled_start: string;
    actual_duration_minutes: number | null;
    attended_count: number;
  }[];
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
}> {
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);

  if (!family) {
    redirect("/onboarding");
  }

  await ensureNotificationPreferences(supabase, userId);

  await sweepFamilyCircleNotifications(supabase, {
    familyCircleId: family.circle.id,
    circleName: family.circle.name
  });

  const [
    membershipsResponse,
    callsResponse,
    activityResponse,
    availabilityResponse,
    recapsResponse,
    inboxData
  ] = await Promise.all([
      supabase
        .from("family_memberships")
        .select("id, display_name, status, invite_email")
        .eq("family_circle_id", family.circle.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("call_sessions")
        .select("id, title, scheduled_start, scheduled_end, status, actual_duration_minutes, meeting_provider, meeting_url, actual_started_at, recovery_dismissed_at, reminder_status, reminder_sent_at")
        .eq("family_circle_id", family.circle.id)
        .order("scheduled_start", { ascending: true }),
      supabase
        .from("family_activity")
        .select("id, summary, created_at, activity_type")
        .eq("family_circle_id", family.circle.id)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("availability_windows")
        .select("weekday, start_hour, end_hour, membership_id")
        .eq("family_circle_id", family.circle.id),
      supabase
        .from("call_recaps")
        .select("call_session_id, summary, highlight, next_step"),
      getNotificationInboxData(supabase, userId, { limit: 3 })
    ]);

  const memberships = membershipsResponse.data ?? [];
  const activeMemberships = memberships.filter((member) => member.status === "active");
  const calls = callsResponse.data ?? [];
  const activity = (activityResponse.data ?? []).map((item) => ({
    id: item.id,
    summary: item.summary,
    createdAt: item.created_at,
    type: item.activity_type
  }));
  const completedCalls = calls.filter((call) => call.status === "completed");
  const totalMinutes = completedCalls.reduce(
    (sum, call) => sum + (call.actual_duration_minutes ?? 0),
    0
  );

  const startKey = getWeekKey(new Date());
  const participantResponse = completedCalls.length
    ? await supabase
        .from("call_participants")
        .select("membership_id, call_session_id, attended")
        .in(
          "call_session_id",
          completedCalls.map((call) => call.id)
        )
    : { data: [] as { membership_id: string; call_session_id: string; attended: boolean | null }[] };

  const thisWeekCallIds = new Set(
    completedCalls
      .filter((call) => getWeekKey(new Date(call.scheduled_start)) === startKey)
      .map((call) => call.id)
  );

  const uniqueConnectedThisWeek = new Set(
    (participantResponse.data ?? [])
      .filter(
        (participant) =>
          thisWeekCallIds.has(participant.call_session_id) && participant.attended === true
      )
      .map((participant) => participant.membership_id)
  ).size;
  const attendedCountByCallId = new Map<string, number>();
  for (const participant of participantResponse.data ?? []) {
    if (participant.attended !== true) {
      continue;
    }

    attendedCountByCallId.set(
      participant.call_session_id,
      (attendedCountByCallId.get(participant.call_session_id) ?? 0) + 1
    );
  }

  const upcomingCalls = calls
    .filter((call) => call.status === "scheduled" || call.status === "live")
    .map((call) => {
      const reminderStatus = normalizeReminderStatus(call.status, call.reminder_status);
      const needsJoinLinkPrompt = !call.meeting_url && isCallNear(call.scheduled_start);
      const needsCompletionPrompt = isCallPastDue(call.status, call.scheduled_end);
      const recovery = buildCallRecoveryState(call);

      return {
        ...call,
        reminder_status: reminderStatus,
        reminder_label: formatReminderState(
          call.status,
          reminderStatus,
          call.reminder_sent_at
        ),
        needs_join_link_prompt: needsJoinLinkPrompt,
        needs_completion_prompt: needsCompletionPrompt,
        ...recovery
      };
    });
  const windows = availabilityResponse.data ?? [];
  const membershipsWithAvailability = new Set(windows.map((window) => window.membership_id));
  const recapLookup = new Map(
    (recapsResponse.data ?? []).map((recap) => [recap.call_session_id, recap])
  );
  const latestCompleted = completedCalls
    .slice()
    .sort(
      (a, b) =>
        new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime()
    )[0];

  const readiness = {
    activeMembers: activeMemberships.length,
    invitedMembers: memberships.filter((member) => member.status === "invited").length,
    withAvailability: activeMemberships.filter((member) => membershipsWithAvailability.has(member.id))
      .length,
    completionRate:
      activeMemberships.length > 0
        ? Math.round(
            (activeMemberships.filter((member) => membershipsWithAvailability.has(member.id)).length /
              activeMemberships.length) *
              100
          )
        : 0
  };
  const viewerWindows = windows.filter((window) => window.membership_id === family.membership.id);

  return {
    circle: family.circle,
    memberships,
    upcomingCalls: upcomingCalls.slice(0, 5),
    completedCalls: completedCalls
      .slice()
      .sort(
        (a, b) =>
          new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime()
      )
      .slice(0, 3)
      .map((call) => ({
        ...call,
        attended_count: attendedCountByCallId.get(call.id) ?? 0
      })),
    recentActivity: activity,
    stats: {
      completedCalls: completedCalls.length,
      totalMinutes,
      uniqueConnectedThisWeek,
      weeklyStreak: getWeeklyStreak(
        completedCalls.map((call) => new Date(call.scheduled_start))
      ),
      connectionScore: computeConnectionScore(
        completedCalls,
        participantResponse.data ?? [],
        attendedCountByCallId
      )
    },
    highlights: buildHighlights({
      totalMinutes,
      completedCalls: completedCalls.length,
      uniqueConnectedThisWeek,
      weeklyStreak: getWeeklyStreak(completedCalls.map((call) => new Date(call.scheduled_start))),
      upcomingCalls: upcomingCalls.length,
      readiness
    }),
    suggestions: buildSuggestions(windows, memberships),
    latestRecap: latestCompleted
      ? {
          callId: latestCompleted.id,
          title: latestCompleted.title,
          scheduledStart: latestCompleted.scheduled_start,
          actualDurationMinutes: latestCompleted.actual_duration_minutes ?? 0,
          summary: recapLookup.get(latestCompleted.id)?.summary ?? null,
          highlight: recapLookup.get(latestCompleted.id)?.highlight ?? null,
          nextStep: recapLookup.get(latestCompleted.id)?.next_step ?? null
        }
      : null,
    readiness,
    viewerAvailability: {
      slotsCount: viewerWindows.length,
      summary: buildAvailabilitySummary(viewerWindows).slice(0, 3)
    },
    inbox: {
      notifications: inboxData.notifications,
      unreadCount: inboxData.unreadCount
    },
    notificationPreferences: inboxData.preferences,
    viewerTimezone: inboxData.preferences.timezone
  };
}

export async function getNotificationsPageData(
  userId: string,
  filters?: {
    readFilter?: NotificationReadFilter;
    typeFilter?: NotificationType | "all";
  }
): Promise<{
  circle: { id: string; name: string; description: string | null };
  inbox: {
    notifications: NotificationItem[];
    unreadCount: number;
    totalCount: number;
    typeCounts: NotificationTypeCount[];
  };
  notificationPreferences: NotificationPreferenceSettings;
  filters: {
    readFilter: NotificationReadFilter;
    typeFilter: NotificationType | "all";
  };
}> {
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);

  if (!family) {
    redirect("/onboarding");
  }

  await ensureNotificationPreferences(supabase, userId);
  await sweepFamilyCircleNotifications(supabase, {
    familyCircleId: family.circle.id,
    circleName: family.circle.name
  });

  const readFilter = filters?.readFilter ?? "all";
  const typeFilter = filters?.typeFilter ?? "all";
  const inboxData = await getNotificationInboxData(supabase, userId, {
    readFilter,
    typeFilter
  });

  return {
    circle: family.circle,
    inbox: {
      notifications: inboxData.notifications,
      unreadCount: inboxData.unreadCount,
      totalCount: inboxData.totalCount,
      typeCounts: inboxData.typeCounts
    },
    notificationPreferences: inboxData.preferences,
    filters: {
      readFilter,
      typeFilter
    }
  };
}

export async function getCallCompletionData(userId: string, callId: string): Promise<{
  circle: { id: string; name: string; description: string | null };
  call: {
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    status: CallStatus;
  };
  participants: CallParticipantAttendance[];
}> {
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);

  if (!family || family.membership.status !== "active") {
    redirect("/dashboard");
  }

  await sweepFamilyCircleNotifications(supabase, {
    familyCircleId: family.circle.id,
    circleName: family.circle.name
  });

  const callResponse = await supabase
    .from("call_sessions")
    .select("id, title, scheduled_start, scheduled_end, status, family_circle_id")
    .eq("id", callId)
    .maybeSingle();

  if (!callResponse.data || callResponse.data.family_circle_id !== family.circle.id) {
    redirect("/dashboard?status=completion-missing");
  }

  const participantsResponse = await supabase
    .from("call_participants")
    .select("membership_id, attended, family_memberships!inner(display_name)")
    .eq("call_session_id", callId);

  return {
    circle: family.circle,
    call: {
      id: callResponse.data.id,
      title: callResponse.data.title,
      scheduled_start: callResponse.data.scheduled_start,
      scheduled_end: callResponse.data.scheduled_end,
      status: callResponse.data.status
    },
    participants: (participantsResponse.data ?? []).map((participant) => {
      const familyMembershipRecord = participant.family_memberships as
        | { display_name: string }[]
        | { display_name: string }
        | null;

      return {
        membershipId: participant.membership_id,
        displayName: Array.isArray(familyMembershipRecord)
          ? familyMembershipRecord[0]?.display_name ?? "Family member"
          : familyMembershipRecord?.display_name ?? "Family member",
        attended: participant.attended ?? true
      };
    })
  };
}

export async function getScheduledCallLinkData(
  userId: string,
  callId: string
): Promise<ScheduledCallLinkDetails | null> {
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);

  if (!family || family.membership.status !== "active") {
    return null;
  }

  const callResponse = await supabase
    .from("call_sessions")
    .select("id, title, scheduled_start, scheduled_end, status, meeting_provider, meeting_url, actual_started_at, family_circle_id")
    .eq("id", callId)
    .eq("status", "scheduled")
    .maybeSingle();

  if (!callResponse.data || callResponse.data.family_circle_id !== family.circle.id) {
    return null;
  }

  return {
    id: callResponse.data.id,
    title: callResponse.data.title,
    scheduled_start: callResponse.data.scheduled_start,
    scheduled_end: callResponse.data.scheduled_end,
    status: callResponse.data.status,
    meeting_provider: callResponse.data.meeting_provider,
    meeting_url: callResponse.data.meeting_url,
    actual_started_at: callResponse.data.actual_started_at
  };
}

export async function getCallDetailData(userId: string, callId: string): Promise<{
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
}> {
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);

  if (!family || family.membership.status !== "active") {
    redirect("/dashboard");
  }

  const callResponse = await supabase
    .from("call_sessions")
    .select("id, title, scheduled_start, scheduled_end, status, actual_duration_minutes, meeting_provider, meeting_url, actual_started_at, actual_ended_at, recovery_dismissed_at, reminder_status, reminder_sent_at, family_circle_id")
    .eq("id", callId)
    .maybeSingle();

  if (!callResponse.data || callResponse.data.family_circle_id !== family.circle.id) {
    redirect("/dashboard?status=completion-missing");
  }

  const [participantsResponse, recapResponse] = await Promise.all([
    supabase
      .from("call_participants")
      .select("membership_id, attended, family_memberships!inner(display_name, avatar_url)")
      .eq("call_session_id", callId),
    supabase
      .from("call_recaps")
      .select("summary, highlight, next_step")
      .eq("call_session_id", callId)
      .maybeSingle()
  ]);

  const participants = (participantsResponse.data ?? []).map((participant) => {
    const familyMembershipRecord = participant.family_memberships as
      | { display_name: string; avatar_url: string | null }[]
      | { display_name: string; avatar_url: string | null }
      | null;

    const record = Array.isArray(familyMembershipRecord)
      ? familyMembershipRecord[0]
      : familyMembershipRecord;

    return {
      membershipId: participant.membership_id,
      displayName: record?.display_name ?? "Family member",
      attended: participant.attended,
      avatarUrl: record?.avatar_url ?? null
    };
  });

  const reminderStatus = normalizeReminderStatus(
    callResponse.data.status,
    callResponse.data.reminder_status
  );
  const recovery = buildCallRecoveryState(callResponse.data);
  const viewerTimezone = await getViewerTimezone(supabase, userId);

  return {
    circle: family.circle,
    call: {
      id: callResponse.data.id,
      title: callResponse.data.title,
      scheduled_start: callResponse.data.scheduled_start,
      scheduled_end: callResponse.data.scheduled_end,
      status: callResponse.data.status,
      actual_duration_minutes: callResponse.data.actual_duration_minutes,
      meeting_provider: callResponse.data.meeting_provider,
      meeting_url: callResponse.data.meeting_url,
      actual_started_at: callResponse.data.actual_started_at,
      actual_ended_at: callResponse.data.actual_ended_at,
      reminder_status: reminderStatus,
      reminder_sent_at: callResponse.data.reminder_sent_at,
      reminder_label: formatReminderState(
        callResponse.data.status,
        reminderStatus,
        callResponse.data.reminder_sent_at
      ),
      needs_join_link_prompt:
        !callResponse.data.meeting_url && isCallNear(callResponse.data.scheduled_start),
      needs_completion_prompt: isCallPastDue(
        callResponse.data.status,
        callResponse.data.scheduled_end
      ),
      ...recovery,
      can_reschedule:
        callResponse.data.status === "scheduled" && isFutureCall(callResponse.data.scheduled_start)
    },
    participants,
    recap:
      callResponse.data.status === "completed"
        ? {
            callId: callResponse.data.id,
            title: callResponse.data.title,
            scheduledStart: callResponse.data.scheduled_start,
            actualDurationMinutes: callResponse.data.actual_duration_minutes ?? 0,
            summary: recapResponse.data?.summary ?? null,
            highlight: recapResponse.data?.highlight ?? null,
            nextStep: recapResponse.data?.next_step ?? null
          }
        : null,
    viewerTimezone,
    viewerTimezoneLabel: formatTimezoneLabel(viewerTimezone),
    viewerMembershipId: family.membership.id,
    canManageFamily: family.membership.role === "owner"
  };
}

export async function getAdminAnalyticsData(userId: string): Promise<{
  viewerEmail: string | null;
  snapshot: AdminAnalyticsSnapshot;
  funnel: ProductEventCount[];
  recentFeedback: PilotFeedbackItem[];
  deliveryIssues: AdminDeliveryIssue[];
  circleSummaries: AdminCircleSummary[];
  frictionSignals: AdminFrictionSignal[];
}> {
  const viewer = await requireViewer();
  const supabase = createSupabaseAdminClient();

  const [
    circlesResponse,
    membershipsResponse,
    callsResponse,
    activityResponse,
    pushResponse,
    preferencesResponse,
    eventsResponse,
    feedbackResponse,
    deliveriesResponse,
    circlesListResponse,
    windowsResponse
  ] = await Promise.all([
    supabase.from("family_circles").select("id", { count: "exact", head: true }),
    supabase.from("family_memberships").select("id, family_circle_id, user_id, status"),
    supabase.from("call_sessions").select("id, family_circle_id, status"),
    supabase
      .from("family_activity")
      .select("id, activity_type")
      .in("activity_type", ["call_recovery_dismissed", "call_rescheduled"]),
    supabase.from("push_subscriptions").select("id, user_id"),
    supabase.from("notification_preferences").select("user_id, email_enabled, push_enabled"),
    supabase.from("product_events").select("event_name"),
    supabase
      .from("pilot_feedback")
      .select("id, category, message, page_path, call_session_id, family_circle_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("notification_deliveries")
      .select(
        "id, channel, status, error_message, recipient, sent_at, created_at, notifications(title, type)"
      )
      .in("status", ["failed", "skipped"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("family_circles")
      .select("id, name")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("availability_windows").select("family_circle_id, membership_id")
  ]);

  const completedCallIds = (callsResponse.data ?? [])
    .filter((call) => call.status === "completed")
    .map((call) => call.id);
  const attendeesResponse = completedCallIds.length
    ? await supabase
        .from("call_participants")
        .select("call_session_id, attended")
        .in("call_session_id", completedCallIds)
    : { data: [] as { call_session_id: string; attended: boolean | null }[] };

  const completedCalls = (callsResponse.data ?? []).filter((call) => call.status === "completed");
  const scheduledCalls = (callsResponse.data ?? []).filter(
    (call) => call.status === "scheduled" || call.status === "live"
  );
  const averageAttendeesPerCompletedCall = completedCalls.length
    ? Number(
        (
          (attendeesResponse.data ?? []).filter((participant) => participant.attended === true)
            .length / completedCalls.length
        ).toFixed(1)
      )
    : 0;
  const membershipsByCircle = new Map<
    string,
    {
      activeMembers: number;
      pendingInvites: number;
      userIds: string[];
    }
  >();
  for (const membership of membershipsResponse.data ?? []) {
    const current = membershipsByCircle.get(membership.family_circle_id) ?? {
      activeMembers: 0,
      pendingInvites: 0,
      userIds: []
    };

    if (membership.status === "active") {
      current.activeMembers += 1;
      if (membership.user_id) {
        current.userIds.push(membership.user_id);
      }
    } else {
      current.pendingInvites += 1;
    }

    membershipsByCircle.set(membership.family_circle_id, current);
  }

  const availabilityByCircle = new Map<string, Set<string>>();
  for (const window of windowsResponse.data ?? []) {
    const current = availabilityByCircle.get(window.family_circle_id) ?? new Set<string>();
    current.add(window.membership_id);
    availabilityByCircle.set(window.family_circle_id, current);
  }

  const callsByCircle = new Map<
    string,
    {
      scheduledCalls: number;
      completedCalls: number;
    }
  >();
  for (const call of callsResponse.data ?? []) {
    const current = callsByCircle.get(call.family_circle_id) ?? {
      scheduledCalls: 0,
      completedCalls: 0
    };

    if (call.status === "completed") {
      current.completedCalls += 1;
    } else if (call.status === "scheduled" || call.status === "live") {
      current.scheduledCalls += 1;
    }

    callsByCircle.set(call.family_circle_id, current);
  }

  const feedbackByCircle = new Map<string, number>();
  for (const item of feedbackResponse.data ?? []) {
    if (!item.family_circle_id) {
      continue;
    }

    feedbackByCircle.set(
      item.family_circle_id,
      (feedbackByCircle.get(item.family_circle_id) ?? 0) + 1
    );
  }

  const pushEnabledUserIds = new Set(
    (preferencesResponse.data ?? [])
      .filter((preference) => preference.push_enabled)
      .map((preference) => preference.user_id)
  );
  const circleSummaries = (circlesListResponse.data ?? []).map((circle) => {
    const membershipSummary = membershipsByCircle.get(circle.id) ?? {
      activeMembers: 0,
      pendingInvites: 0,
      userIds: []
    };
    const callsSummary = callsByCircle.get(circle.id) ?? {
      scheduledCalls: 0,
      completedCalls: 0
    };
    const availabilityMembers = availabilityByCircle.get(circle.id)?.size ?? 0;
    const pushEnabledMembers = membershipSummary.userIds.filter((userId) =>
      pushEnabledUserIds.has(userId)
    ).length;

    return {
      id: circle.id,
      name: circle.name,
      activeMembers: membershipSummary.activeMembers,
      pendingInvites: membershipSummary.pendingInvites,
      availabilityMembers,
      scheduledCalls: callsSummary.scheduledCalls,
      completedCalls: callsSummary.completedCalls,
      pushEnabledMembers,
      feedbackCount: feedbackByCircle.get(circle.id) ?? 0,
      checklist: {
        onboardingComplete: membershipSummary.activeMembers > 0,
        inviteClaimed: membershipSummary.activeMembers > 1,
        availabilitySet: availabilityMembers > 0,
        firstCallScheduled: callsSummary.scheduledCalls + callsSummary.completedCalls > 0,
        firstCallCompleted: callsSummary.completedCalls > 0,
        pushEnabled: pushEnabledMembers > 0,
        feedbackReceived: (feedbackByCircle.get(circle.id) ?? 0) > 0
      }
    };
  });
  const deliveryIssues = (deliveriesResponse.data ?? []).map((delivery) => {
    const notificationRecord = delivery.notifications as
      | { title: string; type: AdminDeliveryIssue["notificationType"] }[]
      | { title: string; type: AdminDeliveryIssue["notificationType"] }
      | null;
    const notification = Array.isArray(notificationRecord)
      ? notificationRecord[0]
      : notificationRecord;

    return {
      id: delivery.id,
      channel: delivery.channel,
      status: delivery.status,
      errorMessage: delivery.error_message,
      recipient: delivery.recipient,
      sentAt: delivery.sent_at,
      createdAt: delivery.created_at,
      notificationTitle: notification?.title ?? null,
      notificationType: notification?.type ?? null
    };
  });
  const frictionSignals: AdminFrictionSignal[] = [
    ...(deliveryIssues.filter((issue) => issue.status === "failed").length
      ? [
          {
            title: "Failed notification deliveries need a look",
            detail: `${deliveryIssues.filter((issue) => issue.status === "failed").length} recent deliveries failed across email or push.`,
            severity: "warning" as const
          }
        ]
      : []),
    ...((feedbackResponse.data ?? []).filter(
      (item) => item.category === "bug" || item.category === "confusing"
    ).length
      ? [
          {
            title: "Pilot friction feedback is coming in",
            detail: `${(feedbackResponse.data ?? []).filter((item) => item.category === "bug" || item.category === "confusing").length} recent note(s) were tagged as bug or confusing.`,
            severity: "warning" as const
          }
        ]
      : []),
    ...(circleSummaries.filter((circle) => !circle.checklist.firstCallCompleted).length
      ? [
          {
            title: "Some pilot circles still need their first completed call",
            detail: `${circleSummaries.filter((circle) => !circle.checklist.firstCallCompleted).length} recent circle(s) have not closed the loop on a first call yet.`,
            severity: "neutral" as const
          }
        ]
      : [])
  ];

  return {
    viewerEmail: viewer.email ?? null,
    snapshot: {
      totalFamilyCircles: circlesResponse.count ?? 0,
      activeMembers: (membershipsResponse.data ?? []).filter((member) => member.status === "active")
        .length,
      pendingInvites: (membershipsResponse.data ?? []).filter((member) => member.status === "invited")
        .length,
      scheduledCalls: scheduledCalls.length,
      completedCalls: completedCalls.length,
      completionRate:
        (callsResponse.data ?? []).length > 0
          ? Math.round((completedCalls.length / (callsResponse.data ?? []).length) * 100)
          : 0,
      missedCallRecoveryActions: (activityResponse.data ?? []).length,
      pushOptIns: new Set((pushResponse.data ?? []).map((subscription) => subscription.user_id)).size,
      emailEnabledUsers: new Set(
        (preferencesResponse.data ?? [])
          .filter((preference) => preference.email_enabled)
          .map((preference) => preference.user_id)
      ).size,
      averageAttendeesPerCompletedCall
    },
    funnel: (
      [
        "signup_completed",
        "signin_completed",
        "family_circle_created",
        "invite_claimed",
        "availability_saved",
        "call_scheduled",
        "join_clicked",
        "call_completed",
        "recap_saved",
        "push_enabled"
      ] as const
    ).map((eventName) => ({
      eventName,
      count: (eventsResponse.data ?? []).filter((event) => event.event_name === eventName).length
    })),
    recentFeedback: (feedbackResponse.data ?? []).map((item) => ({
      id: item.id,
      category: item.category,
      message: item.message,
      pagePath: item.page_path,
      callSessionId: item.call_session_id,
      createdAt: item.created_at
    })),
    deliveryIssues,
    circleSummaries,
    frictionSignals
  };
}

export async function getSettingsPageData(userId: string): Promise<{
  circle: { id: string; name: string; description: string | null } | null;
  profile: {
    fullName: string;
    email: string | null;
    timezone: string;
  };
  notificationPreferences: NotificationPreferenceSettings;
}> {
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);

  await ensureNotificationPreferences(supabase, userId);

  const [profileResponse, inboxData] = await Promise.all([
    supabase.from("profiles").select("full_name, email, timezone").eq("id", userId).maybeSingle(),
    getNotificationInboxData(supabase, userId, { limit: 3 })
  ]);

  return {
    circle: family?.circle ?? null,
    profile: {
      fullName: profileResponse.data?.full_name ?? "",
      email: profileResponse.data?.email ?? null,
      timezone: profileResponse.data?.timezone ?? inboxData.preferences.timezone
    },
    notificationPreferences: inboxData.preferences
  };
}

export async function getFamilyManagementData(userId: string): Promise<{
  circle: { id: string; name: string; description: string | null };
  viewer: {
    membershipId: string;
    role: "owner" | "member";
    canManage: boolean;
  };
  members: {
    id: string;
    display_name: string;
    relationship_label: string | null;
    invite_email: string | null;
    status: "active" | "invited" | "blocked";
    role: "owner" | "member";
    user_id: string | null;
    created_at: string;
    blocked_at: string | null;
    blocked_reason: string | null;
    is_placeholder: boolean;
    is_deceased: boolean;
    placeholder_notes: string | null;
    avatar_url: string | null;
    last_seen_at: string | null;
    phone_number: string | null;
  }[];
}> {
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);

  if (!family) {
    redirect("/onboarding");
  }

  if (family.membership.status !== "active") {
    redirect("/dashboard");
  }

  const membersResponse = await supabase
    .from("family_memberships")
    .select(
      "id, display_name, relationship_label, invite_email, status, role, user_id, created_at, blocked_at, blocked_reason, is_placeholder, is_deceased, placeholder_notes, avatar_url, last_seen_at, phone_number"
    )
    .eq("family_circle_id", family.circle.id)
    .order("created_at", { ascending: true });

  return {
    circle: family.circle,
    viewer: {
      membershipId: family.membership.id,
      role: family.membership.role,
      canManage: family.membership.role === "owner"
    },
    members: (membersResponse.data ?? []) as {
      id: string;
      display_name: string;
      relationship_label: string | null;
      invite_email: string | null;
      status: "active" | "invited" | "blocked";
      role: "owner" | "member";
      user_id: string | null;
      created_at: string;
      blocked_at: string | null;
      blocked_reason: string | null;
      is_placeholder: boolean;
      is_deceased: boolean;
      placeholder_notes: string | null;
      avatar_url: string | null;
      last_seen_at: string | null;
      phone_number: string | null;
    }[]
  };
}

function computeConnectionScore(
  completedCalls: Array<{ id: string; scheduled_start: string; actual_duration_minutes: number | null }>,
  participants: Array<{ membership_id: string; call_session_id: string; attended: boolean | null }>,
  attendedCountByCallId: Map<string, number>
): number {
  const sortedCalls = [...completedCalls].sort(
    (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
  );

  const attendeesByCall = new Map<string, string[]>();
  for (const p of participants) {
    if (p.attended !== true) {
      continue;
    }
    const list = attendeesByCall.get(p.call_session_id) ?? [];
    list.push(p.membership_id);
    attendeesByCall.set(p.call_session_id, list);
  }

  const lastSeenByMember = new Map<string, Date>();
  let score = 0;

  for (const call of sortedCalls) {
    const callDate = new Date(call.scheduled_start);
    const attendedCount = attendedCountByCallId.get(call.id) ?? 0;
    const attendees = attendeesByCall.get(call.id) ?? [];

    score += 1;
    if ((call.actual_duration_minutes ?? 0) >= 10) {
      score += 1;
    }
    if (attendedCount >= 3) {
      score += 1;
    }
    for (const memberId of attendees) {
      const lastSeen = lastSeenByMember.get(memberId);
      if (lastSeen) {
        const daysSince = (callDate.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince >= 30) {
          score += 2;
        }
      }
      lastSeenByMember.set(memberId, callDate);
    }
  }

  return score;
}

function getWeeklyStreak(dates: Date[]) {
  if (!dates.length) {
    return 0;
  }

  const weeks = new Set(dates.map((date) => getWeekKey(date)));
  let streak = 0;
  const cursor = new Date();

  while (weeks.has(getWeekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

function buildHighlights(input: {
  totalMinutes: number;
  completedCalls: number;
  uniqueConnectedThisWeek: number;
  weeklyStreak: number;
  upcomingCalls: number;
  readiness: {
    activeMembers: number;
    invitedMembers: number;
    withAvailability: number;
    completionRate: number;
  };
}): DashboardHighlight[] {
  return [
    {
      title: "Family Connections pulse",
      value: `${input.uniqueConnectedThisWeek} this week`,
      detail:
        input.uniqueConnectedThisWeek > 0
          ? "Your circle has active touchpoints this week."
          : "No completed calls yet this week. A short catch-up can restart the rhythm quickly.",
      tone: "warm"
    },
    {
      title: "Availability readiness",
      value: `${input.readiness.completionRate}% shared`,
      detail: `${input.readiness.withAvailability} of ${input.readiness.activeMembers} active members have availability in the system.`,
      tone: input.readiness.completionRate >= 60 ? "success" : "neutral"
    },
    {
      title: "Time Together trend",
      value: `${input.totalMinutes} min`,
      detail:
        input.completedCalls > 0
          ? `${input.completedCalls} completed calls logged so far with a ${input.weeklyStreak}-week streak.`
          : "Log your first completed call to begin tracking minutes and streaks.",
      tone: "warm"
    },
    {
      title: "Planning momentum",
      value: `${input.upcomingCalls} upcoming`,
      detail:
        input.upcomingCalls > 0
          ? "Your next family touchpoints are already protected on the calendar."
          : `You still have ${input.readiness.invitedMembers} invited member${input.readiness.invitedMembers === 1 ? "" : "s"} to bring into the loop.`,
      tone: "neutral"
    }
  ];
}

// ── Family Polls ──────────────────────────────────────────────────────────────

export interface FamilyPoll {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  emoji_a: string | null;
  emoji_b: string | null;
  category: string;
}

export interface FamilyPollResult extends FamilyPoll {
  count_a: number;
  count_b: number;
  viewer_choice: "a" | "b" | null;
  responses: Array<{ displayName: string; choice: "a" | "b" }>;
}

export async function getNextUnansweredPoll(
  userId: string
): Promise<FamilyPoll | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);
  if (!family) return null;

  // polls the viewer hasn't answered yet
  const answeredRes = await supabase
    .from("family_poll_responses")
    .select("poll_id")
    .eq("membership_id", family.membership.id);

  const answeredIds = (answeredRes.data ?? []).map((r) => r.poll_id);

  const query = supabase
    .from("family_polls")
    .select("id, question, option_a, option_b, emoji_a, emoji_b, category")
    .order("created_at", { ascending: true })
    .limit(1);

  if (answeredIds.length > 0) {
    query.not("id", "in", `(${answeredIds.map((id) => `'${id}'`).join(",")})`);
  }

  const { data } = await query.maybeSingle();
  return data ?? null;
}

export async function getFamilyPollResults(
  userId: string
): Promise<FamilyPollResult[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);
  if (!family) return [];

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
      .eq("status", "active")
  ]);

  const polls = pollsRes.data ?? [];
  const responses = responsesRes.data ?? [];
  const members = membersRes.data ?? [];
  const nameMap = new Map(members.map((m) => [m.id, m.display_name]));

  // Only show polls that have at least one response in this circle
  return polls
    .map((poll) => {
      const pollResponses = responses.filter((r) => r.poll_id === poll.id);
      if (pollResponses.length === 0) return null;
      const viewerResponse = pollResponses.find(
        (r) => r.membership_id === family.membership.id
      );
      return {
        ...poll,
        count_a: pollResponses.filter((r) => r.choice === "a").length,
        count_b: pollResponses.filter((r) => r.choice === "b").length,
        viewer_choice: (viewerResponse?.choice ?? null) as "a" | "b" | null,
        responses: pollResponses.map((r) => ({
          displayName: nameMap.get(r.membership_id) ?? "Family member",
          choice: r.choice as "a" | "b"
        }))
      };
    })
    .filter(Boolean) as FamilyPollResult[];
}

export async function getPollPersonalizationTags(
  userId: string
): Promise<Record<string, string>> {
  if (!hasSupabaseEnv()) return {};
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);
  if (!family) return {};

  const { data } = await supabase
    .from("family_poll_responses")
    .select("choice, family_polls(question, option_a, option_b, category)")
    .eq("membership_id", family.membership.id);

  const tags: Record<string, string> = {};
  for (const row of data ?? []) {
    const poll = row.family_polls as unknown as {
      question: string; option_a: string; option_b: string; category: string;
    } | null;
    if (!poll) continue;
    tags[poll.category] = row.choice === "a" ? poll.option_a : poll.option_b;
    // Store by question slug for targeted nudges
    const slug = poll.question.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
    tags[slug] = row.choice === "a" ? poll.option_a : poll.option_b;
  }
  return tags;
}
