import type { Route } from "next";
import Link from "next/link";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction
} from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import type {
  NotificationItem,
  NotificationReadFilter,
  NotificationType,
  NotificationTypeCount
} from "@/lib/types";

const READ_FILTERS: { value: NotificationReadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" }
];

const TYPE_LABELS: Record<NotificationType, string> = {
  call_scheduled: "Call scheduled",
  reminder_24h_before: "24h reminder",
  reminder_15m_before: "15m reminder",
  starting_now: "Starting now",
  missing_join_link_warning: "Missing join link",
  call_passed_without_completion: "Missed call",
  invite_claimed: "Invite claimed",
  recap_posted: "Recap posted",
  weekly_connection_digest: "Weekly digest"
};

const TYPE_GLYPHS: Record<NotificationType, string> = {
  call_scheduled: "📅",
  reminder_24h_before: "🔔",
  reminder_15m_before: "⏰",
  starting_now: "🔴",
  missing_join_link_warning: "⚠️",
  call_passed_without_completion: "↻",
  invite_claimed: "👋",
  recap_posted: "📝",
  weekly_connection_digest: "📊"
};

function buildNotificationsHref(input: {
  readFilter: NotificationReadFilter;
  typeFilter: NotificationType | "all";
}) {
  const params = new URLSearchParams();
  if (input.readFilter !== "all") {
    params.set("read", input.readFilter);
  }
  if (input.typeFilter !== "all") {
    params.set("type", input.typeFilter);
  }

  return (`/notifications${params.size ? `?${params.toString()}` : ""}`) as Route;
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationCenter({
  notifications,
  unreadCount,
  totalCount,
  typeCounts,
  readFilter,
  typeFilter
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
  typeCounts: NotificationTypeCount[];
  readFilter: NotificationReadFilter;
  typeFilter: NotificationType | "all";
  /** kept for back-compat — relative time renders from the system clock */
  timezone?: string;
}) {
  const returnPath = buildNotificationsHref({ readFilter, typeFilter });

  return (
    <div className="gmail-inbox-shell">
      <div className="gmail-inbox-toolbar">
        <div className="gmail-toolbar-left">
          <h2>Inbox</h2>
          <span className="meta">
            {unreadCount ? `${unreadCount} unread` : "All caught up"} · {totalCount} total
          </span>
        </div>
        {unreadCount ? (
          <form action={markAllNotificationsReadAction}>
            <input name="returnPath" type="hidden" value={returnPath} />
            <button className="button button-ghost gmail-mark-all" type="submit">
              Mark all read
            </button>
          </form>
        ) : null}
      </div>

      <div className="gmail-filter-row">
        {READ_FILTERS.map((filter) => (
          <Link
            className={`gmail-chip ${readFilter === filter.value ? "gmail-chip-active" : ""}`}
            href={buildNotificationsHref({ readFilter: filter.value, typeFilter })}
            key={filter.value}
          >
            {filter.label}
          </Link>
        ))}
        <span className="gmail-chip-divider" aria-hidden="true">·</span>
        <Link
          className={`gmail-chip ${typeFilter === "all" ? "gmail-chip-active" : ""}`}
          href={buildNotificationsHref({ readFilter, typeFilter: "all" })}
        >
          All types
        </Link>
        {typeCounts.map((item) => (
          <Link
            className={`gmail-chip ${typeFilter === item.type ? "gmail-chip-active" : ""}`}
            href={buildNotificationsHref({ readFilter, typeFilter: item.type })}
            key={item.type}
          >
            {TYPE_LABELS[item.type]} ({item.count})
          </Link>
        ))}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="This view is quiet for now"
          description="Try a different filter, or give Kynfowk a little time to bring the next family update here."
        />
      ) : (
        <ul className="gmail-list">
          {notifications.map((n) => {
            const isUnread = !n.readAt;
            return (
              <li className={`gmail-row ${isUnread ? "gmail-row-unread" : "gmail-row-read"}`} key={n.id}>
                {isUnread ? (
                  <form action={markNotificationReadAction} className="gmail-row-form">
                    <input name="notificationId" type="hidden" value={n.id} />
                    <input name="returnPath" type="hidden" value={n.ctaHref ?? "/dashboard"} />
                    <button className="gmail-row-button" type="submit" aria-label={`Open ${n.title}`}>
                      <RowContents notification={n} />
                    </button>
                  </form>
                ) : (
                  <Link className="gmail-row-link" href={(n.ctaHref ?? "/dashboard") as Route}>
                    <RowContents notification={n} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RowContents({ notification }: { notification: NotificationItem }) {
  const isUnread = !notification.readAt;
  return (
    <>
      <span className="gmail-avatar" aria-hidden="true">
        {TYPE_GLYPHS[notification.type] ?? "✉️"}
      </span>
      <span className="gmail-row-body">
        <span className="gmail-row-top">
          <span className="gmail-sender">{TYPE_LABELS[notification.type] ?? "Family update"}</span>
          <span className="gmail-time">{relativeTime(notification.createdAt)}</span>
        </span>
        <span className="gmail-subject">
          {isUnread ? <span className="gmail-unread-dot" aria-hidden="true" /> : null}
          <span className="gmail-subject-text">{notification.title}</span>
          <span className="gmail-snippet"> — {notification.body}</span>
        </span>
      </span>
    </>
  );
}
