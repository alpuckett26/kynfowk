"use client";

import { useActionState, useState } from "react";

import { saveContactAction, type ContactState } from "@/app/actions";

const AVATAR_COLORS = ["#c7663f", "#7c6af7", "#0ea5e9", "#d97706", "#16a34a", "#db2777"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function PhonebookEntry({
  member,
  viewerMembershipId
}: {
  member: {
    id: string;
    display_name: string;
    relationship_label: string | null;
    phone_number: string | null;
    address: string | null;
    avatar_url: string | null;
    status: string;
  };
  viewerMembershipId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(saveContactAction, {
    status: "idle" as ContactState["status"]
  });

  const canEdit = member.id === viewerMembershipId;

  return (
    <div className="phonebook-entry">
      <div className="phonebook-avatar">
        {member.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.avatar_url} alt={member.display_name} className="phonebook-avatar-img" />
        ) : (
          <div
            className="phonebook-avatar-initials"
            style={{ background: avatarColor(member.display_name) }}
          >
            {initials(member.display_name)}
          </div>
        )}
      </div>

      <div className="phonebook-info">
        <div className="phonebook-name-row">
          <span className="phonebook-name">{member.display_name}</span>
          {member.relationship_label && (
            <span className="phonebook-rel">{member.relationship_label}</span>
          )}
          {member.status === "invited" && (
            <span className="badge">Invited</span>
          )}
        </div>

        {!editing ? (
          <div className="phonebook-contact-row">
            {member.phone_number ? (
              <a className="phonebook-detail" href={`tel:${member.phone_number}`}>
                📞 {member.phone_number}
              </a>
            ) : (
              <span className="phonebook-detail phonebook-empty">No phone saved</span>
            )}
            {member.address ? (
              <span className="phonebook-detail">📍 {member.address}</span>
            ) : (
              <span className="phonebook-detail phonebook-empty">No address saved</span>
            )}
            {canEdit && (
              <button
                className="phonebook-edit-btn"
                onClick={() => setEditing(true)}
                type="button"
              >
                {member.phone_number || member.address ? "Edit" : "Add my info"}
              </button>
            )}
          </div>
        ) : (
          <form action={action} className="phonebook-edit-form" onSubmit={() => { if (state.status !== "error") setEditing(false); }}>
            <input type="hidden" name="membershipId" value={member.id} />
            <div className="field-grid two-col">
              <label className="field">
                <span>Phone number</span>
                <input
                  name="phoneNumber"
                  defaultValue={member.phone_number ?? ""}
                  placeholder="(555) 867-5309"
                  type="tel"
                />
              </label>
              <label className="field">
                <span>Address</span>
                <input
                  name="address"
                  defaultValue={member.address ?? ""}
                  placeholder="123 Main St, Atlanta, GA"
                />
              </label>
            </div>
            <div className="phonebook-edit-actions">
              <button className="button button-secondary" disabled={pending} type="submit">
                {pending ? "Saving..." : "Save"}
              </button>
              <button
                className="button button-ghost"
                onClick={() => setEditing(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
            {state.status === "error" && state.message && (
              <p className="form-message">{state.message}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
