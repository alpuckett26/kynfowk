"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * M43 — Caller-side "Ring now" button on web.
 *
 * Hits the same /api/native/calls/ring endpoint M42 built for native.
 * The endpoint is bearer-token gated, so we lift the access_token from
 * the active Supabase session in the browser. On success we navigate
 * to the live call page so the caller is already in the WebRTC room
 * by the time the recipient picks up.
 */
export function RingMemberButton({
  membershipId,
  displayName,
}: {
  membershipId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ring() {
    setPending(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Sign in to call.");
        return;
      }
      const res = await fetch("/api/native/calls/ring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          participantMembershipIds: [membershipId],
          title: `Ringing ${displayName}`,
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { callId?: string; error?: string }
        | null;
      if (!res.ok || !body?.callId) {
        setError(body?.error ?? "Couldn't ring.");
        return;
      }
      // Hard-nav to the live call page — caller is in the room while
      // the recipient's phone is ringing.
      router.push(`/calls/${body.callId}/live`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't ring.");
    } finally {
      setPending(false);
    }
  }

  const firstName = displayName.trim().split(/\s+/)[0] ?? displayName;

  return (
    <span className="ring-button-shell">
      <button
        type="button"
        className="button button-secondary"
        disabled={pending}
        onClick={ring}
      >
        {pending ? "Ringing…" : `Call ${firstName}`}
      </button>
      {error ? <span className="form-message">{error}</span> : null}
    </span>
  );
}
