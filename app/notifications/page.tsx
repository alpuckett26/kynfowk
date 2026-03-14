import Link from "next/link";

import { Card } from "@/components/card";
import { NotificationCenter } from "@/components/notification-center";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { StatusBanner } from "@/components/status-banner";
import { getNotificationsPageData, requireViewer } from "@/lib/data";
import type { NotificationReadFilter, NotificationType } from "@/lib/types";

const READ_FILTERS = new Set<NotificationReadFilter>(["all", "unread", "read"]);
const TYPE_FILTERS = new Set<NotificationType>([
  "call_scheduled",
  "reminder_24h_before",
  "reminder_15m_before",
  "starting_now",
  "missing_join_link_warning",
  "call_passed_without_completion",
  "invite_claimed",
  "recap_posted",
  "weekly_connection_digest"
]);

export default async function NotificationsPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string; read?: string; type?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const user = await requireViewer();
  const readFilter = READ_FILTERS.has((params?.read ?? "all") as NotificationReadFilter)
    ? ((params?.read ?? "all") as NotificationReadFilter)
    : "all";
  const typeFilter = TYPE_FILTERS.has((params?.type ?? "all") as NotificationType)
    ? ((params?.type ?? "all") as NotificationType)
    : "all";
  const data = await getNotificationsPageData(user.id, {
    readFilter,
    typeFilter
  });

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <StatusBanner code={params?.status} />

        <section className="dashboard-hero">
          <div className="stack-md">
            <span className="eyebrow">{data.circle.name}</span>
            <h1>Your family inbox, in full.</h1>
            <p className="lede">
              Keep every reminder, recap, and gentle nudge in one calm place so the
              dashboard can stay focused on what is next.
            </p>
          </div>

          <Card className="hero-summary-card">
            <p className="stat-label">Notification overview</p>
            <p className="highlight-value">{data.inbox.unreadCount} unread</p>
            <p className="meta">
              {data.inbox.totalCount
                ? `${data.inbox.totalCount} family updates are saved here across calls, recaps, invites, and reminders.`
                : "Fresh family updates will start appearing here as soon as your circle gets moving."}
            </p>
            <div className="pill-row compact-pills">
              <Link className="button button-secondary" href="/dashboard">
                Back to dashboard
              </Link>
            </div>
          </Card>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-main">
            <Card>
              <NotificationCenter
                notifications={data.inbox.notifications}
                unreadCount={data.inbox.unreadCount}
                totalCount={data.inbox.totalCount}
                typeCounts={data.inbox.typeCounts}
                readFilter={data.filters.readFilter}
                typeFilter={data.filters.typeFilter}
                timezone={data.notificationPreferences.timezone}
              />
            </Card>
          </div>

          <div className="dashboard-main">
            <Card>
              <div className="stack-md">
                <h2>Notification rhythm</h2>
                <p className="meta">
                  Choose how Kynfowk should reach out when your Family Circle has a new
                  moment to notice.
                </p>
                <NotificationPreferencesForm preferences={data.notificationPreferences} />
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
