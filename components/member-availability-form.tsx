"use client";

import { useActionState } from "react";

import { saveMemberAvailabilityAction, type AvailabilityState } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { DAYS, TIME_BLOCKS } from "@/lib/constants";

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

        <div className="availability-grid">
          <div className="availability-head" />
          {DAYS.map((day) => (
            <div className="availability-head" key={day.value}>
              {day.label}
            </div>
          ))}

          {TIME_BLOCKS.map((block) => (
            <div className="availability-row" key={block.label}>
              <div className="availability-label">{block.label}</div>
              {DAYS.map((day) => {
                const slotValue = `${day.value}|${block.startHour}|${block.endHour}`;

                return (
                  <label className="availability-cell" key={slotValue}>
                    <input
                      defaultChecked={currentSlots.includes(slotValue)}
                      name="slots"
                      type="checkbox"
                      value={slotValue}
                    />
                    <span>{block.label}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
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
