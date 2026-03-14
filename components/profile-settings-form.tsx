"use client";

import { useActionState } from "react";

import { saveProfileSettingsAction, type ProfileSettingsState } from "@/app/actions";

const initialState: ProfileSettingsState = {
  status: "idle"
};

export function ProfileSettingsForm({
  fullName,
  email,
  timezone,
  quietHoursStart,
  quietHoursEnd
}: {
  fullName: string;
  email: string | null;
  timezone: string;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveProfileSettingsAction,
    initialState
  );

  return (
    <form action={formAction} className="stack-md">
      <div className="field-grid two-col">
        <label className="field">
          <span>Full name</span>
          <input defaultValue={fullName} name="fullName" placeholder="Jordan Carter" />
        </label>
        <label className="field">
          <span>Email</span>
          <input defaultValue={email ?? ""} disabled readOnly />
        </label>
      </div>

      <p className="microcopy">
        Kynfowk uses this timezone for displayed call times, reminder windows, and daylight
        saving time shifts automatically.
      </p>

      <div className="field-grid two-col">
        <label className="field">
          <span>Timezone</span>
          <input defaultValue={timezone} name="timezone" placeholder="America/Chicago" />
        </label>
        <label className="field">
          <span>Quiet hours</span>
          <div className="field-grid two-col">
            <input
              defaultValue={quietHoursStart ?? ""}
              max={23}
              min={0}
              name="quietHoursStart"
              placeholder="Start hour"
              type="number"
            />
            <input
              defaultValue={quietHoursEnd ?? ""}
              max={23}
              min={0}
              name="quietHoursEnd"
              placeholder="End hour"
              type="number"
            />
          </div>
        </label>
      </div>

      {state.message ? (
        <p className={`form-message ${state.status === "success" ? "form-success" : ""}`}>
          {state.message}
        </p>
      ) : null}

      <button className="button button-secondary" disabled={pending} type="submit">
        {pending ? "Saving profile..." : "Save profile details"}
      </button>
    </form>
  );
}
