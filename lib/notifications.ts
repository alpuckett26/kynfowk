import type { Database } from "@/lib/database.types";
import type {
  NotificationDeliveryStatus,
  NotificationItem,
  NotificationPreferenceSettings,
  NotificationReadFilter,
  NotificationTypeCount,
  NotificationType
} from "@/lib/types";
import { getWeekKey } from "@/lib/utils";
import webpush from "web-push";

type AppSupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;

type NotificationRecipient = {
  userId: string;
  displayName: string;
  email: string | null;
  timezone: string;
};

type NotificationInsertInput = {
  familyCircleId: string | null;
  callSessionId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  metadata?: Database["public"]["Tables"]["notifications"]["Insert"]["metadata"];
  dedupeKeyPrefix: string;
  recipients: NotificationRecipient[];
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceSettings = {
  inAppEnabled: true,
  emailEnabled: true,
  weeklyDigestEnabled: true,
  reminder24hEnabled: true,
  reminder15mEnabled: true,
  startingNowEnabled: true,
  pushEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: "America/Chicago"
};

type SweepStats = {
  circlesProcessed: number;
  notificationsCreated: number;
  emailDeliveriesSent: number;
  pushDeliveriesUpdated: number;
};

function isValidTimezone(timezone: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getLocalHour(date: Date, timezone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: isValidTimezone(timezone) ? timezone : "America/Chicago"
    }).format(date)
  );
}

function isQuietHours(prefs: NotificationPreferenceSettings, now: Date) {
  if (prefs.quietHoursStart === null || prefs.quietHoursEnd === null) {
    return false;
  }

  const hour = getLocalHour(now, prefs.timezone);

  if (prefs.quietHoursStart === prefs.quietHoursEnd) {
    return false;
  }

  if (prefs.quietHoursStart < prefs.quietHoursEnd) {
    return hour >= prefs.quietHoursStart && hour < prefs.quietHoursEnd;
  }

  return hour >= prefs.quietHoursStart || hour < prefs.quietHoursEnd;
}

function wantsNotificationType(
  prefs: NotificationPreferenceSettings,
  type: NotificationType
) {
  switch (type) {
    case "weekly_connection_digest":
      return prefs.weeklyDigestEnabled;
    case "reminder_24h_before":
      return prefs.reminder24hEnabled;
    case "reminder_15m_before":
      return prefs.reminder15mEnabled;
    case "starting_now":
      return prefs.startingNowEnabled;
    default:
      return true;
  }
}

function getNotificationPriority(type: NotificationType) {
  if (type === "starting_now") {
    return 0;
  }

  if (type === "reminder_15m_before") {
    return 1;
  }

  if (type === "missing_join_link_warning") {
    return 2;
  }

  if (type === "call_passed_without_completion") {
    return 3;
  }

  if (type === "reminder_24h_before") {
    return 4;
  }

  if (type === "weekly_connection_digest") {
    return 6;
  }

  return 5;
}

export async function ensureNotificationPreferences(
  supabase: AppSupabaseClient,
  userId: string,
  timezone?: string | null
) {
  await supabase.from("notification_preferences").upsert({
    user_id: userId,
    timezone:
      timezone && isValidTimezone(timezone)
        ? timezone
        : DEFAULT_NOTIFICATION_PREFERENCES.timezone
  });
}

async function getPreferenceMap(
  supabase: AppSupabaseClient,
  recipients: NotificationRecipient[]
) {
  const userIds = recipients.map((recipient) => recipient.userId);
  if (!userIds.length) {
    return new Map<string, NotificationPreferenceSettings>();
  }

  const preferencesResponse = await supabase
    .from("notification_preferences")
    .select(
      "user_id, in_app_enabled, email_enabled, weekly_digest_enabled, reminder_24h_enabled, reminder_15m_enabled, starting_now_enabled, push_enabled, quiet_hours_start, quiet_hours_end, timezone"
    )
    .in("user_id", userIds);

  const map = new Map<string, NotificationPreferenceSettings>();
  for (const recipient of recipients) {
    const preferences = preferencesResponse.data?.find((item) => item.user_id === recipient.userId);
    map.set(recipient.userId, {
      inAppEnabled: preferences?.in_app_enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.inAppEnabled,
      emailEnabled: preferences?.email_enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled,
      weeklyDigestEnabled:
        preferences?.weekly_digest_enabled ??
        DEFAULT_NOTIFICATION_PREFERENCES.weeklyDigestEnabled,
      reminder24hEnabled:
        preferences?.reminder_24h_enabled ??
        DEFAULT_NOTIFICATION_PREFERENCES.reminder24hEnabled,
      reminder15mEnabled:
        preferences?.reminder_15m_enabled ??
        DEFAULT_NOTIFICATION_PREFERENCES.reminder15mEnabled,
      startingNowEnabled:
        preferences?.starting_now_enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.startingNowEnabled,
      pushEnabled: preferences?.push_enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.pushEnabled,
      quietHoursStart:
        preferences?.quiet_hours_start ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
      quietHoursEnd:
        preferences?.quiet_hours_end ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd,
      timezone:
        preferences?.timezone && isValidTimezone(preferences.timezone)
          ? preferences.timezone
          : recipient.timezone
    });
  }

  return map;
}

