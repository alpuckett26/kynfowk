"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewerFamilyCircle, requireViewer } from "@/lib/data";
import { hasSupabaseEnv, hasSupabaseServiceRoleEnv, isAdminEmail } from "@/lib/env";
import { getPostAuthRedirectPath } from "@/lib/invites";
import {
  createNotifications,
  dismissCallNotifications,
  sweepAllNotifications
} from "@/lib/notifications";
import { savePilotFeedback, trackProductEvent } from "@/lib/product-insights";
import { buildSuggestions } from "@/lib/scheduling";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  convertLocalDateTimeToUtc,
  inferMeetingProvider,
  normalizeMeetingUrl
} from "@/lib/utils";

export interface AuthState {
  status: "idle" | "error";
  message?: string;
}

export interface OnboardingState {
  status: "idle" | "error";
  message?: string;
}

export interface AvailabilityState {
  status: "idle" | "success" | "error";
  message?: string;
}

export interface CallCompletionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export interface CallLinkState {
  status: "idle" | "success" | "error";
  message?: string;
}

export interface CallDetailsState {
  status: "idle" | "success" | "error";
  message?: string;
}

export interface ReminderState {
  status: "idle" | "success" | "error";
  message?: string;
}

export interface NotificationPreferencesState {
  status: "idle" | "success" | "error";
  message?: string;
}

export interface ProfileSettingsState {
  status: "idle" | "success" | "error";
  message?: string;
}

export interface FeedbackState {
  status: "idle" | "success" | "error";
  message?: string;
}

export interface AdminOpsState {
  status: "idle" | "success" | "error";
  message?: string;
}

