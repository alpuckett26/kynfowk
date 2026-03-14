"use client";

import { useActionState } from "react";

import { savePilotFeedbackAction, type FeedbackState } from "@/app/actions";

const initialState: FeedbackState = {
  status: "idle"
};

const OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "confusing", label: "Confusing" },
  { value: "suggestion", label: "Suggestion" },
  { value: "positive", label: "Positive feedback" }
] as const;

export function FeedbackForm({
  pagePath,
  callSessionId,
  familyCircleId
}: {
  pagePath?: string | null;
  callSessionId?: string | null;
  familyCircleId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(savePilotFeedbackAction, initialState);

  return (
    <form action={formAction} className="stack-md">
      <input name="pagePath" type="hidden" value={pagePath ?? ""} />
      <input name="callSessionId" type="hidden" value={callSessionId ?? ""} />
      <input name="familyCircleId" type="hidden" value={familyCircleId ?? ""} />

      <label className="field">
        <span>What kind of note is this?</span>
        <select defaultValue="suggestion" name="category">
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>What happened?</span>
        <textarea
          defaultValue=""
          name="message"
          placeholder="What felt helpful, confusing, or harder than it should have been?"
          rows={5}
        />
      </label>

      {state.message ? (
        <p className={`form-message ${state.status === "success" ? "form-success" : ""}`}>
          {state.message}
        </p>
      ) : null}

      <button className="button button-secondary" disabled={pending} type="submit">
        {pending ? "Sending feedback..." : "Send feedback"}
      </button>
    </form>
  );
}
