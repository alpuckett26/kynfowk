import Link from "next/link";

import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { MemberAvailabilityForm } from "@/components/member-availability-form";
import { getAvailabilityManagementData, requireViewer } from "@/lib/data";

export default async function AvailabilityPage() {
  const user = await requireViewer();
  const data = await getAvailabilityManagementData(user.id);

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <section className="dashboard-hero">
          <div className="stack-md">
            <span className="eyebrow">{data.circle.name}</span>
            <h1>Keep your availability easy to trust.</h1>
            <p className="lede">
              Share the recurring windows that actually feel realistic for {data.membership.display_name}.
              Kynfowk will use them to protect more Time Together with less coordination drag.
            </p>
          </div>

          <Card className="hero-summary-card">
            <p className="stat-label">Your current rhythm</p>
            <p className="highlight-value">
              {data.currentSlots.length ? `${data.currentSlots.length} windows` : "Not shared yet"}
            </p>
            <p className="meta">
              {data.nextBestOverlap
                ? `Best overlap coming up: ${data.nextBestOverlap.label} with ${data.nextBestOverlap.participant_count} active family members.`
                : "As more relatives share availability, Kynfowk will surface stronger overlap suggestions here."}
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
              <MemberAvailabilityForm currentSlots={data.currentSlots} />
            </Card>
          </div>

          <div className="dashboard-main">
            <Card>
              <div className="stack-md">
                <h2>Current availability</h2>
                {data.summary.length ? (
                  <div className="list">
                    {data.summary.map((item) => (
                      <div className="list-item" key={item.label}>
                        <div>
                          <p>{item.dayLabel}</p>
                          <p className="meta">{item.label.replace(`${item.dayLabel}: `, "")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Nothing shared yet"
                    description="Pick a few windows on the left so your Family Circle can start building around real overlap."
                  />
                )}
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <h2>How Kynfowk uses this</h2>
                <div className="stack-sm">
                  <p className="meta">
                    Your weekly windows feed directly into overlap-based call suggestions.
                  </p>
                  <p className="meta">
                    If your rhythm changes, update it here instead of rebuilding the Family Circle.
                  </p>
                  <p className="meta">
                    Times are currently stored against your saved timezone so recurring windows stay consistent.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
