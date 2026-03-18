"use client";

import { useRef } from "react";

import { inviteFamilyMemberAction } from "@/app/actions";
import { RELATIONSHIP_OPTIONS } from "@/lib/relationship-classifier";

export function InviteFamButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button className="button invite-fam-btn" onClick={open} type="button">
        + Invite Fam
      </button>

      <dialog className="invite-dialog" onClose={close} ref={dialogRef}>
        <div className="invite-dialog-inner">
          <div className="invite-dialog-header">
            <h3>Invite a family member</h3>
            <button
              aria-label="Close"
              className="invite-dialog-close"
              onClick={close}
              type="button"
            >
              ✕
            </button>
          </div>

          <p className="meta">
            Add someone to your Family Circle and send them an invite link.
          </p>

          <form action={inviteFamilyMemberAction} className="invite-form">
            <div className="field">
              <label htmlFor="invite-name">Their name</label>
              <input
                autoComplete="off"
                id="invite-name"
                name="displayName"
                placeholder="e.g. Grandma Rose"
                required
                type="text"
              />
            </div>
            <div className="field">
              <label htmlFor="invite-email">Their email</label>
              <input
                id="invite-email"
                name="inviteEmail"
                placeholder="rose@example.com"
                required
                type="email"
              />
            </div>
            <div className="field">
              <label htmlFor="invite-relationship">Relationship</label>
              <select id="invite-relationship" name="relationship" required>
                <option value="">— Select relationship —</option>
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
              <span className="field-hint">Places them in your Family Tree automatically</span>
            </div>
            <div className="invite-form-actions">
              <button className="button" type="submit">
                Send invite
              </button>
              <button className="button button-secondary" onClick={close} type="button">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
