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
  meetingProvider,
  meetingUrl,
  submitLabel,
  scheduledStartLocal,
  scheduledEndLocal,
  viewerTimezone,
  includeRescheduleFields = false
}: {
  callId: string;
  familyCircleId: string;
  title: string;
  meetingProvider: string | null;
  meetingUrl: string | null;
  submitLabel?: string;
  scheduledStartLocal?: string;
  scheduledEndLocal?: string;
  viewerTimezone?: string;
  includeRescheduleFields?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveScheduledCallDetailsAction,
    initialState
  );

  return (
    <div className="stack-sm">
      {meetingUrl ? (
        <p className="meta">
          {meetingProvider ?? "Join link"} is ready. Your family can head there when it is
          time.
        </p>
      ) : (
        <p className="meta">
          No join link yet. Add one so everyone has a calm, clear place to connect.
        </p>
      )}

      <form action={formAction} className="call-link-form">
        <input name="callId" type="hidden" value={callId} />
        <input name="familyCircleId" type="hidden" value={familyCircleId} />
        <input name="viewerTimezone" type="hidden" value={viewerTimezone ?? "America/Chicago"} />
        <input defaultValue={title} name="title" placeholder="Sunday family catch-up" />
        <input
          defaultValue={meetingProvider ?? ""}
          name="meetingProvider"
          placeholder="Zoom, Google Meet, FaceTime..."
        />
        <input
          defaultValue={meetingUrl ?? ""}
          name="meetingUrl"
          placeholder="https://meet.google.com/..."
        />
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

      {meetingUrl ? (
        <a className="microcopy" href={meetingUrl} rel="noreferrer" target="_blank">
          Preview saved link
        </a>
      ) : null}
    </div>
  );
}
