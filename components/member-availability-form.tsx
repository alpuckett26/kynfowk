"use client";

import { useActionState } from "react";

import { saveMemberAvailabilityAction, type AvailabilityState } from "@/app/actions";
import { AvailabilityPicker } from "@/components/availability-picker";
import { EmptyState } from "@/components/empty-state";

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
  const hasAvailability = currentSlots.length > 0;

  return (
    <form className="stack-lg" action={formAction}>
      {!hasAvailability ? (
        <EmptyState
          title="No recurring availability yet"
          description="Choose the windows that usually feel realistic for you. Kynfowk will use them to surface the next good moment together."
        />
      ) : null}

      <section className="stack-md">
        <div className="section-heading compact">
          <span className="eyebrow">Your weekly rhythm</span>
          <h2>Share the windows you can usually keep.</h2>
          <p>
            Update this anytime. Your Family Circle uses these recurring windows to find
            stronger overlap without another round of group-text coordination.
          </p>
        </div>

        <AvailabilityPicker currentSlots={currentSlots} />
      </section>

      {state.message ? (
        <p className={`form-message ${state.status === "success" ? "form-success" : ""}`}>
          {state.message}
        </p>
      ) : null}

      <div className="availability-actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? "Saving your availability..." : "Save availability"}
        </button>
        <p className="microcopy">Times are currently interpreted in your saved timezone.</p>
      </div>
    </form>
  );
}