async function getRecoverableCallContext(input: {
  userId: string;
  familyCircleId: string;
  callId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(input.userId);

  if (!family || family.circle.id !== input.familyCircleId || family.membership.status !== "active") {
    return {
      supabase,
      family: null,
      call: null,
      participants: [] as { membership_id: string }[]
    };
  }

  const [callResponse, participantsResponse] = await Promise.all([
    supabase
      .from("call_sessions")
      .select(
        "id, title, scheduled_start, scheduled_end, status, family_circle_id, recovery_dismissed_at"
      )
      .eq("id", input.callId)
      .eq("family_circle_id", input.familyCircleId)
      .maybeSingle(),
    supabase
      .from("call_participants")
      .select("membership_id")
      .eq("call_session_id", input.callId)
  ]);

  return {
    supabase,
    family,
    call: callResponse.data,
    participants: participantsResponse.data ?? []
  };
}

async function requireOwnerFamilyContext(userId: string, familyCircleId: string) {
  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(userId);

  if (!family || family.circle.id !== familyCircleId || family.membership.status !== "active") {
    return {
      supabase,
      family: null
    };
  }

  if (family.membership.role !== "owner") {
    return {
      supabase,
      family: null
    };
  }

  return {
    supabase,
    family
  };
}

async function requireAdminViewer() {
  const user = await requireViewer();

  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return user;
}

async function resetScheduledCallNotifications(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  callId: string
) {
  const notificationTypes = [
    "call_scheduled",
    "reminder_24h_before",
    "reminder_15m_before",
    "starting_now",
    "missing_join_link_warning",
    "call_passed_without_completion"
  ] as const;

  const notificationIdsResponse = await supabase
    .from("notifications")
    .select("id")
    .eq("call_session_id", callId)
    .in("type", [...notificationTypes]);

  const notificationIds = (notificationIdsResponse.data ?? []).map((item) => item.id);
  if (notificationIds.length) {
    await supabase.from("notification_deliveries").delete().in("notification_id", notificationIds);
    await supabase.from("notifications").delete().in("id", notificationIds);
  }
}

export async function signUpAction(
  _state: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: "Add Supabase env vars first so sign-up can talk to your project."
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`
    }
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (data.user) {
    await trackProductEvent(supabase, {
      eventName: "signup_completed",
      userId: data.user.id,
      metadata: {
        email
      }
    });
    const redirectPath = await getPostAuthRedirectPath(data.user);
    redirect(redirectPath);
  }

  redirect("/auth/sign-in");
}

export async function signInAction(
  _state: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: "Add Supabase env vars first so sign-in can talk to your project."
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  await trackProductEvent(supabase, {
    eventName: "signin_completed",
    userId: user.id,
    metadata: {
      email
    }
  });

  const redirectPath = await getPostAuthRedirectPath(user);
  redirect(redirectPath);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function completeOnboardingAction(
  _state: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const circleName = String(formData.get("circleName") ?? "").trim();
  const circleDescription = String(formData.get("circleDescription") ?? "").trim();
  const membersInput = String(formData.get("members") ?? "");
  const slots = formData.getAll("slots").map(String);

  if (!circleName || !fullName) {
    return {
      status: "error",
      message: "Your name and a Family Circle name are required."
    };
  }

  const existingMembership = await supabase
    .from("family_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingMembership.data) {
    redirect("/dashboard");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      timezone: "America/Chicago"
    });

  if (profileError) {
    return { status: "error", message: profileError.message };
  }

  const circleResponse = await supabase
    .from("family_circles")
    .insert({
      name: circleName,
      description: circleDescription || null,
      created_by: user.id
    })
    .select("id")
    .single();

  if (circleResponse.error) {
    return { status: "error", message: circleResponse.error.message };
  }

  const ownerMembershipResponse = await supabase
    .from("family_memberships")
    .insert({
      family_circle_id: circleResponse.data.id,
      user_id: user.id,
      display_name: fullName,
      invite_email: user.email ?? null,
      status: "active",
      role: "owner"
    })
    .select("id")
    .single();

  if (ownerMembershipResponse.error) {
    return { status: "error", message: ownerMembershipResponse.error.message };
  }

  const memberRows = membersInput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [displayName, inviteEmail, relationship] = line
        .split(",")
        .map((part) => part.trim());

      return {
        family_circle_id: circleResponse.data.id,
        display_name: displayName,
        invite_email: inviteEmail ? inviteEmail.toLowerCase() : null,
        relationship_label: relationship || null,
        status: "invited" as const,
        role: "member" as const
      };
    })
    .filter((row) => row.display_name);

  if (memberRows.length) {
    const memberInsert = await supabase.from("family_memberships").insert(memberRows);
    if (memberInsert.error) {
      return { status: "error", message: memberInsert.error.message };
    }

    if (hasSupabaseServiceRoleEnv()) {
      const admin = createSupabaseAdminClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      await Promise.allSettled(
        memberRows
          .filter((m) => m.invite_email)
          .map((m) =>
            admin.auth.admin.inviteUserByEmail(m.invite_email!, {
              data: { full_name: m.display_name },
              redirectTo: `${siteUrl}/auth/callback`
            })
          )
      );
    }
  }

  const availabilityRows = slots.map((slot) => {
    const [weekday, startHour, endHour] = slot.split("|").map(Number);
    return {
      family_circle_id: circleResponse.data.id,
      membership_id: ownerMembershipResponse.data.id,
      user_id: user.id,
      weekday,
      start_hour: startHour,
      end_hour: endHour
    };
  });

  if (availabilityRows.length) {
    const availabilityInsert = await supabase
      .from("availability_windows")
      .insert(availabilityRows);
    if (availabilityInsert.error) {
      return { status: "error", message: availabilityInsert.error.message };
    }
  }

  await supabase.from("family_activity").insert([
    {
      family_circle_id: circleResponse.data.id,
      actor_membership_id: ownerMembershipResponse.data.id,
      activity_type: "circle_created",
      summary: `${fullName} created the Family Circle "${circleName}".`
    },
    {
      family_circle_id: circleResponse.data.id,
      actor_membership_id: ownerMembershipResponse.data.id,
      activity_type: "availability_added",
      summary: `${fullName} shared their first availability windows.`
    }
  ]);

  if (memberRows.length) {
    await supabase.from("family_activity").insert({
      family_circle_id: circleResponse.data.id,
      actor_membership_id: ownerMembershipResponse.data.id,
      activity_type: "members_invited",
      summary: `${memberRows.length} family member${memberRows.length === 1 ? "" : "s"} were invited to join.`
    });
  }

  await trackProductEvent(supabase, {
    eventName: "family_circle_created",
    userId: user.id,
    familyCircleId: circleResponse.data.id,
    metadata: {
      invitedCount: memberRows.length
    }
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function saveMemberAvailabilityAction(
  _state: AvailabilityState,
  formData: FormData
): Promise<AvailabilityState> {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const membershipResponse = await supabase
    .from("family_memberships")
    .select("id, family_circle_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membershipResponse.data) {
    return {
      status: "error",
      message: "We couldn't find an active Family Circle membership for this account."
    };
  }
  const membership = membershipResponse.data;

  const slots = [...new Set(formData.getAll("slots").map(String).filter(Boolean))];
  const parsedSlots = slots.map((slot) => {
    const [weekday, startHour, endHour] = slot.split("|").map(Number);
    return { weekday, startHour, endHour };
  });

  const hasInvalidSlot = parsedSlots.some(
    (slot) =>
      !Number.isInteger(slot.weekday) ||
      !Number.isInteger(slot.startHour) ||
      !Number.isInteger(slot.endHour) ||
      slot.weekday < 0 ||
      slot.weekday > 6 ||
      slot.startHour < 0 ||
      slot.startHour > 23 ||
      slot.endHour < 1 ||
      slot.endHour > 24 ||
      slot.endHour <= slot.startHour
  );

  if (hasInvalidSlot) {
    return {
      status: "error",
      message: "One of those availability windows was not valid. Please try again."
    };
  }

  const deleteResponse = await supabase
    .from("availability_windows")
    .delete()
    .eq("family_circle_id", membership.family_circle_id)
    .eq("membership_id", membership.id)
    .eq("user_id", user.id);

  if (deleteResponse.error) {
    return {
      status: "error",
      message: deleteResponse.error.message
    };
  }

  if (parsedSlots.length) {
    const insertResponse = await supabase.from("availability_windows").insert(
      parsedSlots.map((slot) => ({
        family_circle_id: membership.family_circle_id,
        membership_id: membership.id,
        user_id: user.id,
        weekday: slot.weekday,
        start_hour: slot.startHour,
        end_hour: slot.endHour
      }))
    );

    if (insertResponse.error) {
      return {
        status: "error",
        message: insertResponse.error.message
      };
    }
  }

  await supabase.from("family_activity").insert({
    family_circle_id: membership.family_circle_id,
    actor_membership_id: membership.id,
    activity_type: parsedSlots.length ? "availability_updated" : "availability_cleared",
    summary: parsedSlots.length
      ? "Availability was updated to reflect a new weekly rhythm."
      : "Availability was cleared for now."
  });

  await trackProductEvent(supabase, {
    eventName: "availability_saved",
    userId: user.id,
    familyCircleId: membership.family_circle_id,
    metadata: {
      slotsSaved: parsedSlots.length
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/availability");

  return {
    status: "success",
    message: parsedSlots.length
      ? "Availability saved. Your Family Circle can use these windows for the next overlap."
      : "Availability cleared. You can add new windows whenever your schedule settles."
  };
}

export async function scheduleSuggestedCallAction(formData: FormData) {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const title = String(formData.get("title") ?? "").trim() || "Family Connections call";
  const scheduledStart = String(formData.get("scheduledStart") ?? "");
  const scheduledEnd = String(formData.get("scheduledEnd") ?? "");

  if (!familyCircleId || !scheduledStart || !scheduledEnd) {
    redirect("/dashboard?status=schedule-missing");
  }

  const family = await getViewerFamilyCircle(user.id);
  if (!family || family.circle.id !== familyCircleId || family.membership.status !== "active") {
    redirect("/dashboard?status=schedule-forbidden");
  }

  const [membershipsResponse, windowsResponse] = await Promise.all([
    supabase
      .from("family_memberships")
      .select("id, user_id, display_name, status, profiles(email, timezone)")
      .eq("family_circle_id", familyCircleId)
      .eq("status", "active"),
    supabase
      .from("availability_windows")
      .select("weekday, start_hour, end_hour, membership_id")
      .eq("family_circle_id", familyCircleId)
  ]);

  const matchedSuggestion = buildSuggestions(
    windowsResponse.data ?? [],
    membershipsResponse.data ?? []
  ).find(
    (suggestion) =>
      suggestion.start_at === scheduledStart && suggestion.end_at === scheduledEnd
  );

  if (!matchedSuggestion) {
    redirect("/dashboard?status=schedule-stale");
  }

  const callInsert = await supabase
    .from("call_sessions")
    .insert({
      family_circle_id: familyCircleId,
      title,
      scheduled_start: matchedSuggestion.start_at,
      scheduled_end: matchedSuggestion.end_at,
      reminder_status: "pending",
      created_by: user.id
    })
    .select("id")
    .single();

  if (callInsert.error) {
    redirect("/dashboard?status=schedule-error");
  }

  const participants = matchedSuggestion.participant_ids.map((membershipId) => ({
    call_session_id: callInsert.data.id,
    membership_id: membershipId
  }));

  if (participants.length) {
    await supabase.from("call_participants").insert(participants);
  }

  const notificationRecipients = (membershipsResponse.data ?? [])
    .filter((membership) => matchedSuggestion.participant_ids.includes(membership.id))
    .filter((membership) => membership.user_id)
    .map((membership) => {
      const profileRecord = membership.profiles as
        | { email: string | null; timezone: string }[]
        | { email: string | null; timezone: string }
        | null;

      return {
        userId: membership.user_id as string,
        displayName: membership.display_name,
        email: Array.isArray(profileRecord)
          ? profileRecord[0]?.email ?? null
          : profileRecord?.email ?? null,
        timezone: Array.isArray(profileRecord)
          ? profileRecord[0]?.timezone ?? "America/Chicago"
          : profileRecord?.timezone ?? "America/Chicago"
      };
    });

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: family.membership.id,
    activity_type: "call_scheduled",
    summary: `${title} was scheduled for ${new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(matchedSuggestion.start_at))}.`
  });

  await createNotifications(supabase, {
    familyCircleId,
    callSessionId: callInsert.data.id,
    type: "call_scheduled",
    title: `${title} is on the calendar`,
    body: `A new family call is set for ${new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(matchedSuggestion.start_at))}.`,
    ctaLabel: "Open call",
    ctaHref: `/calls/${callInsert.data.id}`,
    dedupeKeyPrefix: `call-scheduled:${callInsert.data.id}`,
    recipients: notificationRecipients
  });

  await trackProductEvent(supabase, {
    eventName: "call_scheduled",
    userId: user.id,
    familyCircleId,
    callSessionId: callInsert.data.id
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?status=call-scheduled");
}

export async function saveMeetingLinkAction(
  _state: CallLinkState,
  formData: FormData
): Promise<CallLinkState> {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const callId = String(formData.get("callId") ?? "");
  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const meetingProviderInput = String(formData.get("meetingProvider") ?? "").trim();
  const meetingUrlInput = String(formData.get("meetingUrl") ?? "").trim();

  if (!callId || !familyCircleId) {
    return {
      status: "error",
      message: "We couldn't find the scheduled call to update."
    };
  }

  const family = await getViewerFamilyCircle(user.id);
  if (!family || family.circle.id !== familyCircleId || family.membership.status !== "active") {
    return {
      status: "error",
      message: "Only active family members can manage join links for this Family Circle."
    };
  }

  const meetingUrl = meetingUrlInput ? normalizeMeetingUrl(meetingUrlInput) : null;
  if (meetingUrlInput && !meetingUrl) {
    return {
      status: "error",
      message: "Please add a valid meeting URL so your family has a safe place to join."
    };
  }

  const meetingProvider =
    meetingUrl && !meetingProviderInput ? inferMeetingProvider(meetingUrl) : meetingProviderInput || null;

  const updateResponse = await supabase
    .from("call_sessions")
    .update({
      meeting_provider: meetingProvider,
      meeting_url: meetingUrl,
      reminder_status: "pending",
      reminder_sent_at: null
    })
    .eq("id", callId)
    .eq("family_circle_id", familyCircleId)
    .eq("status", "scheduled");

  if (updateResponse.error) {
    return {
      status: "error",
      message: updateResponse.error.message
    };
  }

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: family.membership.id,
    activity_type: meetingUrl ? "meeting_link_saved" : "meeting_link_removed",
    summary: meetingUrl
      ? `${meetingProvider ?? "A join link"} was added to an upcoming family call.`
      : "The join link was cleared from an upcoming family call."
  });

  if (meetingUrl) {
    await dismissCallNotifications(supabase, callId, ["missing_join_link_warning"]);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/calls/${callId}`);

  return {
    status: "success",
    message: meetingUrl
      ? "Join link saved. Your Family Circle can head there when it is time."
      : "Join link removed. You can add a new one anytime before the call."
  };
}

