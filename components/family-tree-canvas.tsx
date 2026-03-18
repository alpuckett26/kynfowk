"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { addPlaceholderMemberAction, scheduleDirectCallAction } from "@/app/actions";
import { RELATIONSHIP_OPTIONS, type TreeLayout, type TreeMember } from "@/lib/relationship-classifier";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// ---------------------------------------------------------------------------
// Presence helpers
// ---------------------------------------------------------------------------

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

const AVATAR_COLORS = ["#c7663f", "#7c6af7", "#0ea5e9", "#d97706", "#16a34a", "#db2777"];

function avatarColor(name: string) {
  const i = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

function MemberAvatar({
  member,
  size = 44,
}: {
  member: Pick<TreeMember, "display_name" | "avatar_url" | "is_placeholder" | "is_deceased">;
  size?: number;
}) {
  const initials = member.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const bg =
    member.is_placeholder || member.is_deceased ? "#b0a898" : avatarColor(member.display_name);

  return member.avatar_url ? (
    <div className="tree-avatar" style={{ width: size, height: size }}>
      <Image
        alt={member.display_name}
        height={size}
        src={member.avatar_url}
        style={{ borderRadius: "50%", objectFit: "cover", display: "block" }}
        unoptimized
        width={size}
      />
    </div>
  ) : (
    <div
      className="tree-avatar tree-avatar-initials"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.32 }}
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Online indicator dot
// ---------------------------------------------------------------------------

function OnlineDot({ online, size = 10 }: { online: boolean; size?: number }) {
  if (!online) return null;
  return <span className="tree-online-dot" style={{ width: size, height: size }} aria-label="Online" />;
}

// ---------------------------------------------------------------------------
// Member info panel (modal sheet)
// ---------------------------------------------------------------------------

function MemberInfoPanel({
  member,
  familyCircleId,
  viewerMembershipId,
  onClose,
}: {
  member: TreeMember;
  familyCircleId: string;
  viewerMembershipId: string;
  onClose: () => void;
}) {
  const online = isOnline(member.last_seen_at);
  const formRef = useRef<HTMLFormElement>(null);
  const [scheduling, setScheduling] = useState(false);

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Default start: next hour on the hour
  const defaultStart = (() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  })();

  return (
    <div className="member-panel-backdrop" onClick={handleBackdrop}>
      <div className="member-panel" role="dialog" aria-modal>
        {/* Header */}
        <div className="member-panel-header">
          <div className="member-panel-avatar-wrap">
            <MemberAvatar member={member} size={72} />
            {online && <OnlineDot online size={14} />}
          </div>
          <div className="member-panel-identity">
            <h2 className="member-panel-name">{member.display_name}</h2>
            {member.relationship_label && (
              <p className="member-panel-rel">{member.relationship_label}</p>
            )}
            <p className={`member-panel-status ${online ? "member-panel-status-online" : "member-panel-status-offline"}`}>
              {online ? "Online now" : member.last_seen_at ? "Away" : "Offline"}
            </p>
          </div>
          <button className="member-panel-close" onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>

        {/* Contact */}
        {(member.invite_email || member.phone_number) && (
          <div className="member-panel-section">
            <p className="member-panel-section-label">Contact</p>
            {member.invite_email && (
              <a className="member-panel-contact-row" href={`mailto:${member.invite_email}`}>
                <span className="member-panel-contact-icon">✉</span>
                {member.invite_email}
              </a>
            )}
            {member.phone_number && (
              <a className="member-panel-contact-row" href={`tel:${member.phone_number}`}>
                <span className="member-panel-contact-icon">☎</span>
                {member.phone_number}
              </a>
            )}
          </div>
        )}

        {/* Notes for placeholders */}
        {member.is_placeholder && member.placeholder_notes && (
          <div className="member-panel-section">
            <p className="member-panel-section-label">Note</p>
            <p className="meta">{member.placeholder_notes}</p>
          </div>
        )}

        {/* Schedule call — only for real (non-placeholder, non-self) members */}
        {!member.is_placeholder && !member.isViewer && (
          <div className="member-panel-section">
            <p className="member-panel-section-label">Schedule a call</p>
            {!scheduling ? (
              <button
                className="button"
                onClick={() => setScheduling(true)}
                type="button"
              >
                📅 Schedule call with {member.display_name.split(" ")[0]}
              </button>
            ) : (
              <form
                ref={formRef}
                action={scheduleDirectCallAction}
                className="member-schedule-form stack-sm"
              >
                <input name="familyCircleId" type="hidden" value={familyCircleId} />
                <input name="targetMembershipId" type="hidden" value={member.id} />

                <label className="field">
                  <span>Call title</span>
                  <input
                    defaultValue={`Call with ${member.display_name.split(" ")[0]}`}
                    name="title"
                    required
                  />
                </label>

                <label className="field">
                  <span>Date &amp; time</span>
                  <input
                    defaultValue={defaultStart}
                    min={new Date().toISOString().slice(0, 16)}
                    name="scheduledStart"
                    required
                    type="datetime-local"
                  />
                </label>

                <label className="field">
                  <span>Duration</span>
                  <select defaultValue="30" name="durationMinutes">
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </label>

                <div className="call-actions">
                  <button className="button" type="submit">Schedule call</button>
                  <button
                    className="button button-ghost"
                    onClick={() => setScheduling(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual tree card
// ---------------------------------------------------------------------------

function MemberCard({
  member,
  online,
  onClick,
}: {
  member: TreeMember;
  online: boolean;
  onClick: () => void;
}) {
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

  const tag = member.is_placeholder
    ? "Placeholder"
    : member.is_deceased
      ? "In memoriam"
      : member.status === "invited"
        ? "Invited"
        : null;

  return (
    <button
      className={`tree-member-card ${tierClass}`}
      onClick={onClick}
      type="button"
    >
      <div className="tree-member-avatar-wrap">
        <MemberAvatar member={member} size={44} />
        {online && <OnlineDot online size={10} />}
      </div>
      <div className="tree-member-info">
        <span className="tree-member-name">{member.display_name}</span>
        {!member.isViewer && (
          <span className="tree-member-rel">
            {member.classification.normalized || member.relationship_label || ""}
          </span>
        )}
        {tag && <span className="tree-member-status-tag">{tag}</span>}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Add placeholder form
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
        <button className="tree-panel-close" onClick={onClose} type="button">✕</button>
      </div>
      <p className="meta">
        Holds a spot for someone who hasn&apos;t joined yet or is no longer with us.
        When someone joins with a matching email, they&apos;ll claim their place automatically.
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
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
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
          <input name="placeholderNotes" placeholder="e.g. Jennifer&apos;s brother Matt" />
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
          <button className="button button-ghost" onClick={onClose} type="button">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main canvas
// ---------------------------------------------------------------------------

export function FamilyTreeCanvas({
  layout,
  familyCircleId,
  viewerMembershipId,
}: {
  layout: TreeLayout;
  familyCircleId: string;
  viewerMembershipId: string;
}) {
  const [selectedMember, setSelectedMember] = useState<TreeMember | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Live last_seen_at map — updated via Supabase Realtime
  const [presenceMap, setPresenceMap] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    for (const row of layout.rows) {
      for (const m of row.members) map[m.id] = m.last_seen_at;
    }
    return map;
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("family-presence")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "family_memberships",
          filter: `family_circle_id=eq.${familyCircleId}`,
        },
        (payload) => {
          const { id, last_seen_at } = payload.new as { id: string; last_seen_at: string | null };
          setPresenceMap((prev) => ({ ...prev, [id]: last_seen_at }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [familyCircleId]);

  if (layout.rows.length === 0) {
    return (
      <div className="tree-empty">
        <p>No family members placed yet. Add members with relationship labels on the Family page, or add a placeholder below.</p>
        <button className="button button-secondary" onClick={() => setShowAddPanel(true)} type="button">
          + Add placeholder
        </button>
        {showAddPanel && <AddPlaceholderPanel onClose={() => setShowAddPanel(false)} />}
      </div>
    );
  }

  return (
    <>
      <div className="tree-canvas-v2">
        {/* Legend */}
        <div className="tree-legend">
          <span className="tree-legend-item tree-legend-immediate">Immediate</span>
          <span className="tree-legend-item tree-legend-secondary">Secondary</span>
          <span className="tree-legend-item tree-legend-extended">Extended</span>
          <span className="tree-legend-item tree-legend-placeholder">Placeholder</span>
          <span className="tree-legend-item tree-legend-deceased">In memoriam</span>
          <span className="tree-legend-item tree-legend-online">Online</span>
        </div>

        {/* Tree levels */}
        <div className="tree-levels">
          {layout.rows.map((row, i) => {
            const isLast = i === layout.rows.length - 1;
            return (
              <div key={row.generation} className="tree-level">
                <div className="tree-level-tab">
                  <span className="tree-gen-label">{row.label}</span>
                  <span className="tree-gen-badge">
                    {row.generation > 0 ? `+${row.generation}` : row.generation}
                  </span>
                </div>
                <div className="tree-level-body">
                  <div className="tree-level-members">
                    {row.members.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        online={!member.isViewer && isOnline(presenceMap[member.id] ?? null)}
                        onClick={() => setSelectedMember(member)}
                      />
                    ))}
                  </div>
                </div>
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
            <button className="tree-add-placeholder-btn" onClick={() => setShowAddPanel(true)} type="button">
              <span className="tree-add-icon">+</span>
              Add a family member placeholder
            </button>
          )}
        </div>
      </div>

      {/* Info panel overlay */}
      {selectedMember && (
        <MemberInfoPanel
          member={selectedMember}
          familyCircleId={familyCircleId}
          viewerMembershipId={viewerMembershipId}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}
