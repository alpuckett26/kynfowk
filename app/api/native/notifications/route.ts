import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import type {
  NotificationItem,
  NotificationPreferenceSettings,
  NotificationReadFilter,
  NotificationType,
  NotificationTypeCount,
} from "@/lib/types";

const ALL_TYPES: NotificationType[] = [
  "call_scheduled",
  "reminder_24h_before",
  "reminder_15m_before",
  "starting_now",
  "missing_join_link_warning",
  "call_passed_without_completion",
  "invite_claimed",
  "recap_posted",
  "weekly_connection_digest",
];

const DEFAULT_PREFS: NotificationPreferenceSettings = {
  inAppEnabled: true,
  emailEnabled: true,
  weeklyDigestEnabled: true,
  reminder24hEnabled: true,
  reminder15mEnabled: true,
  startingNowEnabled: true,
  pushEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: "America/Chicago",
};

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const url = new URL(request.url);
    const readFilter = (url.searchParams.get("read") ?? "all") as NotificationReadFilter;
    const typeFilter = (url.searchParams.get("type") ?? "all") as
      | NotificationType
      | "all";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.max(1, Math.min(200, Number(limitParam))) : null;

    const [notificationsResponse, prefsResponse, profileResponse] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, type, title, body, cta_label, cta_href, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("notification_preferences")
        .select(
          "in_app_enabled, email_enabled, weekly_digest_enabled, reminder_24h_enabled, reminder_15m_enabled, starting_now_enabled, push_enabled, quiet_hours_start, quiet_hours_end, timezone"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    ]);

    const all: NotificationItem[] = (notificationsResponse.data ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      ctaLabel: n.cta_label,
      ctaHref: n.cta_href,
      readAt: n.read_at,
      createdAt: n.created_at,
    }));

    const filtered = all.filter((n) => {
      if (readFilter === "unread" && n.readAt) return false;
      if (readFilter === "read" && !n.readAt) return false;
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      return true;
    });

    const visible = typeof limit === "number" ? filtered.slice(0, limit) : filtered;

    const typeCounts: NotificationTypeCount[] = ALL_TYPES.map((type) => ({
      type,
      count: all.filter((n) => n.type === type).length,
    }));

    const prefs: NotificationPreferenceSettings = {
      inAppEnabled: prefsResponse.data?.in_app_enabled ?? DEFAULT_PREFS.inAppEnabled,
      emailEnabled: prefsResponse.data?.email_enabled ?? DEFAULT_PREFS.emailEnabled,
      weeklyDigestEnabled:
        prefsResponse.data?.weekly_digest_enabled ?? DEFAULT_PREFS.weeklyDigestEnabled,
      reminder24hEnabled:
        prefsResponse.data?.reminder_24h_enabled ?? DEFAULT_PREFS.reminder24hEnabled,
      reminder15mEnabled:
        prefsResponse.data?.reminder_15m_enabled ?? DEFAULT_PREFS.reminder15mEnabled,
      startingNowEnabled:
        prefsResponse.data?.starting_now_enabled ?? DEFAULT_PREFS.startingNowEnabled,
      pushEnabled: prefsResponse.data?.push_enabled ?? DEFAULT_PREFS.pushEnabled,
      quietHoursStart:
        prefsResponse.data?.quiet_hours_start ?? DEFAULT_PREFS.quietHoursStart,
      quietHoursEnd:
        prefsResponse.data?.quiet_hours_end ?? DEFAULT_PREFS.quietHoursEnd,
      timezone:
        prefsResponse.data?.timezone ??
        profileResponse.data?.timezone ??
        DEFAULT_PREFS.timezone,
    };

    return Response.json({
      notifications: visible,
      unreadCount: all.filter((n) => !n.readAt).length,
      totalCount: all.length,
      typeCounts,
      preferences: prefs,
      filters: { read: readFilter, type: typeFilter },
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
