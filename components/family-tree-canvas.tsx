"use client";

import { useState } from "react";

import type { TreeLayout, TreeMember } from "@/lib/relationship-classifier";

function MemberCard({ member }: { member: TreeMember }) {
  const [hovered, setHovered] = useState(false);

  const tierClass =
    member.isViewer
      ? "tree-member-viewer"
      : member.classification.tier === "immediate"
        ? "tree-member-immediate"
        : member.classification.tier === "secondary"
          ? "tree-member-secondary"
          : member.classification.tier === "extended"
            ? "tree-member-extended"
            : "tree-member-other";

  return (
    <div
      className={`tree-member-card ${tierClass} ${hovered ? "tree-member-hovered" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="tree-member-name">{member.display_name}</span>
      {!member.isViewer && (
        <span className="tree-member-rel">
          {member.classification.normalized || member.relationship_label || ""}
        </span>
      )}
      {hovered && !member.isViewer && member.relationship_label && (
        <span className="tree-member-tooltip">
          {member.relationship_label}
        </span>
      )}
    </div>
  );
}

export function FamilyTreeCanvas({ layout }: { layout: TreeLayout }) {
  if (layout.rows.length === 0) {
    return (
      <div className="tree-empty">
        <p>No family members have been placed yet. Add members with relationship labels on the Family page.</p>
      </div>
    );
  }

  return (
    <div className="tree-canvas">
      <div className="tree-legend">
        <span className="tree-legend-item tree-legend-immediate">Immediate</span>
        <span className="tree-legend-item tree-legend-secondary">Secondary</span>
        <span className="tree-legend-item tree-legend-extended">Extended</span>
      </div>

      <div className="tree-rows">
        {layout.rows.map((row) => (
          <div className="tree-row" key={row.generation}>
            <div className="tree-row-label">
              <span className="tree-gen-label">{row.label}</span>
              <span className="tree-gen-badge">Gen {row.generation > 0 ? `+${row.generation}` : row.generation}</span>
            </div>
            <div className="tree-row-members">
              {row.members.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
