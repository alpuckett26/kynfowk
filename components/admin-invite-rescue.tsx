"use client";

import { useActionState } from "react";

import { adminRescueInviteAction } from "@/app/actions";
import type { InviteRescueItem } from "@/lib/data";

const initialState = { success: false, message: "" };

function RescueForm({ item }: { item: InviteRescueItem }) {
  const [state, formAction, pending] = useActionState(adminRescueInviteAction, initialState);

  if (state.success) {
    return <p className="form-message form-success">{state.message}</p>;
  }

  return (
    <form action={formAction} className="stack-sm">
      <input type="hidden" name="membershipId" value={item.membershipId} />
      <input type="hidden" name="targetUserId" value={item.existingUserId} />
      <button className="button button-secondary" disabled={pending} type="submit">
        {pending ? "Rescuing..." : "Rescue — claim invite for this user"}
      </button>
      {state.message ? (
        <p className="form-message">{state.message}</p>
      ) : null}
    </form>
  );
}

export function AdminInviteRescue({ items }: { items: InviteRescueItem[] }) {
  if (!items.length) {
    return <p className="meta">No invite mismatches found — everyone is in the right place.</p>;
  }

  return (
    <div className="list">
      {items.map((item) => (
        <div className="list-item" key={item.membershipId}>
          <div className="stack-sm" style={{ flex: 1 }}>
            <div className="call-actions">
              <p><strong>{item.displayName}</strong> — {item.inviteEmail}</p>
              <span className="badge">Needs rescue</span>
            </div>
            <p className="meta">
              Invited to: <strong>{item.familyCircleName}</strong>
            </p>
            {item.currentCircles.length > 0 ? (
              <p className="meta">
                Currently in:{" "}
                {item.currentCircles.map((c) => `${c.name} (${c.status})`).join(", ")}
              </p>
            ) : (
              <p className="meta">Not in any circle yet — signed up but not linked.</p>
            )}
            <p className="meta">
              Account: {item.existingUserName ?? "No name set"} · ID {item.existingUserId.slice(0, 8)}…
            </p>
            <RescueForm item={item} />
          </div>
        </div>
      ))}
    </div>
  );
}
