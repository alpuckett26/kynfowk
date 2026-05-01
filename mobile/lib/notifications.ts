import { apiFetch } from "@/lib/api";
import type {
  NotificationsResponse,
  NotificationReadFilter,
  NotificationType,
  SaveNotificationPrefsBody,
} from "@/types/api";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  call_scheduled: "Call scheduled",
  reminder_24h_before: "Day-before reminder",
  reminder_15m_before: "15-min reminder",
  starting_now: "Starting now",
  missing_join_link_warning: "Needs join link",
  call_passed_without_completion: "Past-due call",
  invite_claimed: "Invite claimed",
  recap_posted: "Recap posted",
  weekly_connection_digest: "Weekly digest",
  weekly_briefing: "Weekly briefing",
  incoming_call: "Incoming call",
  call_missed: "Missed call",
  call_declined: "Call declined",
};

export function fetchNotifications(filters?: {
  read?: NotificationReadFilter;
  type?: NotificationType | "all";
}): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (filters?.read) params.set("read", filters.read);
  if (filters?.type) params.set("type", filters.type);
  const query = params.toString();
  return apiFetch<NotificationsResponse>(
    `/api/native/notifications${query ? `?${query}` : ""}`
  );
}

export function markNotificationRead(id: string): Promise<{ success: true }> {
  return apiFetch(`/api/native/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead(): Promise<{ success: true }> {
  return apiFetch(`/api/native/notifications/read-all`, { method: "POST" });
}

export function saveNotificationPrefs(
  body: SaveNotificationPrefsBody
): Promise<{ success: true }> {
  return apiFetch(`/api/native/notifications/prefs`, { method: "POST", body });
}