export async function saveScheduledCallDetailsAction(
  _state: CallDetailsState,
  formData: FormData
): Promise<CallDetailsState> {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const callId = String(formData.get("callId") ?? "");
  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const meetingProviderInput = String(formData.get("meetingProvider") ?? "").trim();
  const meetingUrlInput = String(formData.get("meetingUrl") ?? "").trim();
  const scheduledStartLocal = String(formData.get("scheduledStartLocal") ?? "").trim();
  const scheduledEndLocal = String(formData.get("scheduledEndLocal") ?? "").trim();
  const viewerTimezone = String(formData.get("viewerTimezone") ?? "").trim() || "America/Chicago";

  if (!callId || !familyCircleId || !title) {
    return {
      status: "error",
      message: "A call title is required before this family moment can be updated."
    };
  }

  const family = await getViewerFamilyCircle(user.id);
  if (!family || family.circle.id !== familyCircleId || family.membership.status !== "active") {
    return {
      status: "error",
      message: "Only active family members can manage scheduled calls for this Family Circle."
    };
  }

  const meetingUrl = meetingUrlInput ? normalizeMeetingUrl(meetingUrlInput) : null;
  if (meetingUrlInput && !meetingUrl) {
    return {
      status: "error",
      message: "Please add a valid meeting URL so your family has a safe place to join."
    };
  }

  const meetingProvider =
    meetingUrl && !meetingProviderInput ? inferMeetingProvider(meetingUrl) : meetingProviderInput || null;

  const wantsReschedule = Boolean(scheduledStartLocal || scheduledEndLocal);
  if (wantsReschedule && (!scheduledStartLocal || !scheduledEndLocal)) {
    return {
      status: "error",
      message: "Choose both a new start and end time before rescheduling this family call."
    };
  }

  const scheduledStartUtc = wantsReschedule
    ? convertLocalDateTimeToUtc(scheduledStartLocal, viewerTimezone)
    : null;
  const scheduledEndUtc = wantsReschedule
    ? convertLocalDateTimeToUtc(scheduledEndLocal, viewerTimezone)
    : null;

  if (wantsReschedule && (!scheduledStartUtc || !scheduledEndUtc)) {
    return {
      status: "error",
      message: "That new time could not be understood. Please try again with a valid date and time."
    };
  }

  if (
    scheduledStartUtc &&
    scheduledEndUtc &&
    (new Date(scheduledStartUtc).getTime() >= new Date(scheduledEndUtc).getTime() ||
      new Date(scheduledStartUtc).getTime() <= Date.now())
  ) {
    return {
      status: "error",
      message: "Pick a future window where the end comes after the start."
    };
  }

  const callResponse = await supabase
    .from("call_sessions")
    .select("id, scheduled_start, scheduled_end, status")
    .eq("id", callId)
    .eq("family_circle_id", familyCircleId)
    .maybeSingle();

  if (!callResponse.data) {
    return {
      status: "error",
      message: "We couldn't find that scheduled call."
    };
  }

  if (wantsReschedule && callResponse.data.status !== "scheduled") {
    return {
      status: "error",
      message: "Only future scheduled calls can be intentionally moved to a new time."
    };
  }

  const updateResponse = await supabase
    .from("call_sessions")
    .update({
      title,
      meeting_provider: meetingProvider,
      meeting_url: meetingUrl,
      scheduled_start: scheduledStartUtc ?? undefined,
      scheduled_end: scheduledEndUtc ?? undefined,
      recovery_dismissed_at: null,
      reminder_status: "pending",
      reminder_sent_at: null
    })
    .eq("id", callId)
    .eq("family_circle_id", familyCircleId)
    .eq("status", "scheduled");

  if (updateResponse.error) {
    return {
      status: "error",
      message: updateResponse.error.message
    };
  }

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: family.membership.id,
    activity_type: wantsReschedule ? "call_rescheduled" : "call_updated",
    summary: wantsReschedule
      ? `${title} was moved to ${new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: viewerTimezone
        }).format(new Date(scheduledStartUtc!))}.`
      : meetingUrl
        ? `${title} was updated with a fresh join link for the Family Circle.`
        : `${title} was updated for the Family Circle.`
  });

  if (meetingUrl) {
    await dismissCallNotifications(supabase, callId, ["missing_join_link_warning"]);
  }

  if (wantsReschedule) {
    await resetScheduledCallNotifications(supabase, callId);

    const participantsResponse = await supabase
      .from("call_participants")
      .select("membership_id")
      .eq("call_session_id", callId);
    const participantIds = (participantsResponse.data ?? []).map((participant) => participant.membership_id);

    if (participantIds.length) {
      const membershipRecipients = await supabase
        .from("family_memberships")
        .select("id, user_id, display_name, profiles(email, timezone)")
        .eq("family_circle_id", familyCircleId)
        .eq("status", "active")
        .in("id", participantIds);

      await createNotifications(supabase, {
        familyCircleId,
        callSessionId: callId,
        type: "call_scheduled",
        title: `${title} has a new time`,
        body: `Your Family Circle now has ${title} set for ${new Intl.DateTimeFormat(
          "en-US",
          {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZone: viewerTimezone
          }
        ).format(new Date(scheduledStartUtc!))}.`,
        ctaLabel: "Open call",
        ctaHref: `/calls/${callId}`,
        dedupeKeyPrefix: `call-rescheduled-update:${callId}:${Date.now()}`,
        recipients: (membershipRecipients.data ?? [])
          .filter((membership) => membership.user_id)
          .map((membership) => {
            const profileRecord = membership.profiles as
              | { email: string | null; timezone: string }[]
              | { email: string | null; timezone: string }
              | null;

            return {
              userId: membership.user_id as string,
              displayName: membership.display_name,
              email: Array.isArray(profileRecord)
                ? profileRecord[0]?.email ?? null
                : profileRecord?.email ?? null,
              timezone: Array.isArray(profileRecord)
                ? profileRecord[0]?.timezone ?? "America/Chicago"
                : profileRecord?.timezone ?? "America/Chicago"
            };
          })
      });
    }
  }

  revalidatePath(`/calls/${callId}`);
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: wantsReschedule
      ? "Call details saved. Kynfowk reset the schedule and reminder timing for this family moment."
      : meetingUrl
        ? "Call details saved. Your circle now has an updated title and join link."
        : "Call details saved. You can add a join link any time before the call."
  };
}

