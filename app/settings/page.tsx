import Link from "next/link";

import { Card } from "@/components/card";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { getSettingsPageData, requireViewer } from "@/lib/data";
import { formatTimezoneLabel } from "@/lib/utils";

export default async function SettingsPage() {
  const user = await requireViewer();
  const data = await getSettingsPageData(user.id);

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <header>
          <h1>Settings</h1>
          <p className="meta">{formatTimezoneLabel(data.profile.timezone)}</p>
        </header>

        <section className="dashboard-grid">
          <div className="dashboard-main">
            <Card>
              <div className="stack-md">
                <h2>Profile and timing</h2>
                <p className="meta">
                  Keep your name, timezone, and quiet hours current so reminders and call times
                  stay grounded in real life.
                </p>
                <ProfileSettingsForm
                  email={data.profile.email}
                  fullName={data.profile.fullName}
                  quietHoursEnd={data.notificationPreferences.quietHoursEnd ?? null}
                  quietHoursStart={data.notificationPreferences.quietHoursStart ?? null}
                  timezone={data.profile.timezone}
                />
              </div>
            </Card>
          </div>

          <div className="dashboard-main">
            <Card>
              <div className="stack-md">
                <h2>Notification defaults</h2>
                <p className="meta">
                  Fine-tune how Kynfowk reaches out when a call is scheduled, nearing, or ready
                  to revisit.
                </p>
                <NotificationPreferencesForm
                  includeTimingFields={false}
                  preferences={data.notificationPreferences}
                />
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <h2>Pilot support</h2>
                <p className="meta">
                  If your family is just getting started, the pilot guide and feedback flow stay
                  close by here too.
                </p>
                <div className="call-actions">
                  <a className="button button-secondary" href="/getting-started">
                    Open guide
                  </a>
                  <a className="button button-secondary" href="/feedback?page=%2Fsettings">
                    Share feedback
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
