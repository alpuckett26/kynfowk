"use client";
import { useActionState } from "react";

import { saveScheduledCallDetailsAction, type CallDetailsState } from "@/app/actions";

const initialState: CallDetailsState = {
  status: "idle"
};

export function CallLinkForm({
  callId,
  familyCircleId,
  title,
  submitLabel,
  scheduledStartLocal,
  scheduledEndLocal,
  viewerTimezone,
  includeRescheduleFields = false
}: {
  callId: string;
  familyCircleId: string;
  title: string;
  submitLabel?: string;
  scheduledStartLocal?: string;
  scheduledEndLocal?: string;
  viewerTimezone?: string;
  includeRescheduleFields?: boolean;
  // legacy props kept for compatibility — no longer used
  meetingProvider?: string | null;
  meetingUrl?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveScheduledCallDetailsAction,
    initialState
  );

  return (
    <div className="stack-sm">
      <p className="meta">
        Your family will connect using the built-in Kynfowk video room — no external link needed.
      </p>

      <form action={formAction} className="call-link-form">
        <input name="callId" type="hidden" value={callId} />
        <input name="familyCircleId" type="hidden" value={familyCircleId} />
        <input name="viewerTimezone" type="hidden" value={viewerTimezone ?? "America/Chicago"} />
        <input defaultValue={title} name="title" placeholder="Sunday family catch-up" />
        {includeRescheduleFields ? (
          <div className="field-grid two-col">
            <label className="field">
              <span>Start time</span>
              <input
                defaultValue={scheduledStartLocal ?? ""}
                name="scheduledStartLocal"
                type="datetime-local"
              />
            </label>
            <label className="field">
              <span>End time</span>
              <input
                defaultValue={scheduledEndLocal ?? ""}
                name="scheduledEndLocal"
                type="datetime-local"
              />
            </label>
          </div>
        ) : null}
        <button className="button button-secondary" disabled={pending} type="submit">
          {pending ? "Saving details..." : submitLabel ?? "Save call details"}
        </button>
      </form>

      {state.message ? (
        <p className={`form-message ${state.status === "success" ? "form-success" : ""}`}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