export async function markCallCompletedAction(
  _state: CallCompletionState,
  formData: FormData
): Promise<CallCompletionState> {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const callId = String(formData.get("callId") ?? "");
  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const duration = Number(formData.get("durationMinutes") ?? 45);
  const attendedMembershipIds = new Set(
    formData.getAll("attendedMembershipIds").map(String).filter(Boolean)
  );

  if (!callId || !familyCircleId) {
    return {
      status: "error",
      message: "We couldn't find the call you wanted to complete."
    };
  }

  const family = await getViewerFamilyCircle(user.id);
  if (!family || family.circle.id !== familyCircleId || family.membership.status !== "active") {
    return {
      status: "error",
      message: "Only active family members can complete calls for this Family Circle."
    };
  }

  const participantsResponse = await supabase
    .from("call_participants")
    .select("membership_id")
    .eq("call_session_id", callId);
  const callResponse = await supabase
    .from("call_sessions")
    .select("actual_started_at, scheduled_start")
    .eq("id", callId)
    .eq("family_circle_id", familyCircleId)
    .maybeSingle();

  const scheduledMembershipIds = (participantsResponse.data ?? []).map(
    (participant) => participant.membership_id
  );

  if (!scheduledMembershipIds.length) {
    return {
      status: "error",
      message: "This scheduled call does not have any participants to mark."
    };
  }

  const hasUnexpectedAttendance = [...attendedMembershipIds].some(
    (membershipId) => !scheduledMembershipIds.includes(membershipId)
  );

  if (hasUnexpectedAttendance) {
    return {
      status: "error",
      message: "One of the selected family members was not part of this scheduled call."
    };
  }

  const normalizedDuration = Number.isFinite(duration) && duration >= 5 ? duration : 45;
  const actualEndedAt = new Date().toISOString();
  const actualStartedAt =
    callResponse.data?.actual_started_at ??
    new Date(Date.now() - normalizedDuration * 60_000).toISOString();

  const callUpdate = await supabase
    .from("call_sessions")
    .update({
      status: "completed",
      actual_duration_minutes: normalizedDuration,
      actual_started_at: actualStartedAt,
      actual_ended_at: actualEndedAt,
      recovery_dismissed_at: null,
      reminder_status: "not_needed"
    })
    .eq("id", callId)
    .eq("family_circle_id", familyCircleId)
    .in("status", ["scheduled", "live"]);

  if (callUpdate.error) {
    return {
      status: "error",
      message: callUpdate.error.message
    };
  }

  const attendanceUpdates = scheduledMembershipIds.map((membershipId) =>
    supabase
      .from("call_participants")
      .update({
        attended: attendedMembershipIds.has(membershipId)
      })
      .eq("call_session_id", callId)
      .eq("membership_id", membershipId)
  );

  const attendanceResults = await Promise.all(attendanceUpdates);
  const attendanceError = attendanceResults.find((result) => result.error)?.error;
  if (attendanceError) {
    return {
      status: "error",
      message: attendanceError.message
    };
  }

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: family.membership.id,
    activity_type: "call_completed",
    summary: `A family call was marked complete with ${normalizedDuration} minutes of Time Together and ${attendedMembershipIds.size} family member${attendedMembershipIds.size === 1 ? "" : "s"} present.`
  });

  await dismissCallNotifications(supabase, callId, [
    "reminder_24h_before",
    "reminder_15m_before",
    "starting_now",
    "missing_join_link_warning",
    "call_passed_without_completion"
  ]);

  await trackProductEvent(supabase, {
    eventName: "call_completed",
    userId: user.id,
    familyCircleId,
    callSessionId: callId,
    metadata: {
      durationMinutes: normalizedDuration,
      attendees: attendedMembershipIds.size
    }
  });

  revalidatePath("/dashboard");
  revalidatePath(`/calls/${callId}`);
  redirect(`/dashboard?status=call-completed&recap=${callId}`);
}