async function sendEmailThroughProvider(input: {
  to: string;
  subject: string;
  body: string;
  ctaHref?: string | null;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL;

  if (!resendKey || !fromEmail) {
    console.info(`[notifications] Resend not configured — skipping email to ${input.to}: ${input.subject}`);
    return {
      status: "skipped" as NotificationDeliveryStatus,
      errorMessage: "RESEND_API_KEY or NOTIFICATION_FROM_EMAIL not set."
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.to],
      subject: input.subject,
      text: input.ctaHref
        ? `${input.body}\n\nJoin here: ${input.ctaHref.startsWith("http") ? input.ctaHref : `https://kynfowk.vercel.app${input.ctaHref}`}`
        : input.body
    })
  });

  if (!response.ok) {
    return {
      status: "failed" as NotificationDeliveryStatus,
      errorMessage: `Resend returned ${response.status}.`
    };
  }

  const payload = (await response.json()) as { id?: string };
  return {
    status: "sent" as NotificationDeliveryStatus,
    providerMessageId: payload.id ?? null
  };
}

/*
 * Future SES migration note
 * ─────────────────────────
 * When AWS SES production access is approved, replace sendEmailThroughProvider
 * with the implementation in lib/ses.ts (already scaffolded).
 * Swap env vars: remove RESEND_API_KEY, add AWS_REGION / AWS_ACCESS_KEY_ID /
 * AWS_SECRET_ACCESS_KEY. NOTIFICATION_FROM_EMAIL stays the same.
 * Also update Supabase Auth SMTP from smtp.resend.com to the SES SMTP endpoint.
 */

async function sendPushThroughProvider(input: {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  title: string;
  body: string;
  href: string | null;
}) {
  // Expo Push tokens are stored in push_subscriptions.endpoint with an
  // "expo:" prefix so the existing schema can carry both web push and
  // native push without a migration. Route those to Expo's API.
  if (input.subscription.endpoint.startsWith("expo:")) {
    return sendExpoPush({
      token: input.subscription.endpoint.slice("expo:".length),
      title: input.title,
      body: input.body,
      href: input.href,
    });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    console.info(
      `[notifications] Push scaffold only for ${input.subscription.endpoint}: ${input.title}`
    );
    return {
      status: "skipped" as NotificationDeliveryStatus,
      errorMessage: "Web push delivery is scaffolded but VAPID keys are not configured."
    };
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  try {
    const response = await webpush.sendNotification(
      input.subscription,
      JSON.stringify({
        title: input.title,
        body: input.body,
        href: input.href ?? "/dashboard"
      })
    );

    return {
      status: "sent" as NotificationDeliveryStatus,
      providerMessageId: response.headers?.["x-request-id"] ?? null
    };
  } catch (error) {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;

    return {
      status: statusCode === 404 || statusCode === 410 ? "skipped" : ("failed" as NotificationDeliveryStatus),
      errorMessage:
        statusCode === 404 || statusCode === 410
          ? "Push subscription is no longer valid."
          : "Push delivery failed before the browser could receive it.",
      shouldDeleteSubscription: statusCode === 404 || statusCode === 410
    };
  }
}

/**
 * Send a notification via Expo Push (https://exp.host/--/api/v2/push/send).
 * Expo's hosted service routes the message through FCM (Android) and APNs
 * (iOS). The mobile app gets its push token via expo-notifications and POSTs
 * it to /api/native/push/register, which stores it in push_subscriptions
 * with an "expo:" endpoint prefix.
 */
async function sendExpoPush(input: {
  token: string;
  title: string;
  body: string;
  href: string | null;
}): Promise<{
  status: NotificationDeliveryStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  shouldDeleteSubscription?: boolean;
}> {
  try {
    const accessToken = process.env.EXPO_ACCESS_TOKEN;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: input.token,
        title: input.title,
        body: input.body,
        sound: "default",
        priority: "high",
        data: { href: input.href ?? "/dashboard" },
      }),
    });

    if (!response.ok) {
      return {
        status: "failed" as NotificationDeliveryStatus,
        errorMessage: `Expo push API responded ${response.status}`,
      };
    }

    const payload = (await response.json().catch(() => null)) as
      | { data?: { id?: string; status?: string; message?: string; details?: { error?: string } } }
      | null;
    const ticket = payload?.data;
    if (ticket?.status === "error") {
      const errorCode = ticket.details?.error;
      // DeviceNotRegistered = uninstalled or token rotated; drop it.
      const drop = errorCode === "DeviceNotRegistered";
      return {
        status: drop ? ("skipped" as NotificationDeliveryStatus) : ("failed" as NotificationDeliveryStatus),
        errorMessage: ticket.message ?? errorCode ?? "Expo push ticket error",
        shouldDeleteSubscription: drop,
      };
    }

    return {
      status: "sent" as NotificationDeliveryStatus,
      providerMessageId: ticket?.id ?? null,
    };
  } catch (error) {
    return {
      status: "failed" as NotificationDeliveryStatus,
      errorMessage:
        error instanceof Error ? error.message : "Expo push delivery failed",
    };
  }
}

