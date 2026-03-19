"use client";

import { useActionState } from "react";

import { resetPasswordAction } from "@/app/actions";
import { Card } from "@/components/card";

const initial = { status: "idle" as const };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initial);

  return (
    <main className="page-shell">
      <div className="container form-shell">
        <Card>
          <div className="stack-md">
            <span className="eyebrow">Account recovery</span>
            <h1>Set a new password.</h1>
            <p className="lede">Choose something you&apos;ll remember.</p>

            <form className="stack-md" action={formAction}>
              <div className="field-grid">
                <label className="field">
                  <span>New password</span>
                  <input
                    minLength={8}
                    name="password"
                    placeholder="At least 8 characters"
                    required
                    type="password"
                  />
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <input
                    minLength={8}
                    name="confirm"
                    placeholder="Repeat your new password"
                    required
                    type="password"
                  />
                </label>
              </div>

              {state.status === "error" && (
                <p className="form-message">{state.message}</p>
              )}

              <button className="button" disabled={pending} type="submit">
                {pending ? "Saving…" : "Update password"}
              </button>
            </form>
          </div>
        </Card>
      </div>
    </main>
  );
}