export async function cancelCallAction(formData: FormData) {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const callId = String(formData.get("callId") ?? "");
  const familyCircleId = String(formData.get("familyCircleId") ?? "");

  if (!callId || !familyCircleId) {
    redirect("/dashboard" as Route);
  }

  const family = await getViewerFamilyCircle(user.id);
  if (!family || family.circle.id !== familyCircleId || family.membership.status !== "active") {
    redirect(`/calls/${callId}` as Route);
  }

  await supabase
    .from("call_sessions")
    .update({
      status: "canceled",
      reminder_status: "not_needed"
    })
    .eq("id", callId)
    .eq("family_circle_id", familyCircleId)
    .in("status", ["scheduled", "live"]);

  await dismissCallNotifications(supabase, callId, [
    "reminder_24h_before",
    "reminder_15m_before",
    "starting_now",
    "missing_join_link_warning",
    "call_passed_without_completion"
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/calls/${callId}`);
  redirect(`/dashboard?status=call-canceled` as Route);
}

export async function markCallReminderSentAction(formData: FormData) {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const callId = String(formData.get("callId") ?? "");
  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const returnPath = String(formData.get("returnPath") ?? "/dashboard");
  const redirectWithStatus = (status: string): never => {
    redirect(`${returnPath}?status=${status}` as Route);
  };

  if (!callId || !familyCircleId) {
    redirectWithStatus("reminder-error");
  }

  const family = await getViewerFamilyCircle(user.id);
  if (!family || family.circle.id !== familyCircleId || family.membership.status !== "active") {
    redirectWithStatus("schedule-forbidden");
  }
  const activeFamily = family!;

  const updateResponse = await supabase
    .from("call_sessions")
    .update({
      reminder_status: "sent",
      reminder_sent_at: new Date().toISOString()
    })
    .eq("id", callId)
    .eq("family_circle_id", familyCircleId)
    .in("status", ["scheduled", "live"]);

  if (updateResponse.error) {
    redirectWithStatus("reminder-error");
  }

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: activeFamily.membership.id,
    activity_type: "call_reminder_marked",
    summary: "A family call reminder was marked as sent so everyone has a gentle nudge."
  });

  revalidatePath("/dashboard");
  revalidatePath(`/calls/${callId}`);
  redirectWithStatus("reminder-sent");
}

export async function dismissMissedCallRecoveryAction(formData: FormData) {
  const user = await requireViewer();
  const callId = String(formData.get("callId") ?? "");
  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const returnPath = String(formData.get("returnPath") ?? "/dashboard");
  const redirectWithStatus = (status: string): never => {
    redirect(`${returnPath}?status=${status}` as Route);
  };

  if (!callId || !familyCircleId) {
    redirectWithStatus("recovery-error");
  }

  const { supabase, family, call } = await getRecoverableCallContext({
    userId: user.id,
    familyCircleId,
    callId
  });

  if (!family || !call) {
    redirectWithStatus("schedule-forbidden");
  }
  const activeFamily = family!;
  const recoverableCall = call!;

  if (recoverableCall.status === "completed" || recoverableCall.status === "canceled") {
    redirectWithStatus("recovery-dismissed");
  }

  const isPastDue = new Date(recoverableCall.scheduled_end).getTime() < Date.now();
  if (!isPastDue) {
    redirectWithStatus("recovery-dismissed");
  }

  const dismissedAt = new Date().toISOString();
  const updateResponse = await supabase
    .from("call_sessions")
    .update({
      recovery_dismissed_at: dismissedAt
    })
    .eq("id", callId)
    .eq("family_circle_id", familyCircleId)
    .in("status", ["scheduled", "live"]);

  if (updateResponse.error) {
    redirectWithStatus("recovery-error");
  }

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: activeFamily.membership.id,
    activity_type: "call_recovery_dismissed",
    summary: `${recoverableCall.title} was cleared from the missed-call list for now.`
  });

  await dismissCallNotifications(supabase, callId, ["call_passed_without_completion"]);

  revalidatePath("/dashboard");
  revalidatePath(`/calls/${callId}`);
  redirectWithStatus("recovery-dismissed");
}

export async function rescheduleMissedCallAction(formData: FormData) {
  const user = await requireViewer();
  const callId = String(formData.get("callId") ?? "");
  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const returnPath = String(formData.get("returnPath") ?? "/dashboard");
  const redirectWithStatus = (status: string): never => {
    redirect(`${returnPath}?status=${status}` as Route);
  };

  if (!callId || !familyCircleId) {
    redirectWithStatus("recovery-error");
  }

  const { supabase, family, call, participants } = await getRecoverableCallContext({
    userId: user.id,
    familyCircleId,
    callId
  });

  if (!family || !call) {
    redirectWithStatus("schedule-forbidden");
  }
  const activeFamily = family!;
  const recoverableCall = call!;

  if (recoverableCall.status === "completed" || recoverableCall.status === "canceled") {
    redirectWithStatus("recovery-error");
  }

  if (new Date(recoverableCall.scheduled_end).getTime() >= Date.now()) {
    redirectWithStatus("recovery-error");
  }

  const participantIds = participants.map((participant) => participant.membership_id);
  if (!participantIds.length) {
    redirectWithStatus("recovery-error");
  }

  const rescheduledStart = new Date(recoverableCall.scheduled_start);
  rescheduledStart.setDate(rescheduledStart.getDate() + 7);
  const durationMs = Math.max(
    new Date(recoverableCall.scheduled_end).getTime() -
      new Date(recoverableCall.scheduled_start).getTime(),
    15 * 60 * 1000
  );
  const rescheduledEnd = new Date(rescheduledStart.getTime() + durationMs);

  const callInsert = await supabase
    .from("call_sessions")
    .insert({
      family_circle_id: familyCircleId,
      title: recoverableCall.title,
      scheduled_start: rescheduledStart.toISOString(),
      scheduled_end: rescheduledEnd.toISOString(),
      reminder_status: "pending",
      created_by: user.id
    })
    .select("id")
    .single();

  if (callInsert.error) {
    redirectWithStatus("recovery-error");
  }
  const newCallId = callInsert.data!.id;

  const participantInsert = await supabase.from("call_participants").insert(
    participantIds.map((membershipId) => ({
      call_session_id: newCallId,
      membership_id: membershipId
    }))
  );

  if (participantInsert.error) {
    redirectWithStatus("recovery-error");
  }

  const originalCallUpdate = await supabase
    .from("call_sessions")
    .update({
      status: "canceled",
      recovery_dismissed_at: new Date().toISOString(),
      reminder_status: "not_needed"
    })
    .eq("id", callId)
    .eq("family_circle_id", familyCircleId)
    .in("status", ["scheduled", "live"]);

  if (originalCallUpdate.error) {
    redirectWithStatus("recovery-error");
  }

  const membershipRecipients = await supabase
    .from("family_memberships")
    .select("id, user_id, display_name, profiles(email, timezone)")
    .eq("family_circle_id", familyCircleId)
    .eq("status", "active")
    .in("id", participantIds);

  const notificationRecipients = (membershipRecipients.data ?? [])
    .filter((membership) => membership.user_id)
    .map((membership) => {
      const profileRecord = membership.profiles as
        | { email: string | null; timezone: string }[]
        | { email: string | null; timezone: string }
        | null;

      return {
        userId: membership.user_id as string,
        displayName: membership.display_name,
        email: Array.isArray(profileRecord)
          ? profileRecord[0]?.email ?? null
          : profileRecord?.email ?? null,
        timezone: Array.isArray(profileRecord)
          ? profileRecord[0]?.timezone ?? "America/Chicago"
          : profileRecord?.timezone ?? "America/Chicago"
      };
    });

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: activeFamily.membership.id,
    activity_type: "call_rescheduled",
    summary: `${recoverableCall.title} was rescheduled for ${new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(rescheduledStart)} so the same family group has another chance to connect.`
  });

  await createNotifications(supabase, {
    familyCircleId,
    callSessionId: newCallId,
    type: "call_scheduled",
    title: `${recoverableCall.title} has a fresh time`,
    body: `Your Family Circle has another chance to connect on ${new Intl.DateTimeFormat(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }
    ).format(rescheduledStart)}.`,
    ctaLabel: "Open call",
    ctaHref: `/calls/${newCallId}`,
    dedupeKeyPrefix: `call-rescheduled:${callId}:${newCallId}`,
    recipients: notificationRecipients
  });

  await dismissCallNotifications(supabase, callId, [
    "reminder_24h_before",
    "reminder_15m_before",
    "starting_now",
    "missing_join_link_warning",
    "call_passed_without_completion"
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/calls/${callId}`);
  revalidatePath(`/calls/${newCallId}`);
  redirectWithStatus("recovery-rescheduled");
}