async function flushQueuedEmailDeliveries(
  supabase: AppSupabaseClient,
  userIds: string[]
): Promise<number> {
  if (!userIds.length) {
    return 0;
  }

  const deliveriesResponse = await supabase
    .from("notification_deliveries")
    .select("id, notification_id, user_id, recipient")
    .eq("channel", "email")
    .eq("status", "queued")
    .in("user_id", userIds);

  const deliveries = deliveriesResponse.data ?? [];
  if (!deliveries.length) {
    return 0;
  }

  const [notificationsResponse, profilesResponse, preferencesResponse] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, body, cta_href, type")
      .in(
        "id",
        deliveries.map((delivery) => delivery.notification_id)
      ),
    supabase
      .from("profiles")
      .select("id, email, timezone")
      .in(
        "id",
        deliveries.map((delivery) => delivery.user_id)
      ),
    supabase
      .from("notification_preferences")
      .select(
        "user_id, email_enabled, quiet_hours_start, quiet_hours_end, timezone, weekly_digest_enabled, reminder_24h_enabled, reminder_15m_enabled, starting_now_enabled, in_app_enabled, push_enabled"
      )
      .in(
        "user_id",
        deliveries.map((delivery) => delivery.user_id)
      )
  ]);

  let sentCount = 0;
  const sortedDeliveries = deliveries
    .slice()
    .sort((a, b) => {
      const aType = notificationsResponse.data?.find((item) => item.id === a.notification_id)?.type;
      const bType = notificationsResponse.data?.find((item) => item.id === b.notification_id)?.type;
      return getNotificationPriority(aType ?? "weekly_connection_digest") - getNotificationPriority(bType ?? "weekly_connection_digest");
    });

  for (const delivery of sortedDeliveries) {
    const notification = notificationsResponse.data?.find((item) => item.id === delivery.notification_id);
    const profile = profilesResponse.data?.find((item) => item.id === delivery.user_id);
    const prefsRow = preferencesResponse.data?.find((item) => item.user_id === delivery.user_id);

    const prefs: NotificationPreferenceSettings = {
      inAppEnabled: prefsRow?.in_app_enabled ?? true,
      emailEnabled: prefsRow?.email_enabled ?? true,
      weeklyDigestEnabled: prefsRow?.weekly_digest_enabled ?? true,
      reminder24hEnabled: prefsRow?.reminder_24h_enabled ?? true,
      reminder15mEnabled: prefsRow?.reminder_15m_enabled ?? true,
      startingNowEnabled: prefsRow?.starting_now_enabled ?? true,
      pushEnabled: prefsRow?.push_enabled ?? false,
      quietHoursStart: prefsRow?.quiet_hours_start ?? null,
      quietHoursEnd: prefsRow?.quiet_hours_end ?? null,
      timezone: prefsRow?.timezone ?? profile?.timezone ?? DEFAULT_NOTIFICATION_PREFERENCES.timezone
    };

    if (!notification || !profile?.email || !prefs.emailEnabled) {
      await supabase
        .from("notification_deliveries")
        .update({
          status: "skipped",
          error_message: "Email delivery is not enabled for this recipient."
        })
        .eq("id", delivery.id);
      continue;
    }

    if (isQuietHours(prefs, new Date())) {
      continue;
    }

    const result = await sendEmailThroughProvider({
      to: profile.email,
      subject: notification.title,
      body: notification.body,
      ctaHref: notification.cta_href
    });

    await supabase
      .from("notification_deliveries")
      .update({
        status: result.status,
        provider_message_id: "providerMessageId" in result ? result.providerMessageId ?? null : null,
        error_message: "errorMessage" in result ? result.errorMessage ?? null : null,
        sent_at: result.status === "sent" ? new Date().toISOString() : null
      })
      .eq("id", delivery.id);

    if (result.status === "sent") {
      sentCount += 1;
    }
  }

  return sentCount;
}

