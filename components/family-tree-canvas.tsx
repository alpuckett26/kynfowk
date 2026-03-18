"use client";

import Image from "next/image";
import { useRef, useState, useCallback } from "react";

import type { TreeLayout, TreeMember } from "@/lib/relationship-classifier";
import { RELATIONSHIP_OPTIONS } from "@/lib/relationship-classifier";
import { addPlaceholderMemberAction } from "@/app/actions";

// ---------------------------------------------------------------------------
// Avatar component – shows photo if available, otherwise initials
// ---------------------------------------------------------------------------

function MemberAvatar({
  member,
  size = 48
}: {
  member: TreeMember;
  size?: number;
}) {
  const initials = member.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (member.avatar_url) {
    return (
      <div
        className="tree-avatar"
        style={{ width: size, height: size, flexShrink: 0 }}
      >
        <Image
          alt={member.display_name}
          className="tree-avatar-img"
          height={size}
          src={member.avatar_url}
          style={{ borderRadius: "50%", objectFit: "cover" }}
          width={size}
          unoptimized
        />
      </div>
    );
  }

  const colorIndex =
    member.display_name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 6;
  const colors = ["#c7663f", "#7c6af7", "#0ea5e9", "#d97706", "#16a34a", "#db2777"];
  const bg = member.is_placeholder || member.is_deceased ? "#b0a898" : colors[colorIndex];

  return (
    <div
      className="tree-avatar tree-avatar-initials"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.32,
        flexShrink: 0
      }}
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual member card
// ---------------------------------------------------------------------------

function MemberCard({ member }: { member: TreeMember }) {
  const [hovered, setHovered] = useState(false);

  const tierClass = member.isViewer
    ? "tree-member-viewer"
    : member.is_placeholder
      ? "tree-member-placeholder"
      : member.is_deceased
        ? "tree-member-deceased"
        : member.classification.tier === "immediate"
          ? "tree-member-immediate"
          : member.classification.tier === "secondary"
            ? "tree-member-secondary"
            : member.classification.tier === "extended"
              ? "tree-member-extended"
              : "tree-member-other";

  const label =
    member.is_placeholder
      ? "Placeholder"
      : member.is_deceased
        ? "In memoriam"
        : member.status === "invited"
          ? "Invited"
          : null;

  return (
    <div
      className={`tree-member-card ${tierClass} ${hovered ? "tree-member-hovered" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MemberAvatar member={member} size={44} />
      <div className="tree-member-info">
        <span className="tree-member-name">{member.display_name}</span>
        {!member.isViewer && (
          <span className="tree-member-rel">
            {member.classification.normalized || member.relationship_label || ""}
          </span>
        )}
        {label && <span className="tree-member-status-tag">{label}</span>}
        {member.is_placeholder && member.placeholder_notes && hovered && (
          <span className="tree-member-tooltip">{member.placeholder_notes}</span>
        )}
        {!member.is_placeholder && hovered && !member.isViewer && member.relationship_label && (
          <span className="tree-member-tooltip">{member.relationship_label}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add placeholder form (inline panel)
// ---------------------------------------------------------------------------

function AddPlaceholderPanel({ onClose }: { onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [isDeceased, setIsDeceased] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setPending(true);
      const fd = new FormData(e.currentTarget);
      fd.set("isDeceased", isDeceased ? "true" : "false");
      await addPlaceholderMemberAction(fd);
      formRef.current?.reset();
      setPending(false);
      onClose();
    },
    [isDeceased, onClose]
  );

  return (
    <div className="tree-placeholder-panel">
      <div className="tree-placeholder-panel-header">
        <h3>Add a placeholder</h3>
        <button className="tree-panel-close" onClick={onClose} type="button">
          ✕
        </button>
      </div>
      <p className="meta">
        Placeholder family members hold a spot in the tree for people who
        haven't joined yet — or who are no longer with us. When someone joins
        with a matching email, they'll claim their place automatically.
      </p>
      <form className="tree-placeholder-form stack-md" onSubmit={handleSubmit} ref={formRef}>
        <div className="field-grid two-col">
          <label className="field">
            <span>Name</span>
            <input name="displayName" placeholder="Grandma June" required />
          </label>
          <label className="field">
            <span>Relationship to you</span>
            <select name="relationship" required>
              <option value="">— Select —</option>
              {RELATIONSHIP_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Email (optional — used to auto-claim when they join)</span>
          <input name="inviteEmail" placeholder="june@example.com" type="email" />
        </label>

        <label className="field">
          <span>Context note (optional)</span>
          <input
            name="placeholderNotes"
            placeholder="e.g. Jennifer's brother Matt"
          />
        </label>

        <label className="tree-deceased-toggle">
          <input
            checked={isDeceased}
            onChange={(e) => setIsDeceased(e.target.checked)}
            type="checkbox"
          />
          <span>In memoriam — this person is deceased</span>
        </label>

        <div className="call-actions">
          <button className="button" disabled={pending} type="submit">
            {pending ? "Adding…" : "Add to tree"}
          </button>
          <button className="button button-ghost" onClick={onClose} type="button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main tree canvas
// ---------------------------------------------------------------------------

export function FamilyTreeCanvas({ layout }: { layout: TreeLayout }) {
  const [showAddPanel, setShowAddPanel] = useState(false);

  if (layout.rows.length === 0) {
    return (
      <div className="tree-empty">
        <p>
          No family members placed yet. Add members with relationship labels on
          the Family page, or add a placeholder below.
        </p>
        <button
          className="button button-secondary"
          onClick={() => setShowAddPanel(true)}
          type="button"
        >
          + Add placeholder
        </button>
        {showAddPanel && <AddPlaceholderPanel onClose={() => setShowAddPanel(false)} />}
      </div>
    );
  }

  return (
    <div className="tree-canvas-v2">
      {/* Legend */}
      <div className="tree-legend">
        <span className="tree-legend-item tree-legend-immediate">Immediate</span>
        <span className="tree-legend-item tree-legend-secondary">Secondary</span>
        <span className="tree-legend-item tree-legend-extended">Extended</span>
        <span className="tree-legend-item tree-legend-placeholder">Placeholder</span>
        <span className="tree-legend-item tree-legend-deceased">In memoriam</span>
      </div>

      {/* Tree levels */}
      <div className="tree-levels">
        {layout.rows.map((row, i) => {
          const isLast = i === layout.rows.length - 1;
          return (
            <div key={row.generation} className="tree-level">
              {/* Generation tab */}
              <div className="tree-level-tab">
                <span className="tree-gen-label">{row.label}</span>
                <span className="tree-gen-badge">
                  {row.generation > 0 ? `+${row.generation}` : row.generation}
                </span>
              </div>

              {/* Horizontal branch + member cards */}
              <div className="tree-level-body">
                <div className="tree-level-members">
                  {row.members.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              </div>

              {/* Trunk connector between levels */}
              {!isLast && <div className="tree-trunk-connector" />}
            </div>
          );
        })}
      </div>

      {/* Add placeholder */}
      <div className="tree-add-row">
        {showAddPanel ? (
          <AddPlaceholderPanel onClose={() => setShowAddPanel(false)} />
        ) : (
          <button
            className="tree-add-placeholder-btn"
            onClick={() => setShowAddPanel(true)}
            type="button"
          >
            <span className="tree-add-icon">+</span>
            Add a family member placeholder
          </button>
        )}
      </div>
    </div>
  );
}
