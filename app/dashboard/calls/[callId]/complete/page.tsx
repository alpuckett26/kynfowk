import type { Route } from "next";
import Link from "next/link";

import { Card } from "@/components/card";
import { CompleteCallForm } from "@/components/complete-call-form";
import { EmptyState } from "@/components/empty-state";
import { getCallCompletionData, requireViewer } from "@/lib/data";
import { formatDateTimeRange } from "@/lib/utils";

export default async function CompleteCallPage({
  params
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;
  const user = await requireViewer();
  const data = await getCallCompletionData(user.id, callId);

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <section className="dashboard-hero">
          <div className="stack-md">
            <span className="eyebrow">{data.circle.name}</span>
            <h1>Close the loop on this family moment.</h1>
            <p className="lede">
              Confirm who connected and how long the call lasted so Kynfowk can keep your
              Family Connections counters honest and warm.
            </p>
          </div>

          <Card className="hero-summary-card">
            <p className="stat-label">Call ready to complete</p>
            <p className="highlight-value">{data.call.title}</p>
            <p className="meta">
              {formatDateTimeRange(data.call.scheduled_start, data.call.scheduled_end)}
            </p>
            <div className="pill-row compact-pills">
              <Link className="button button-secondary" href={"/dashboard" as Route}>
                Back to dashboard
              </Link>
            </div>
          </Card>
        </section>

        <Card>
          {data.call.status === "completed" ? (
            <EmptyState
              title="This call is already completed"
              description="Its Time Together metrics are already reflected on the dashboard."
              action={
                <Link className="button button-secondary" href={"/dashboard" as Route}>
                  Return to dashboard
                </Link>
              }
            />
          ) : (
            <CompleteCallForm
              callId={data.call.id}
              familyCircleId={data.circle.id}
              participants={data.participants}
            />
          )}
        </Card>
      </div>
    </main>
  );
}