async function flushQueuedPushDeliveries(
  supabase: AppSupabaseClient,
  userIds: string[]
): Promise<number> {
  if (!userIds.length) {
    return 0;
  }

  const deliveriesResponse = await supabase
    .from("notification_deliveries")
    .select("id, notification_id, user_id")
    .eq("channel", "push")
    .eq("status", "queued")
    .in("user_id", userIds);

  const deliveries = deliveriesResponse.data ?? [];
  if (!deliveries.length) {
    return 0;
  }

  const [notificationsResponse, subscriptionsResponse, preferencesResponse] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, body, type, cta_href")
      .in(
        "id",
        deliveries.map((delivery) => delivery.notification_id)
      ),
    supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in(
        "user_id",
        deliveries.map((delivery) => delivery.user_id)
      ),
    supabase
      .from("notification_preferences")
      .select(
        "user_id, push_enabled, quiet_hours_start, quiet_hours_end, timezone, weekly_digest_enabled, reminder_24h_enabled, reminder_15m_enabled, starting_now_enabled, in_app_enabled, email_enabled"
      )
      .in(
        "user_id",
        deliveries.map((delivery) => delivery.user_id)
      )
  ]);

  let updatedCount = 0;
  const sortedDeliveries = deliveries
    .slice()
    .sort((a, b) => {
      const aType = notificationsResponse.data?.find((item) => item.id === a.notification_id)?.type;
      const bType = notificationsResponse.data?.find((item) => item.id === b.notification_id)?.type;
      return getNotificationPriority(aType ?? "weekly_connection_digest") - getNotificationPriority(bType ?? "weekly_connection_digest");
    });

  for (const delivery of sortedDeliveries) {
    const notification = notificationsResponse.data?.find((item) => item.id === delivery.notification_id);
    const subscriptions = (subscriptionsResponse.data ?? []).filter(
      (item) => item.user_id === delivery.user_id
    );
    const prefsRow = preferencesResponse.data?.find((item) => item.user_id === delivery.user_id);
    const prefs: NotificationPreferenceSettings = {
      inAppEnabled: prefsRow?.in_app_enabled ?? true,
      emailEnabled: prefsRow?.email_enabled ?? true,
      weeklyDigestEnabled: prefsRow?.weekly_digest_enabled ?? true,
      reminder24hEnabled: prefsRow?.reminder_24h_enabled ?? true,
      reminder15mEnabled: prefsRow?.reminder_15m_enabled ?? true,
      startingNowEnabled: prefsRow?.starting_now_enabled ?? true,
      pushEnabled: prefsRow?.push_enabled ?? false,
      quietHoursStart: prefsRow?.quiet_hours_start ?? null,
      quietHoursEnd: prefsRow?.quiet_hours_end ?? null,
      timezone: prefsRow?.timezone ?? DEFAULT_NOTIFICATION_PREFERENCES.timezone
    };

    if (!notification || !prefs.pushEnabled || !subscriptions.length) {
      await supabase
        .from("notification_deliveries")
        .update({
          status: "skipped",
          error_message: "No active browser push subscription is available."
        })
        .eq("id", delivery.id);
      updatedCount += 1;
      continue;
    }

    if (isQuietHours(prefs, new Date())) {
      continue;
    }

    let delivered = false;
    let lastError: string | null = null;
    let sawPermanentInvalidSubscription = false;

    for (const subscription of subscriptions) {
      const result = await sendPushThroughProvider({
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        },
        title: notification.title,
        body: notification.body,
        href: notification.cta_href
      });

      if ("shouldDeleteSubscription" in result && result.shouldDeleteSubscription) {
        sawPermanentInvalidSubscription = true;
        await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
      }

      if (result.status === "sent") {
        delivered = true;
        lastError = null;
        break;
      }

      lastError = "errorMessage" in result ? result.errorMessage ?? null : null;
    }

    await supabase
      .from("notification_deliveries")
      .update({
        status:
          delivered
            ? "sent"
            : sawPermanentInvalidSubscription
              ? "skipped"
              : subscriptions.length
                ? "failed"
                : "skipped",
        error_message: delivered ? null : lastError ?? "Push delivery did not reach a browser.",
        sent_at: delivered ? new Date().toISOString() : null
      })
      .eq("id", delivery.id);
    updatedCount += 1;
  }

  return updatedCount;
}

