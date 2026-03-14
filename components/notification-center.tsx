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
import { formatDateTime } from "@/lib/utils";

const READ_FILTERS: { value: NotificationReadFilter; label: string }[] = [
  { value: "all", label: "All updates" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" }
];

const TYPE_LABELS: Record<NotificationType, string> = {
  call_scheduled: "Call scheduled",
  reminder_24h_before: "24h reminders",
  reminder_15m_before: "15m reminders",
  starting_now: "Starting now",
  missing_join_link_warning: "Missing join link",
  call_passed_without_completion: "Missed-call follow-up",
  invite_claimed: "Invite claimed",
  recap_posted: "Recaps",
  weekly_connection_digest: "Weekly digest"
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

export function NotificationCenter({
  notifications,
  unreadCount,
  totalCount,
  typeCounts,
  readFilter,
  typeFilter,
  timezone
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
  typeCounts: NotificationTypeCount[];
  readFilter: NotificationReadFilter;
  typeFilter: NotificationType | "all";
  timezone: string;
}) {
  return (
    <div className="stack-md">
      <div className="section-header-row">
        <div>
          <h2>All notifications</h2>
          <p className="meta">
            {unreadCount
              ? `${unreadCount} unread family updates are still waiting on you.`
              : "Everything here is caught up, but your recent family updates are easy to revisit."}
          </p>
        </div>
        <div className="call-actions">
          <span className="badge">{totalCount} total</span>
          {unreadCount ? (
            <form action={markAllNotificationsReadAction}>
              <input name="returnPath" type="hidden" value={buildNotificationsHref({ readFilter, typeFilter })} />
              <button className="button button-secondary" type="submit">
                Mark all read
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="notification-filters">
        {READ_FILTERS.map((filter) => (
          <Link
            className={`filter-chip ${readFilter === filter.value ? "filter-chip-active" : ""}`}
            href={buildNotificationsHref({ readFilter: filter.value, typeFilter })}
            key={filter.value}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="notification-filters">
        <Link
          className={`filter-chip ${typeFilter === "all" ? "filter-chip-active" : ""}`}
          href={buildNotificationsHref({ readFilter, typeFilter: "all" })}
        >
          All types
        </Link>
        {typeCounts.map((item) => (
          <Link
            className={`filter-chip ${typeFilter === item.type ? "filter-chip-active" : ""}`}
            href={buildNotificationsHref({ readFilter, typeFilter: item.type })}
            key={item.type}
          >
            {TYPE_LABELS[item.type]} ({item.count})
          </Link>
        ))}
      </div>

      <div className="list">
        {notifications.length ? (
          notifications.map((notification) => (
            <div
              className={`list-item notification-list-item ${notification.readAt ? "notification-read" : "notification-unread"}`}
              key={notification.id}
            >
              <div className="stack-sm">
                <div className="call-actions">
                  <p>{notification.title}</p>
                  <span className="badge notification-type-badge">
                    {TYPE_LABELS[notification.type]}
                  </span>
                </div>
                <p className="meta">{notification.body}</p>
                <p className="microcopy">{formatDateTime(notification.createdAt, timezone)}</p>
                <div className="call-actions">
                  {notification.ctaHref ? (
                    <Link
                      className="button button-secondary"
                      href={notification.ctaHref as Route}
                    >
                      {notification.ctaLabel ?? "Open"}
                    </Link>
                  ) : (
                    <Link className="button button-secondary" href={"/dashboard" as Route}>
                      Open dashboard
                    </Link>
                  )}
                  {!notification.readAt ? (
                    <form action={markNotificationReadAction}>
                      <input name="notificationId" type="hidden" value={notification.id} />
                      <input
                        name="returnPath"
                        type="hidden"
                        value={buildNotificationsHref({ readFilter, typeFilter })}
                      />
                      <button className="button button-secondary" type="submit">
                        Mark read
                      </button>
                    </form>
                  ) : (
                    <span className="meta">Read</span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="This view is quiet for now"
            description="Try a different filter, or give Kynfowk a little time to bring the next family update here."
          />
        )}
      </div>
    </div>
  );
}