export interface RecapState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function saveCallRecapAction(
  _state: RecapState,
  formData: FormData
): Promise<RecapState> {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const callId = String(formData.get("callId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const highlight = String(formData.get("highlight") ?? "").trim();
  const nextStep = String(formData.get("nextStep") ?? "").trim();
  const familyCircleId = String(formData.get("familyCircleId") ?? "");

  if (!callId || !familyCircleId) {
    return {
      status: "error",
      message: "We couldn't find the call to summarize."
    };
  }

  const recapUpsert = await supabase.from("call_recaps").upsert(
    {
      call_session_id: callId,
      summary: summary || null,
      highlight: highlight || null,
      next_step: nextStep || null,
      created_by: user.id
    },
    { onConflict: "call_session_id" }
  );

  if (recapUpsert.error) {
    return {
      status: "error",
      message: recapUpsert.error.message
    };
  }

  const ownerMembership = await supabase
    .from("family_memberships")
    .select("id, family_circle_id")
    .eq("family_circle_id", familyCircleId)
    .eq("user_id", user.id)
    .maybeSingle();

  const membershipRecipients = await supabase
    .from("family_memberships")
    .select("user_id, display_name, profiles(email, timezone)")
    .eq("family_circle_id", familyCircleId)
    .eq("status", "active");

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: ownerMembership.data?.id ?? null,
    activity_type: "recap_saved",
    summary: highlight
      ? `A post-call summary was saved: ${highlight}`
      : "A post-call summary was saved for the latest family call."
  });

  await createNotifications(supabase, {
    familyCircleId,
    callSessionId: callId,
    type: "recap_posted",
    title: "A new recap is ready",
    body: highlight
      ? `A fresh family recap was posted: ${highlight}`
      : "A fresh family recap was posted so everyone can revisit what mattered most.",
    ctaLabel: "Open recap",
    ctaHref: `/calls/${callId}`,
    dedupeKeyPrefix: `recap-posted:${callId}:${Date.now()}`,
    recipients: (membershipRecipients.data ?? [])
      .filter((membership) => membership.user_id)
      .map((membership) => {
        const profileRecord = membership.profiles as
          | { email: string | null; timezone: string }[]
          | { email: string | null; timezone: string }
          | null;

        return {
          userId: membership.user_id as string,
          displayName: membership.display_name,
          email: Array.isArray(profileRecord)
            ? profileRecord[0]?.email ?? null
            : profileRecord?.email ?? null,
          timezone: Array.isArray(profileRecord)
            ? profileRecord[0]?.timezone ?? "America/Chicago"
            : profileRecord?.timezone ?? "America/Chicago"
        };
      })
  });

  await trackProductEvent(supabase, {
    eventName: "recap_saved",
    userId: user.id,
    familyCircleId,
    callSessionId: callId
  });

  revalidatePath("/dashboard");
  return {
    status: "success",
    message: "Post-call summary saved."
  };
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const notificationId = String(formData.get("notificationId") ?? "");
  const returnPath = String(formData.get("returnPath") ?? "/dashboard");

  if (!notificationId) {
    redirect(returnPath as Route);
  }

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  redirect(returnPath as Route);
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const returnPath = String(formData.get("returnPath") ?? "/notifications");
  const redirectPath = `${returnPath}${returnPath.includes("?") ? "&" : "?"}status=notifications-read`;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  redirect(redirectPath as Route);
}