export async function flushQueuedDeliveries(
  supabase: AppSupabaseClient,
  userIds?: string[]
): Promise<{ emailSent: number; pushUpdated: number }> {
  const deliveriesResponse = await supabase
    .from("notification_deliveries")
    .select("user_id")
    .eq("status", "queued")
    .in("channel", ["email", "push"]);

  const targetUserIds = userIds?.length
    ? userIds
    : [...new Set((deliveriesResponse.data ?? []).map((delivery) => delivery.user_id))];

  if (!targetUserIds.length) {
    return {
      emailSent: 0,
      pushUpdated: 0
    };
  }

  const [emailSent, pushUpdated] = await Promise.all([
    flushQueuedEmailDeliveries(supabase, targetUserIds),
    flushQueuedPushDeliveries(supabase, targetUserIds)
  ]);

  return {
    emailSent,
    pushUpdated
  };
}

export async function createNotifications(
  supabase: AppSupabaseClient,
  input: NotificationInsertInput
) {
  const recipients = input.recipients.filter((recipient) => recipient.userId);
  if (!recipients.length) {
    return 0;
  }

  const preferenceMap = await getPreferenceMap(supabase, recipients);
  const notificationsCreated: { id: string; userId: string }[] = [];

  for (const recipient of recipients) {
    const prefs = preferenceMap.get(recipient.userId) ?? DEFAULT_NOTIFICATION_PREFERENCES;
    if (!wantsNotificationType(prefs, input.type)) {
      continue;
    }

    const readAt = prefs.inAppEnabled ? null : new Date().toISOString();
    const insertResponse = await supabase
      .from("notifications")
      .insert({
        user_id: recipient.userId,
        family_circle_id: input.familyCircleId,
        call_session_id: input.callSessionId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        cta_label: input.ctaLabel ?? null,
        cta_href: input.ctaHref ?? null,
        metadata: input.metadata ?? null,
        dedupe_key: `${input.dedupeKeyPrefix}:${recipient.userId}`,
        read_at: readAt
      })
      .select("id")
      .single();

    if (insertResponse.error || !insertResponse.data) {
      continue;
    }

    notificationsCreated.push({ id: insertResponse.data.id, userId: recipient.userId });

    const deliveries: Database["public"]["Tables"]["notification_deliveries"]["Insert"][] = [];

    if (prefs.inAppEnabled) {
      deliveries.push({
        notification_id: insertResponse.data.id,
        user_id: recipient.userId,
        channel: "in_app",
        status: "sent",
        recipient: recipient.displayName,
        sent_at: new Date().toISOString()
      });
    }

    if (prefs.emailEnabled) {
      deliveries.push({
        notification_id: insertResponse.data.id,
        user_id: recipient.userId,
        channel: "email",
        status: "queued",
        recipient: recipient.email
      });
    }

    if (prefs.pushEnabled) {
      deliveries.push({
        notification_id: insertResponse.data.id,
        user_id: recipient.userId,
        channel: "push",
        status: "queued"
      });
    }

    if (deliveries.length) {
      await supabase.from("notification_deliveries").insert(deliveries);
    }
  }

  await flushQueuedDeliveries(
    supabase,
    [...new Set(notificationsCreated.map((notification) => notification.userId))]
  );

  return notificationsCreated.length;
}

export async function dismissCallNotifications(
  supabase: AppSupabaseClient,
  callId: string,
  types: NotificationType[]
) {
  if (!types.length) {
    return;
  }

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("call_session_id", callId)
    .in("type", types)
    .is("read_at", null);
}

