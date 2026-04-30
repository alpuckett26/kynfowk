"use client";

import { useActionState, useEffect, useState } from "react";

import { resetPasswordAction } from "@/app/actions";
import { Card } from "@/components/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const initial = { status: "idle" as const };

type SessionState = "loading" | "ready" | "error";

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initial);
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recovery flow lands here with #access_token=... in the URL fragment
  // (Supabase's generateLink({ type: 'recovery' }) uses implicit grant).
  // Lift the tokens out, install them as the active Supabase session,
  // then show the form.
  useEffect(() => {
    let mounted = true;

    async function install() {
      const supabase = createSupabaseBrowserClient();

      // If we already have a session (page refresh, came in via a
      // different path), just show the form.
      const existing = await supabase.auth.getSession();
      if (existing.data.session) {
        if (mounted) setSessionState("ready");
        return;
      }

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) {
        if (mounted) {
          setErrorMessage(
            "Your reset link didn't include the right credentials. Try requesting a new one."
          );
          setSessionState("error");
        }
        return;
      }

      const result = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (result.error) {
        if (mounted) {
          setErrorMessage(result.error.message);
          setSessionState("error");
        }
        return;
      }

      // Strip the fragment so the page is shareable + a back-nav doesn't
      // leak tokens.
      window.history.replaceState(null, "", window.location.pathname);
      if (mounted) setSessionState("ready");
    }

    install().catch((e) => {
      if (mounted) {
        setErrorMessage(e instanceof Error ? e.message : "Couldn't open reset session.");
        setSessionState("error");
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="page-shell">
      <div className="container form-shell">
        <Card>
          <div className="stack-md">
            <span className="eyebrow">Account recovery</span>
            <h1>Set a new password.</h1>

            {sessionState === "loading" ? (
              <p className="lede">Opening your reset session…</p>
            ) : sessionState === "error" ? (
              <>
                <p className="lede">{errorMessage}</p>
                <a className="button button-secondary" href="/auth/forgot-password">
                  Send a new reset link
                </a>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
