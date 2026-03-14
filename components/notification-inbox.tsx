import type { Route } from "next";
import Link from "next/link";

import { markNotificationReadAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import type { NotificationItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function NotificationInbox({
  notifications,
  unreadCount,
  timezone
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  timezone: string;
}) {
  return (
    <div className="stack-md" id="family-inbox">
      <div className="section-header-row">
        <div>
          <h2>Family inbox</h2>
          <p className="meta">
            {unreadCount
              ? `${unreadCount} unread reminder${unreadCount === 1 ? "" : "s"} and updates are waiting.`
              : "Everything is caught up for now."}
          </p>
        </div>
        <div className="call-actions">
          <span className="badge">{unreadCount} unread</span>
          <Link className="button button-secondary" href={"/notifications" as Route}>
            View all
          </Link>
        </div>
      </div>

      <div className="list">
        {notifications.length ? (
          notifications.map((notification) => (
            <div className="list-item" key={notification.id}>
              <div className="stack-sm">
                <p>{notification.title}</p>
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
                  ) : null}
                  {!notification.readAt ? (
                    <form action={markNotificationReadAction}>
                      <input name="notificationId" type="hidden" value={notification.id} />
                      <input name="returnPath" type="hidden" value="/dashboard" />
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
            title="No notifications yet"
            description="Scheduled calls, fresh recaps, and family nudges will land here when they matter."
          />
        )}
      </div>
    </div>
  );
}
