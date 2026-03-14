"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AuthState } from "@/app/actions";

interface AuthFormProps {
  action: (
    state: AuthState,
    formData: FormData
  ) => Promise<AuthState>;
  mode: "sign-in" | "sign-up";
}

const initialState: AuthState = {
  status: "idle"
};

export function AuthForm({ action, mode }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form className="stack-md" action={formAction}>
      <div className="field-grid">
        {mode === "sign-up" ? (
          <label className="field">
            <span>Full name</span>
            <input name="fullName" placeholder="Jordan Ellis" required />
          </label>
        ) : null}

        <label className="field">
          <span>Email</span>
          <input name="email" placeholder="jordan@example.com" required type="email" />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            minLength={8}
            name="password"
            placeholder="At least 8 characters"
            required
            type="password"
          />
        </label>
      </div>

      {state.message ? <p className="form-message">{state.message}</p> : null}

      <button className="button" disabled={pending} type="submit">
        {pending
          ? "Saving..."
          : mode === "sign-up"
            ? "Create your Family Circle account"
            : "Open dashboard"}
      </button>

      <p className="microcopy">
        {mode === "sign-up" ? "Already have an account?" : "Need an account?"}{" "}
        <Link href={mode === "sign-up" ? "/auth/sign-in" : "/auth/sign-up"}>
          {mode === "sign-up" ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