export async function saveProfileSettingsAction(
  _state: ProfileSettingsState,
  formData: FormData
): Promise<ProfileSettingsState> {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim() || "America/Chicago";
  const quietHoursStart = String(formData.get("quietHoursStart") ?? "").trim();
  const quietHoursEnd = String(formData.get("quietHoursEnd") ?? "").trim();
  const parseQuietHour = (value: string) => {
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : null;
  };

  if (!fullName) {
    return {
      status: "error",
      message: "Add the name you want your Family Circle to see."
    };
  }

  const [profileResponse, preferencesResponse] = await Promise.all([
    supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      timezone
    }),
    supabase.from("notification_preferences").upsert({
      user_id: user.id,
      timezone,
      quiet_hours_start: parseQuietHour(quietHoursStart),
      quiet_hours_end: parseQuietHour(quietHoursEnd)
    })
  ]);

  if (profileResponse.error) {
    return {
      status: "error",
      message: profileResponse.error.message
    };
  }

  if (preferencesResponse.error) {
    return {
      status: "error",
      message: preferencesResponse.error.message
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/settings");

  return {
    status: "success",
    message: "Profile details saved. Kynfowk will use this timezone for displays and reminder timing."
  };
}

export async function saveNotificationPreferencesAction(
  _state: NotificationPreferencesState,
  formData: FormData
): Promise<NotificationPreferencesState> {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const timezone = String(formData.get("timezone") ?? "").trim() || "America/Chicago";
  const quietHoursStart = String(formData.get("quietHoursStart") ?? "").trim();
  const quietHoursEnd = String(formData.get("quietHoursEnd") ?? "").trim();
  const parseQuietHour = (value: string) => {
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : null;
  };

  const updateResponse = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    in_app_enabled: formData.get("inAppEnabled") === "on",
    email_enabled: formData.get("emailEnabled") === "on",
    weekly_digest_enabled: formData.get("weeklyDigestEnabled") === "on",
    reminder_24h_enabled: formData.get("reminder24hEnabled") === "on",
    reminder_15m_enabled: formData.get("reminder15mEnabled") === "on",
    starting_now_enabled: formData.get("startingNowEnabled") === "on",
    push_enabled: formData.get("pushEnabled") === "on",
    quiet_hours_start: parseQuietHour(quietHoursStart),
    quiet_hours_end: parseQuietHour(quietHoursEnd),
    timezone
  });

  await supabase.from("profiles").update({ timezone }).eq("id", user.id);

  if (updateResponse.error) {
    return {
      status: "error",
      message: updateResponse.error.message
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/settings");
  return {
    status: "success",
    message: "Notification settings saved. Kynfowk will follow this rhythm for future nudges."
  };
}

export async function savePilotFeedbackAction(
  _state: FeedbackState,
  formData: FormData
): Promise<FeedbackState> {
  const user = await requireViewer();
  const supabase = await createSupabaseServerClient();

  const category = String(formData.get("category") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const pagePath = String(formData.get("pagePath") ?? "").trim() || null;
  const callSessionId = String(formData.get("callSessionId") ?? "").trim() || null;
  const familyCircleId = String(formData.get("familyCircleId") ?? "").trim() || null;

  if (!["bug", "confusing", "suggestion", "positive"].includes(category) || !message) {
    return {
      status: "error",
      message: "Choose a feedback type and share a few words so the Kynfowk team can learn from it."
    };
  }

  const response = await savePilotFeedback(supabase, {
    userId: user.id,
    category: category as "bug" | "confusing" | "suggestion" | "positive",
    message,
    pagePath,
    callSessionId,
    familyCircleId
  });

  if (response.error) {
    return {
      status: "error",
      message: response.error.message
    };
  }

  revalidatePath("/admin");
  revalidatePath("/feedback");

  return {
    status: "success",
    message: "Thanks. Your note is saved for the pilot team to review."
  };
}

export async function triggerNotificationSweepAction(
  _state: AdminOpsState
): Promise<AdminOpsState> {
  await requireAdminViewer();

  if (!hasSupabaseServiceRoleEnv()) {
    return {
      status: "error",
      message: "Supabase service-role setup is still missing, so the manual sweep cannot run yet."
    };
  }

  const admin = createSupabaseAdminClient();
  const result = await sweepAllNotifications(admin);

  revalidatePath("/admin");

  return {
    status: "success",
    message: `Sweep finished. ${result.notificationsCreated} notification(s), ${result.emailDeliveriesSent} email delivery update(s), and ${result.pushDeliveriesUpdated} push delivery update(s) were processed.`
  };
}

export async function updateFamilyMemberAction(formData: FormData) {
  const user = await requireViewer();
  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const relationshipLabel = String(formData.get("relationshipLabel") ?? "").trim();

  const redirectWithStatus = (status: string): never => {
    redirect(`/family?status=${status}` as Route);
  };

  if (!familyCircleId || !membershipId || !displayName) {
    redirectWithStatus("family-member-error");
  }

  const { supabase, family } = await requireOwnerFamilyContext(user.id, familyCircleId);
  if (!family) {
    redirectWithStatus("family-member-forbidden");
  }
  const ownerFamily = family!;

  const updateResponse = await supabase
    .from("family_memberships")
    .update({
      display_name: displayName,
      relationship_label: relationshipLabel || null
    })
    .eq("id", membershipId)
    .eq("family_circle_id", familyCircleId);

  if (updateResponse.error) {
    redirectWithStatus("family-member-error");
  }

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: ownerFamily.membership.id,
    activity_type: "member_updated",
    summary: `${displayName}'s family details were refreshed.`
  });

  revalidatePath("/family");
  revalidatePath("/dashboard");
  redirectWithStatus("family-member-saved");
}

