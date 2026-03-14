import Link from "next/link";

import { Card } from "@/components/card";
import { FeedbackForm } from "@/components/feedback-form";
import { getViewerFamilyCircle, requireViewer } from "@/lib/data";

export default async function FeedbackPage({
  searchParams
}: {
  searchParams?: Promise<{ page?: string; callId?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const user = await requireViewer();
  const family = await getViewerFamilyCircle(user.id);

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <section className="dashboard-hero">
          <div className="stack-md">
            <span className="eyebrow">Pilot feedback</span>
            <h1>Tell us what felt smooth, or what still felt rough.</h1>
            <p className="lede">
              Short notes are enough. Kynfowk will save the page context when it is available so
              the pilot team can understand what you were trying to do.
            </p>
          </div>

          <Card className="hero-summary-card">
            <p className="stat-label">Current context</p>
            <p className="highlight-value">{params?.callId ? "Call-related" : "General note"}</p>
            <p className="meta">
              Page: {params?.page ?? "/feedback"}
              {params?.callId ? ` • Call ${params.callId}` : ""}
            </p>
            <div className="pill-row compact-pills">
              <Link className="button button-secondary" href="/dashboard">
                Back to dashboard
              </Link>
            </div>
          </Card>
        </section>

        <Card>
          <div className="stack-md">
            <h2>Share pilot feedback</h2>
            <FeedbackForm
              callSessionId={params?.callId ?? null}
              familyCircleId={family?.circle.id ?? null}
              pagePath={params?.page ?? "/feedback"}
            />
          </div>
        </Card>
      </div>
    </main>
  );
}
