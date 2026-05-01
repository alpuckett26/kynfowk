"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Detects the URL fragment that Supabase's invite/magiclink flow appends
 * (e.g. #access_token=...&refresh_token=...&type=invite), installs it as
 * the active session, then bounces to /auth/callback?type=invite_claim
 * which claims the pending family_membership and redirects to the
 * dashboard.
 *
 * Without this, the action_link from generateLink({ type: 'invite' })
 * lands here with auth tokens in the fragment but the (server-rendered)
 * page can't see fragments. Visitors saw the "Accept invite & create
 * account" welcome page and re-signed up instead of claiming, ending
 * up with an orphan account.
 */
export function AcceptInviteFragmentHandler() {
  const [status, setStatus] = useState<"idle" | "claiming" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    setStatus("claiming");

    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const result = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (result.error) {
          setErrorMessage(result.error.message);
          setStatus("error");
          return;
        }
        // Strip the fragment so a back-nav doesn't leak tokens, then
        // hard-redirect to the callback. Hard nav (replace) ensures the
        // server route sees the freshly written auth cookies.
        window.location.replace("/auth/callback?type=invite_claim");
      } catch (e) {
        setErrorMessage(
          e instanceof Error ? e.message : "Couldn't open your invite session."
        );
        setStatus("error");
      }
    })();
  }, []);

  if (status === "idle") return null;

  return (
    <div className="invite-fragment-status" role="status" aria-live="polite">
      {status === "claiming" ? (
        <p>Connecting you to your Family Circle…</p>
      ) : (
        <p className="form-message">
          {errorMessage ?? "Couldn't open your invite session."} You can sign
          in instead and the invite will still attach.
        </p>
      )}
    </div>
  );
}
