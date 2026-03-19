"use client";

import { useActionState } from "react";

import { forgotPasswordAction } from "@/app/actions";
import { Card } from "@/components/card";

const initial = { status: "idle" as const };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initial);

  return (
    <main className="page-shell">
      <div className="container form-shell">
        <Card>
          <div className="stack-md">
            <span className="eyebrow">Account recovery</span>
            <h1>Reset your password.</h1>
            <p className="lede">
              Enter the email you signed up with and we&apos;ll send a reset link.
            </p>

            {state.status === "success" ? (
              <div className="stack-md">
                <p className="form-message form-message-success">{state.message}</p>
                <p className="microcopy">
                  <a href="/auth/sign-in">Back to sign in</a>
                </p>
              </div>
            ) : (
              <form className="stack-md" action={formAction}>
                <label className="field">
                  <span>Email</span>
                  <input name="email" placeholder="jordan@example.com" required type="email" />
                </label>

                {state.status === "error" && (
                  <p className="form-message">{state.message}</p>
                )}

                <button className="button" disabled={pending} type="submit">
                  {pending ? "Sending…" : "Send reset link"}
                </button>

                <p className="microcopy">
                  <a href="/auth/sign-in">Back to sign in</a>
                </p>
              </form>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
