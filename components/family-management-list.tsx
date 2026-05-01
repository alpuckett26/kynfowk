"use client";

import {
  blockFamilyMemberAction,
  removeFamilyMemberAction,
  resendFamilyInviteAction,
  unblockFamilyMemberAction,
  updateFamilyMemberAction
} from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { MemberAvatarUpload } from "@/components/member-avatar-upload";
import { RingMemberButton } from "@/components/ring-member-button";
import { RELATIONSHIP_OPTIONS } from "@/lib/relationship-classifier";

type Member = {
  id: string;
  display_name: string;
  relationship_label: string | null;
  invite_email: string | null;
  status: "active" | "invited" | "blocked";
  role: "owner" | "member";
  user_id: string | null;
  created_at: string;
  blocked_at: string | null;
  blocked_reason: string | null;
  is_placeholder: boolean;
  is_deceased: boolean;
  placeholder_notes: string | null;
  avatar_url: string | null;
};

function ActiveMemberRow({
  member,
  familyCircleId,
  canManage,
  isViewer
}: {
  member: Member;
  familyCircleId: string;
  canManage: boolean;
  isViewer: boolean;
}) {
  return (
    <div className="list-item family-member-row">
      <MemberAvatarUpload
        currentAvatarUrl={member.avatar_url}
        displayName={member.display_name}
        membershipId={member.id}
      />
      <div className="stack-sm family-member-main">
        <div className="call-actions">
          <p>{member.display_name}</p>
          {member.is_placeholder && <span className="badge badge-warning">Placeholder</span>}
          {member.is_deceased && <span className="badge">In memoriam</span>}
          {!member.is_placeholder && (
            <span className="badge">{member.status === "active" ? "Joined" : "Pending invite"}</span>
          )}
          {member.role === "owner" ? <span className="badge">Owner</span> : null}
        </div>
        <p className="meta">
          {member.relationship_label
            ? `${member.relationship_label}${member.invite_email ? ` • ${member.invite_email}` : ""}`
            : member.invite_email ?? "Family Circle member"}
        </p>
        {member.placeholder_notes && (
          <p className="meta">{member.placeholder_notes}</p>
        )}
      </div>

      {canManage ? (
        <div className="family-member-actions stack-sm">
          <form action={updateFamilyMemberAction} className="family-inline-form">
            <input name="familyCircleId" type="hidden" value={familyCircleId} />
            <input name="membershipId" type="hidden" value={member.id} />
            <input
              defaultValue={member.display_name}
              name="displayName"
              placeholder="Display name"
            />
            <select
              defaultValue={member.relationship_label ?? ""}
              name="relationshipLabel"
            >
              <option value="">— No relationship set —</option>
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
            <button className="button button-secondary" type="submit">
              Save
            </button>
          </form>

          <div className="call-actions">
            {/* M43 — Ring now (web caller). Active members with an
                account, excluding the viewer themselves. */}
            {member.status === "active" && !isViewer ? (
              <RingMemberButton
                membershipId={member.id}
                displayName={member.display_name}
              />
            ) : null}

            {member.status === "invited" && member.invite_email ? (
              <form action={resendFamilyInviteAction}>
                <input name="familyCircleId" type="hidden" value={familyCircleId} />
                <input name="membershipId" type="hidden" value={member.id} />
                <button className="button button-secondary" type="submit">
                  Resend invite
                </button>
              </form>
            ) : null}

            {member.role !== "owner" && !isViewer ? (
              <>
                <form action={blockFamilyMemberAction}>
                  <input name="familyCircleId" type="hidden" value={familyCircleId} />
                  <input name="membershipId" type="hidden" value={member.id} />
                  <button className="button button-secondary" type="submit">
                    Block
                  </button>
                </form>

                <form action={removeFamilyMemberAction}>
                  <input name="familyCircleId" type="hidden" value={familyCircleId} />
                  <input name="membershipId" type="hidden" value={member.id} />
                  <button className="button button-secondary" type="submit">
                    Remove
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <span className="meta">Only the circle owner can update membership details.</span>
      )}
    </div>
  );
}

function BlockedMemberRow({
  member,
  familyCircleId
}: {
  member: Member;
  familyCircleId: string;
}) {
  return (
    <div className="list-item family-member-row family-member-row-blocked">
      <div className="stack-sm family-member-main">
        <div className="call-actions">
          <p>{member.display_name}</p>
          <span className="badge badge-warning">Blocked</span>
        </div>
        <p className="meta">
          {member.blocked_reason
            ? `Reason: ${member.blocked_reason}`
            : member.invite_email ?? "No email on record"}
          {member.blocked_at
            ? ` • Blocked ${new Date(member.blocked_at).toLocaleDateString()}`
            : ""}
        </p>
      </div>

      <form action={unblockFamilyMemberAction}>
        <input name="familyCircleId" type="hidden" value={familyCircleId} />
        <input name="membershipId" type="hidden" value={member.id} />
        <button className="button button-secondary" type="submit">
          Unblock
        </button>
      </form>
    </div>
  );
}

export function FamilyManagementList({
  familyCircleId,
  viewerMembershipId,
  canManage,
  members
}: {
  familyCircleId: string;
  viewerMembershipId: string;
  canManage: boolean;
  members: Member[];
}) {
  const activeMembers = members.filter((m) => m.status !== "blocked");
  const blockedMembers = members.filter((m) => m.status === "blocked");

  return (
    <div className="stack-md">
      {activeMembers.length === 0 ? (
        <EmptyState
          title="No family members yet"
          description="Once people are added to this Family Circle, their invite and membership details will live here."
        />
      ) : (
        <div className="list">
          {activeMembers.map((member) => (
            <ActiveMemberRow
              canManage={canManage}
              familyCircleId={familyCircleId}
              isViewer={member.id === viewerMembershipId}
              key={member.id}
              member={member}
            />
          ))}
        </div>
      )}

      {canManage && blockedMembers.length > 0 ? (
        <div className="stack-sm">
          <div className="blocked-members-header">
            <h3>Blocked members</h3>
            <p className="meta">
              Blocked members are excluded from calls, scheduling overlap, and family activity.
              You can unblock them at any time to restore their invited status.
            </p>
          </div>
          <div className="list">
            {blockedMembers.map((member) => (
              <BlockedMemberRow
                familyCircleId={familyCircleId}
                key={member.id}
                member={member}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
