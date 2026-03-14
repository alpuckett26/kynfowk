import {
  removeFamilyMemberAction,
  resendFamilyInviteAction,
  updateFamilyMemberAction
} from "@/app/actions";
import { EmptyState } from "@/components/empty-state";

function MemberRow({
  member,
  familyCircleId,
  canManage,
  isViewer
}: {
  member: {
    id: string;
    display_name: string;
    relationship_label: string | null;
    invite_email: string | null;
    status: "active" | "invited";
    role: "owner" | "member";
    user_id: string | null;
  };
  familyCircleId: string;
  canManage: boolean;
  isViewer: boolean;
}) {
  return (
    <div className="list-item family-member-row">
      <div className="stack-sm family-member-main">
        <div className="call-actions">
          <p>{member.display_name}</p>
          <span className="badge">{member.status === "active" ? "Joined" : "Pending invite"}</span>
          {member.role === "owner" ? <span className="badge">Owner</span> : null}
        </div>
        <p className="meta">
          {member.relationship_label
            ? `${member.relationship_label}${member.invite_email ? ` • ${member.invite_email}` : ""}`
            : member.invite_email ?? "Family Circle member"}
        </p>
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
            <input
              defaultValue={member.relationship_label ?? ""}
              name="relationshipLabel"
              placeholder="Relationship label"
            />
            <button className="button button-secondary" type="submit">
              Save
            </button>
          </form>

          <div className="call-actions">
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
              <form action={removeFamilyMemberAction}>
                <input name="familyCircleId" type="hidden" value={familyCircleId} />
                <input name="membershipId" type="hidden" value={member.id} />
                <button className="button button-secondary" type="submit">
                  Remove
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : (
        <span className="meta">Only the circle owner can update membership details.</span>
      )}
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
  members: {
    id: string;
    display_name: string;
    relationship_label: string | null;
    invite_email: string | null;
    status: "active" | "invited";
    role: "owner" | "member";
    user_id: string | null;
    created_at: string;
  }[];
}) {
  if (!members.length) {
    return (
      <EmptyState
        title="No family members yet"
        description="Once people are added to this Family Circle, their invite and membership details will live here."
      />
    );
  }

  return (
    <div className="list">
      {members.map((member) => (
        <MemberRow
          canManage={canManage}
          familyCircleId={familyCircleId}
          isViewer={member.id === viewerMembershipId}
          key={member.id}
          member={member}
        />
      ))}
    </div>
  );
}