export async function resendFamilyInviteAction(formData: FormData) {
  const user = await requireViewer();
  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const redirectWithStatus = (status: string): never => {
    redirect(`/family?status=${status}` as Route);
  };

  if (!familyCircleId || !membershipId) {
    redirectWithStatus("family-invite-error");
  }

  if (!hasSupabaseServiceRoleEnv()) {
    redirectWithStatus("family-invite-unavailable");
  }

  const { supabase, family } = await requireOwnerFamilyContext(user.id, familyCircleId);
  if (!family) {
    redirectWithStatus("family-member-forbidden");
  }
  const ownerFamily = family!;

  const membershipResponse = await supabase
    .from("family_memberships")
    .select("id, display_name, invite_email, status")
    .eq("id", membershipId)
    .eq("family_circle_id", familyCircleId)
    .maybeSingle();

  if (
    !membershipResponse.data ||
    membershipResponse.data.status !== "invited" ||
    !membershipResponse.data.invite_email
  ) {
    redirectWithStatus("family-invite-error");
  }
  const pendingMembership = membershipResponse.data!;

  const admin = createSupabaseAdminClient();
  const inviteResponse = await admin.auth.admin.inviteUserByEmail(
    pendingMembership.invite_email,
    {
      data: {
        full_name: pendingMembership.display_name
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`
    }
  );

  if (inviteResponse.error) {
    const errorMessage = inviteResponse.error.message.toLowerCase();
    if (errorMessage.includes("already") || errorMessage.includes("exists")) {
      redirectWithStatus("family-invite-already-claimed");
    }

    redirectWithStatus("family-invite-error");
  }

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: ownerFamily.membership.id,
    activity_type: "invite_resent",
    summary: `A fresh invite was sent to ${pendingMembership.display_name}.`
  });

  revalidatePath("/family");
  redirectWithStatus("family-invite-resent");
}

export async function removeFamilyMemberAction(formData: FormData) {
  const user = await requireViewer();
  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const redirectWithStatus = (status: string): never => {
    redirect(`/family?status=${status}` as Route);
  };

  if (!familyCircleId || !membershipId) {
    redirectWithStatus("family-member-error");
  }

  const { supabase, family } = await requireOwnerFamilyContext(user.id, familyCircleId);
  if (!family) {
    redirectWithStatus("family-member-forbidden");
  }
  const ownerFamily = family!;

  const membershipResponse = await supabase
    .from("family_memberships")
    .select("id, display_name, status, role")
    .eq("id", membershipId)
    .eq("family_circle_id", familyCircleId)
    .maybeSingle();

  if (!membershipResponse.data) {
    redirectWithStatus("family-member-error");
  }
  const targetMembership = membershipResponse.data!;

  if (
    targetMembership.role === "owner" ||
    targetMembership.id === ownerFamily.membership.id
  ) {
    redirectWithStatus("family-member-remove-blocked");
  }

  if (targetMembership.status === "active") {
    const [availabilityResponse, participantResponse] = await Promise.all([
      supabase
        .from("availability_windows")
        .select("id")
        .eq("membership_id", membershipId)
        .limit(1),
      supabase
        .from("call_participants")
        .select("id")
        .eq("membership_id", membershipId)
        .limit(1)
    ]);

    if ((availabilityResponse.data ?? []).length || (participantResponse.data ?? []).length) {
      redirectWithStatus("family-member-remove-blocked");
    }
  }

  const deleteResponse = await supabase
    .from("family_memberships")
    .delete()
    .eq("id", membershipId)
    .eq("family_circle_id", familyCircleId);

  if (deleteResponse.error) {
    redirectWithStatus("family-member-error");
  }

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: ownerFamily.membership.id,
    activity_type: "member_removed",
    summary: `${targetMembership.display_name} was removed from the Family Circle.`
  });

  revalidatePath("/family");
  revalidatePath("/dashboard");
  redirectWithStatus("family-member-removed");
}

export async function blockFamilyMemberAction(formData: FormData) {
  const user = await requireViewer();
  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const redirectWithStatus = (status: string): never => {
    redirect(`/family?status=${status}` as Route);
  };

  if (!familyCircleId || !membershipId) redirectWithStatus("family-member-error");

  const { supabase, family } = await requireOwnerFamilyContext(user.id, familyCircleId);
  if (!family) redirectWithStatus("family-member-forbidden");
  const ownerFamily = family!;

  const membershipResponse = await supabase
    .from("family_memberships")
    .select("id, display_name, status, role")
    .eq("id", membershipId)
    .eq("family_circle_id", familyCircleId)
    .maybeSingle();

  if (!membershipResponse.data) redirectWithStatus("family-member-error");
  const target = membershipResponse.data!;

  if (target.role === "owner" || target.id === ownerFamily.membership.id) {
    redirectWithStatus("family-member-block-self");
  }

  if (target.status === "blocked") redirectWithStatus("family-member-already-blocked");

  await supabase
    .from("family_memberships")
    .update({ status: "blocked", blocked_at: new Date().toISOString(), blocked_reason: reason })
    .eq("id", membershipId)
    .eq("family_circle_id", familyCircleId);

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: ownerFamily.membership.id,
    activity_type: "member_blocked",
    summary: `${target.display_name} was blocked from the Family Circle.`
  });

  revalidatePath("/family");
  revalidatePath("/dashboard");
  redirectWithStatus("family-member-blocked");
}

export async function unblockFamilyMemberAction(formData: FormData) {
  const user = await requireViewer();
  const familyCircleId = String(formData.get("familyCircleId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const redirectWithStatus = (status: string): never => {
    redirect(`/family?status=${status}` as Route);
  };

  if (!familyCircleId || !membershipId) redirectWithStatus("family-member-error");

  const { supabase, family } = await requireOwnerFamilyContext(user.id, familyCircleId);
  if (!family) redirectWithStatus("family-member-forbidden");

  const membershipResponse = await supabase
    .from("family_memberships")
    .select("id, display_name, status")
    .eq("id", membershipId)
    .eq("family_circle_id", familyCircleId)
    .maybeSingle();

  if (!membershipResponse.data || membershipResponse.data.status !== "blocked") {
    redirectWithStatus("family-member-error");
  }
  const target = membershipResponse.data!;

  // Restore to "invited" so they can be re-onboarded if needed
  await supabase
    .from("family_memberships")
    .update({ status: "invited", blocked_at: null, blocked_reason: null })
    .eq("id", membershipId)
    .eq("family_circle_id", familyCircleId);

  await supabase.from("family_activity").insert({
    family_circle_id: familyCircleId,
    actor_membership_id: family!.membership.id,
    activity_type: "member_unblocked",
    summary: `${target.display_name} was unblocked and restored to invited status.`
  });

  revalidatePath("/family");
  revalidatePath("/dashboard");
  redirectWithStatus("family-member-unblocked");
}

// ── Live call actions ────────────────────────────────────────────────────────

export async function callJoinedAction(
  callId: string,
  familyCircleId: string,
  membershipId: string
): Promise<{ attendanceEventId: string | null }> {
  if (!hasSupabaseEnv()) return { attendanceEventId: null };
  const supabase = await createSupabaseServerClient();

  // Transition call to "live" and record actual_started_at only when
  // the first person joins (status still "scheduled").
  await supabase
    .from("call_sessions")
    .update({ status: "live", actual_started_at: new Date().toISOString() })
    .eq("id", callId)
    .eq("family_circle_id", familyCircleId)
    .eq("status", "scheduled");

  // Mark this participant as attended in the call_participants row
  await supabase
    .from("call_participants")
    .update({ attended: true })
    .eq("call_session_id", callId)
    .eq("membership_id", membershipId);

  // Insert a durable attendance event for precise join/leave tracking
  const eventResponse = await supabase
    .from("call_attendance_events")
    .insert({ call_session_id: callId, membership_id: membershipId })
    .select("id")
    .maybeSingle();

  revalidatePath(`/calls/${callId}`);
  return { attendanceEventId: eventResponse.data?.id ?? null };
}

export async function inviteFamilyMemberAction(formData: FormData) {
  const user = await requireViewer();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const inviteEmail = String(formData.get("inviteEmail") ?? "").trim().toLowerCase();

  const redirectWithStatus = (status: string): never => {
    redirect(`/family?status=${status}` as Route);
  };

  if (!displayName || !inviteEmail) {
    redirectWithStatus("family-invite-error");
  }

  const supabase = await createSupabaseServerClient();
  const family = await getViewerFamilyCircle(user.id);

  if (!family || family.membership.status !== "active") {
    redirectWithStatus("family-member-forbidden");
  }

  const circle = family!.circle;
  const membership = family!.membership;

  const memberInsert = await supabase
    .from("family_memberships")
    .insert({
      family_circle_id: circle.id,
      display_name: displayName,
      invite_email: inviteEmail,
      status: "invited",
      role: "member"
    })
    .select("id")
    .single();

  if (memberInsert.error) {
    redirectWithStatus("family-invite-error");
  }

  if (hasSupabaseServiceRoleEnv()) {
    const admin = createSupabaseAdminClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const inviteResponse = await admin.auth.admin.inviteUserByEmail(inviteEmail, {
      data: { full_name: displayName },
      redirectTo: `${siteUrl}/auth/callback`
    });

    if (inviteResponse.error) {
      const msg = inviteResponse.error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("exists")) {
        redirectWithStatus("family-invite-already-claimed");
      }
    }
  }

  await supabase.from("family_activity").insert({
    family_circle_id: circle.id,
    actor_membership_id: membership.id,
    activity_type: "members_invited",
    summary: `${displayName} was invited to join the Family Circle.`
  });

  revalidatePath("/family");
  revalidatePath("/dashboard");
  redirectWithStatus("member-invited");
}

export async function callLeftAction(
  callId: string,
  attendanceEventId?: string
): Promise<void> {
  if (!hasSupabaseEnv()) return;
  const supabase = await createSupabaseServerClient();

  // Stamp left_at on the attendance event for precise duration tracking
  if (attendanceEventId) {
    await supabase
      .from("call_attendance_events")
      .update({ left_at: new Date().toISOString() })
      .eq("id", attendanceEventId);
  }

  revalidatePath(`/calls/${callId}`);
}
