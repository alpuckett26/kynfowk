import Link from "next/link";

import { Card } from "@/components/card";
import { FamilyTreeCanvas } from "@/components/family-tree-canvas";
import { buildTreeLayout } from "@/lib/relationship-classifier";
import { getFamilyManagementData, getCircleStrengthScore, getMemberHealthMap, requireViewer } from "@/lib/data";

export default async function FamilyTreePage() {
  const user = await requireViewer();
  const data = await getFamilyManagementData(user.id);
  const layout = buildTreeLayout(data.members, data.viewer.membershipId);
  const healthMap = await getMemberHealthMap(data.circle.id);
  const strengthScore = await getCircleStrengthScore(data.circle.id, healthMap);

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <section className="dashboard-hero">
          <div className="stack-md">
            <span className="eyebrow">{data.circle.name}</span>
            <h1>Your Family Tree</h1>
            <p className="lede">
              Everyone placed by generation — ancestors above, descendants below,
              your generation in the middle.
            </p>
          </div>

          <div className="pill-row">
            <Link className="button button-ghost" href="/family">
              ← Back to Family
            </Link>
          </div>
        </section>

        <FamilyTreeCanvas
          circleName={data.circle.name}
          familyCircleId={data.circle.id}
          healthMap={healthMap}
          layout={layout}
          strengthScore={strengthScore}
          viewerMembershipId={data.viewer.membershipId}
        />

        {layout.unplaced.length > 0 && (
          <Card>
            <div className="stack-md">
              <h2>Unplaced members</h2>
              <p className="meta">
                These members have a relationship that wasn&apos;t recognised. Edit their
                relationship label on the{" "}
                <Link href="/family">Family page</Link> to place them in the tree.
              </p>
              <ul className="tree-unplaced-list">
                {layout.unplaced.map((member) => (
                  <li className="tree-unplaced-item" key={member.id}>
                    <span className="tree-unplaced-name">{member.display_name}</span>
                    {member.relationship_label && (
                      <span className="tree-unplaced-label">
                        &ldquo;{member.relationship_label}&rdquo;
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
