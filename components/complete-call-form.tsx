"use client";

import { useActionState } from "react";

import { markCallCompletedAction, type CallCompletionState } from "@/app/actions";
import type { CallParticipantAttendance } from "@/lib/types";

const initialState: CallCompletionState = {
  status: "idle"
};

export function CompleteCallForm({
  callId,
  familyCircleId,
  participants
}: {
  callId: string;
  familyCircleId: string;
  participants: CallParticipantAttendance[];
}) {
  const [state, formAction, pending] = useActionState(
    markCallCompletedAction,
    initialState
  );

  return (
    <form className="stack-lg" action={formAction}>
      <input name="callId" type="hidden" value={callId} />
      <input name="familyCircleId" type="hidden" value={familyCircleId} />

      <div className="field-grid two-col">
        <label className="field">
          <span>Minutes shared</span>
          <input defaultValue={45} min={5} name="durationMinutes" type="number" />
        </label>
      </div>

      <section className="stack-md">
        <div className="section-heading compact">
          <span className="eyebrow">Who connected</span>
          <h2>Mark the family members who made the call.</h2>
          <p>
            These check-ins feed your Family Connections counters, so keep this to who
            actually joined.
          </p>
        </div>

        <div className="attendance-list">
          {participants.map((participant) => (
            <label className="attendance-item" key={participant.membershipId}>
              <input
                defaultChecked={participant.attended}
                name="attendedMembershipIds"
                type="checkbox"
                value={participant.membershipId}
              />
              <span>{participant.displayName}</span>
            </label>
          ))}
        </div>
      </section>

      {state.message ? (
        <p className={`form-message ${state.status === "success" ? "form-success" : ""}`}>
          {state.message}
        </p>
      ) : null}

      <button className="button" disabled={pending} type="submit">
        {pending ? "Saving completed call..." : "Save completed call"}
      </button>
    </form>
  );
}
