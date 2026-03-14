import Link from "next/link";

import { Card } from "@/components/card";
import { FamilyManagementList } from "@/components/family-management-list";
import { StatusBanner } from "@/components/status-banner";
import { getFamilyManagementData, requireViewer } from "@/lib/data";

export default async function FamilyPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const user = await requireViewer();
  const data = await getFamilyManagementData(user.id);
  const pendingInvites = data.members.filter((member) => member.status === "invited").length;

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <StatusBanner code={params?.status} />

        <section className="dashboard-hero">
          <div className="stack-md">
            <span className="eyebrow">{data.circle.name}</span>
            <h1>Keep your Family Circle tidy and easy to trust.</h1>
            <p className="lede">
              Review who is active, who still needs an invite nudge, and which details should
              stay current before the next family call gets scheduled.
            </p>
          </div>

          <Card className="hero-summary-card">
            <p className="stat-label">Family overview</p>
            <p className="highlight-value">{data.members.length} people</p>
            <p className="meta">
              {pendingInvites
                ? `${pendingInvites} pending invite${pendingInvites === 1 ? "" : "s"} still need a little follow-through.`
                : "Everyone currently listed here is either active or already cleaned up."}
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
            <div className="section-header-row">
              <div>
                <h2>Family members</h2>
                <p className="meta">
                  {data.viewer.canManage
                    ? "As the current owner, you can update names, resend pending invites, and remove members when it is safe to do so."
                    : "You can review the Family Circle here. Ownership controls stay with the circle owner in this MVP."}
                </p>
                {data.viewer.canManage ? (
                  <p className="microcopy">
                    Active members who already have availability or call history stay protected
                    from outright removal so past records and connection metrics remain trustworthy.
                  </p>
                ) : null}
              </div>
            </div>

            <FamilyManagementList
              canManage={data.viewer.canManage}
              familyCircleId={data.circle.id}
              members={data.members}
              viewerMembershipId={data.viewer.membershipId}
            />
          </div>
        </Card>
      </div>
    </main>
  );
}