function getDigestBody(input: {
  circleName: string;
  completedCalls: number;
  totalMinutes: number;
  uniqueConnected: number;
  weeklyStreak: number;
}) {
  if (!input.completedCalls) {
    return `${input.circleName} did not log a completed call this week yet, but your next warm touchpoint is still within reach.`;
  }

  return `${input.circleName} shared ${input.completedCalls} completed call${input.completedCalls === 1 ? "" : "s"}, ${input.totalMinutes} minutes together, and ${input.uniqueConnected} family member${input.uniqueConnected === 1 ? "" : "s"} connected this week. Your streak is ${input.weeklyStreak} week${input.weeklyStreak === 1 ? "" : "s"} strong.`;
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

export async function sweepFamilyCircleNotifications(
  supabase: AppSupabaseClient,
  input: { familyCircleId: string; circleName: string }
): Promise<SweepStats> {
  const [membershipsResponse, callsResponse] = await Promise.all([
    supabase
      .from("family_memberships")
      .select("id, user_id, display_name, profiles(email, timezone)")
      .eq("family_circle_id", input.familyCircleId)
      .eq("status", "active"),
    supabase
      .from("call_sessions")
      .select("id, title, scheduled_start, scheduled_end, status, meeting_url, actual_duration_minutes, actual_started_at, reminder_status")
      .eq("family_circle_id", input.familyCircleId)
      .order("scheduled_start", { ascending: true })
  ]);

  const activeRecipients = (membershipsResponse.data ?? [])
    .filter((membership) => membership.user_id)
    .map((membership) => {
      const profileRecord = membership.profiles as
        | { email: string | null; timezone: string }[]
        | { email: string | null; timezone: string }
        | null;

      return {
        membershipId: membership.id,
        userId: membership.user_id as string,
        displayName: membership.display_name,
        email: Array.isArray(profileRecord)
          ? profileRecord[0]?.email ?? null
          : profileRecord?.email ?? null,
        timezone: Array.isArray(profileRecord)
          ? profileRecord[0]?.timezone ?? DEFAULT_NOTIFICATION_PREFERENCES.timezone
          : profileRecord?.timezone ?? DEFAULT_NOTIFICATION_PREFERENCES.timezone
      };
    });

  const calls = callsResponse.data ?? [];
  const relevantCallIds = calls.map((call) => call.id);
  const participantsResponse = relevantCallIds.length
    ? await supabase
        .from("call_participants")
        .select("call_session_id, family_memberships!inner(id, user_id, display_name, profiles(email, timezone))")
        .in("call_session_id", relevantCallIds)
    : { data: [] as never[] };

  const participantsByCall = new Map<string, NotificationRecipient[]>();
  for (const row of participantsResponse.data ?? []) {
    const membershipRecord = row.family_memberships as
      | {
          id: string;
          user_id: string | null;
          display_name: string;
          profiles: { email: string | null; timezone: string }[] | { email: string | null; timezone: string } | null;
        }[]
      | {
          id: string;
          user_id: string | null;
          display_name: string;
          profiles: { email: string | null; timezone: string }[] | { email: string | null; timezone: string } | null;
        }
      | null;
    const membership = Array.isArray(membershipRecord) ? membershipRecord[0] : membershipRecord;
    if (!membership?.user_id) {
      continue;
    }
    const profile = Array.isArray(membership.profiles)
      ? membership.profiles[0]
      : membership.profiles;
    const recipients = participantsByCall.get(row.call_session_id) ?? [];
    recipients.push({
      userId: membership.user_id,
      displayName: membership.display_name,
      email: profile?.email ?? null,
      timezone: profile?.timezone ?? DEFAULT_NOTIFICATION_PREFERENCES.timezone
    });
    participantsByCall.set(row.call_session_id, recipients);
  }

  const now = Date.now();

  let notificationsCreated = 0;

  const prioritizedCalls = calls
    .slice()
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

  for (const call of prioritizedCalls) {
    if (call.status === "completed" || call.status === "canceled") {
      continue;
    }

    const recipients = participantsByCall.get(call.id) ?? activeRecipients;
    if (!recipients.length) {
      continue;
    }

    const start = new Date(call.scheduled_start).getTime();
    const end = new Date(call.scheduled_end).getTime();
    const msUntilStart = start - now;

    if (msUntilStart <= 24 * 60 * 60 * 1000 && msUntilStart > 15 * 60 * 1000) {
      notificationsCreated += await createNotifications(supabase, {
        familyCircleId: input.familyCircleId,
        callSessionId: call.id,
        type: "reminder_24h_before",
        title: `${call.title} is almost here`,
        body: `Your Family Circle has a call coming up within the next day. A little planning now makes it easier to show up together.`,
        ctaLabel: "Join call",
        ctaHref: `/calls/${call.id}/live`,
        dedupeKeyPrefix: `reminder-24h:${call.id}`,
        recipients
      });
    }

    if (msUntilStart <= 15 * 60 * 1000 && msUntilStart > 0) {
      notificationsCreated += await createNotifications(supabase, {
        familyCircleId: input.familyCircleId,
        callSessionId: call.id,
        type: "reminder_15m_before",
        title: `${call.title} starts soon`,
        body: `Fifteen minutes from now, your Family Circle has a moment waiting. It is a good time to settle in and get the link ready.`,
        ctaLabel: "Join call",
        ctaHref: `/calls/${call.id}/live`,
        dedupeKeyPrefix: `reminder-15m:${call.id}`,
        recipients
      });
    }

    if (start <= now && end >= now) {
      notificationsCreated += await createNotifications(supabase, {
        familyCircleId: input.familyCircleId,
        callSessionId: call.id,
        type: "starting_now",
        title: `${call.title} is starting now`,
        body: `Your family window is open. Head in when you are ready and keep the rhythm going.`,
        ctaLabel: "Join call now",
        ctaHref: `/calls/${call.id}/live`,
        dedupeKeyPrefix: `starting-now:${call.id}`,
        recipients
      });
    }

    if (end < now) {
      notificationsCreated += await createNotifications(supabase, {
        familyCircleId: input.familyCircleId,
        callSessionId: call.id,
        type: "call_passed_without_completion",
        title: `${call.title} still needs a wrap-up`,
        body: `If your circle already connected, mark the call complete so Time Together and recap notes stay accurate.`,
        ctaLabel: "Complete call",
        ctaHref: `/calls/${call.id}`,
        dedupeKeyPrefix: `passed-call:${call.id}`,
        recipients
      });
    }
  }

  const completedCalls = calls.filter((call) => call.status === "completed");
  const weekKey = getWeekKey(new Date());
  const completedThisWeek = completedCalls.filter(
    (call) => getWeekKey(new Date(call.scheduled_start)) === weekKey
  );

  if (completedThisWeek.length && activeRecipients.length) {
    const participantResponse = await supabase
      .from("call_participants")
      .select("membership_id, call_session_id, attended")
      .in(
        "call_session_id",
        completedCalls.map((call) => call.id)
      );

    const totalMinutes = completedThisWeek.reduce(
      (sum, call) => sum + (call.actual_duration_minutes ?? 0),
      0
    );
    const uniqueConnected = new Set(
      (participantResponse.data ?? [])
        .filter(
          (participant) =>
            completedThisWeek.some((call) => call.id === participant.call_session_id) &&
            participant.attended === true
        )
        .map((participant) => participant.membership_id)
    ).size;

    notificationsCreated += await createNotifications(supabase, {
      familyCircleId: input.familyCircleId,
      type: "weekly_connection_digest",
      title: `${input.circleName} weekly digest`,
      body: getDigestBody({
        circleName: input.circleName,
        completedCalls: completedThisWeek.length,
        totalMinutes,
        uniqueConnected,
        weeklyStreak: getWeeklyStreak(
          completedCalls.map((call) => new Date(call.scheduled_start))
        )
      }),
      ctaLabel: "Open dashboard",
      ctaHref: "/dashboard",
      dedupeKeyPrefix: `weekly-digest:${input.familyCircleId}:${weekKey}`,
      recipients: activeRecipients
    });
  }

  const reminderSentCallIds = calls
    .filter((call) => call.status === "scheduled" || call.status === "live")
    .filter((call) => {
      const start = new Date(call.scheduled_start).getTime();
      return start <= now + 24 * 60 * 60 * 1000;
    })
    .map((call) => call.id);

  if (reminderSentCallIds.length) {
    await supabase
      .from("call_sessions")
      .update({
        reminder_status: "sent",
        reminder_sent_at: new Date().toISOString()
      })
      .in("id", reminderSentCallIds)
      .eq("family_circle_id", input.familyCircleId)
      .neq("reminder_status", "not_needed");
  }

  const deliveryStats: { emailSent: number; pushUpdated: number } =
    await flushQueuedDeliveries(supabase);

  return {
    circlesProcessed: 1,
    notificationsCreated,
    emailDeliveriesSent: deliveryStats.emailSent,
    pushDeliveriesUpdated: deliveryStats.pushUpdated
  } satisfies SweepStats;
}

export async function sweepAllNotifications(supabase: AppSupabaseClient): Promise<SweepStats> {
  const circlesResponse = await supabase
    .from("family_circles")
    .select("id, name")
    .order("created_at", { ascending: true });

  const totals: SweepStats = {
    circlesProcessed: 0,
    notificationsCreated: 0,
    emailDeliveriesSent: 0,
    pushDeliveriesUpdated: 0
  };

  for (const circle of circlesResponse.data ?? []) {
    const result = await sweepFamilyCircleNotifications(supabase, {
      familyCircleId: circle.id,
      circleName: circle.name
    });
    totals.circlesProcessed += result.circlesProcessed;
    totals.notificationsCreated += result.notificationsCreated;
    totals.emailDeliveriesSent += result.emailDeliveriesSent;
    totals.pushDeliveriesUpdated += result.pushDeliveriesUpdated;
  }

  return totals;
}

export async function getNotificationInboxData(
  supabase: AppSupabaseClient,
  userId: string,
  options?: {
    limit?: number;
    readFilter?: NotificationReadFilter;
    typeFilter?: NotificationType | "all";
  }
): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
  typeCounts: NotificationTypeCount[];
  preferences: NotificationPreferenceSettings;
}> {
  const [notificationResponse, preferenceResponse, profileResponse, subscriptionResponse] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, body, cta_label, cta_href, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("notification_preferences")
      .select(
        "in_app_enabled, email_enabled, weekly_digest_enabled, reminder_24h_enabled, reminder_15m_enabled, starting_now_enabled, push_enabled, quiet_hours_start, quiet_hours_end, timezone"
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    supabase.from("push_subscriptions").select("id").eq("user_id", userId)
  ]);

  const preferences: NotificationPreferenceSettings = {
    inAppEnabled:
      preferenceResponse.data?.in_app_enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.inAppEnabled,
    emailEnabled:
      preferenceResponse.data?.email_enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled,
    weeklyDigestEnabled:
      preferenceResponse.data?.weekly_digest_enabled ??
      DEFAULT_NOTIFICATION_PREFERENCES.weeklyDigestEnabled,
    reminder24hEnabled:
      preferenceResponse.data?.reminder_24h_enabled ??
      DEFAULT_NOTIFICATION_PREFERENCES.reminder24hEnabled,
    reminder15mEnabled:
      preferenceResponse.data?.reminder_15m_enabled ??
      DEFAULT_NOTIFICATION_PREFERENCES.reminder15mEnabled,
    startingNowEnabled:
      preferenceResponse.data?.starting_now_enabled ??
      DEFAULT_NOTIFICATION_PREFERENCES.startingNowEnabled,
    pushEnabled:
      preferenceResponse.data?.push_enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.pushEnabled,
    quietHoursStart:
      preferenceResponse.data?.quiet_hours_start ??
      DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
    quietHoursEnd:
      preferenceResponse.data?.quiet_hours_end ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd,
    timezone:
      preferenceResponse.data?.timezone ??
      profileResponse.data?.timezone ??
      DEFAULT_NOTIFICATION_PREFERENCES.timezone,
    pushSubscriptionCount: (subscriptionResponse.data ?? []).length,
    pushDeliveryReady: Boolean(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_SUBJECT
    )
  };

  const notifications = (notificationResponse.data ?? []).map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    ctaLabel: notification.cta_label,
    ctaHref: notification.cta_href,
    readAt: notification.read_at,
    createdAt: notification.created_at
  }));

  const readFilter = options?.readFilter ?? "all";
  const typeFilter = options?.typeFilter ?? "all";
  const filteredNotifications = notifications
    .filter((notification) => {
      if (readFilter === "unread") {
        return !notification.readAt;
      }

      if (readFilter === "read") {
        return Boolean(notification.readAt);
      }

      return true;
    })
    .filter((notification) => typeFilter === "all" || notification.type === typeFilter);
  const visibleNotifications =
    typeof options?.limit === "number"
      ? filteredNotifications.slice(0, options.limit)
      : filteredNotifications;
  const typeCounts = (
    [
      "call_scheduled",
      "reminder_24h_before",
      "reminder_15m_before",
      "starting_now",
      "missing_join_link_warning",
      "call_passed_without_completion",
      "invite_claimed",
      "recap_posted",
      "weekly_connection_digest"
    ] satisfies NotificationType[]
  )
    .map((type) => ({
      type,
      count: notifications.filter((notification) => notification.type === type).length
    }))
    .filter((item) => item.count > 0);

  return {
    notifications: visibleNotifications,
    unreadCount: notifications.filter((notification) => !notification.readAt).length,
    totalCount: notifications.length,
    typeCounts,
    preferences
  };
}
