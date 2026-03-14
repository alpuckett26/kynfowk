"use client";

import { useActionState } from "react";

import { saveCallRecapAction, type RecapState } from "@/app/actions";
import type { CallRecap } from "@/lib/types";

const initialState: RecapState = {
  status: "idle"
};

export function PostCallSummaryForm({
  recap,
  familyCircleId
}: {
  recap: CallRecap;
  familyCircleId: string;
}) {
  const [state, formAction, pending] = useActionState(saveCallRecapAction, initialState);

  return (
    <form className="stack-md" action={formAction}>
      <input name="callId" type="hidden" value={recap.callId} />
      <input name="familyCircleId" type="hidden" value={familyCircleId} />

      <div className="field-grid">
        <label className="field">
          <span>Summary</span>
          <textarea
            defaultValue={recap.summary ?? ""}
            name="summary"
            placeholder="What did the family catch up on?"
            rows={4}
          />
        </label>

        <div className="field-grid two-col">
          <label className="field">
            <span>Moment Shared highlight</span>
            <input
              defaultValue={recap.highlight ?? ""}
              name="highlight"
              placeholder="Grandpa shared stories from his first job."
            />
          </label>
          <label className="field">
            <span>Next step</span>
            <input
              defaultValue={recap.nextStep ?? ""}
              name="nextStep"
              placeholder="Plan a birthday call next Thursday."
            />
          </label>
        </div>
      </div>

      {state.message ? (
        <p className={`form-message ${state.status === "success" ? "form-success" : ""}`}>
          {state.message}
        </p>
      ) : null}

      <button className="button" disabled={pending} type="submit">
        {pending ? "Saving summary..." : "Save post-call summary"}
      </button>
    </form>
  );
}
