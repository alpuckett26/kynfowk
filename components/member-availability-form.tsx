"use client";

import { useActionState } from "react";

import { saveMemberAvailabilityAction, type AvailabilityState } from "@/app/actions";
import { AvailabilityPicker } from "@/components/availability-picker";

const initialState: AvailabilityState = {
  status: "idle"
};

export function MemberAvailabilityForm({
  currentSlots
}: {
  currentSlots: string[];
}) {
  const [state, formAction, pending] = useActionState(
    saveMemberAvailabilityAction,
    initialState
  );

  return (
    <form className="stack-md" action={formAction}>
      <AvailabilityPicker currentSlots={currentSlots} />

      {state.message ? (
        <p className={`form-message ${state.status === "success" ? "form-success" : ""}`}>
          {state.message}
        </p>
      ) : null}

      <div className="availability-actions">
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save availability"}
        </button>
      </div>
    </form>
  );
}
