"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AuthState } from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface AuthFormProps {
  action: (
    state: AuthState,
    formData: FormData
  ) => Promise<AuthState>;
  mode: "sign-in" | "sign-up";
  defaultEmail?: string;
}

const initialState: AuthState = {
  status: "idle"
};

const SITE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL ?? "https://kynfowk.vercel.app";

async function signInWithProvider(provider: "google" | "apple" | "facebook") {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${SITE_URL}/auth/callback`
    }
  });
}

export function AuthForm({ action, mode, defaultEmail }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.status === "success") {
    return (
      <div className="stack-md">
        <div className="auth-email-sent">
          <p className="auth-email-sent-icon">📬</p>
          <p className="auth-email-sent-body">{state.message}</p>
          <p className="microcopy">
            Already confirmed?{" "}
            <Link href="/auth/sign-in">Sign in here</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-md">
      <div className="oauth-buttons">
        <button
          className="button button-secondary oauth-button"
          type="button"
          onClick={() => signInWithProvider("google")}
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <button
          className="button button-secondary oauth-button"
          type="button"
          onClick={() => signInWithProvider("apple")}
        >
          <AppleIcon />
          Continue with Apple
        </button>
        <button
          className="button button-secondary oauth-button"
          type="button"
          onClick={() => signInWithProvider("facebook")}
        >
          <FacebookIcon />
          Continue with Facebook
        </button>
      </div>

      <div className="auth-divider">
        <span>or continue with email</span>
      </div>

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
            <input
                defaultValue={defaultEmail}
                name="email"
                placeholder="jordan@example.com"
                readOnly={!!defaultEmail}
                required
                type="email"
              />
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

        {mode === "sign-in" && (
          <p className="microcopy">
            <Link href="/auth/forgot-password">Forgot your password?</Link>
          </p>
        )}
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden height="18" viewBox="0 0 814 1000" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 411.3 0 282.5 0 159.3c0-145.4 95.1-222.2 188.5-222.2 71.3 0 131.3 47.2 176.2 47.2 43.1 0 110.9-50.3 193.2-50.3 31 0 111.1 3.2 174.3 78.2zm-255.4-158.5c31.3-35.9 53.8-85.7 53.8-135.5 0-6.9-.6-13.9-1.9-19.5-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 82.2-55.1 132.7 0 7.6 1.3 15.1 1.9 17.4 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 134.8-72.2z" fill="currentColor"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden height="18" viewBox="0 0 320 512" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" fill="#1877F2"/>
    </svg>
  );
}
