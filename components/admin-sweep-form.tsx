"use client";

import { useActionState } from "react";

import { triggerNotificationSweepAction, type AdminOpsState } from "@/app/actions";

const initialState: AdminOpsState = {
  status: "idle"
};

export function AdminSweepForm() {
  const [state, formAction, pending] = useActionState(
    triggerNotificationSweepAction,
    initialState
  );

  return (
    <form action={formAction} className="stack-sm">
      <button className="button button-secondary" disabled={pending} type="submit">
        {pending ? "Running sweep..." : "Run notification sweep now"}
      </button>
      {state.message ? (
        <p className={`form-message ${state.status === "success" ? "form-success" : ""}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
