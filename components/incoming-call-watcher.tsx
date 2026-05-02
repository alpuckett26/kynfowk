"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * M43 — Web recipient-side incoming-call listener.
 *
 * Mounted globally (in app/layout.tsx) so any signed-in page can
 * receive a ring. Subscribes via Supabase Realtime to INSERTs on
 * call_sessions in any circle the viewer belongs to, filters to
 * is_ring = true rows where the viewer is a participant, and pops a
 * full-screen modal with a synthesized ringtone (Web Audio API — no
 * audio asset needed).
 *
 * V1 limitations (web):
 *   - Tab must be open + interactive for the modal to appear. Web
 *     Push for closed-tab scenarios is a separate effort.
 *   - Audio autoplay needs prior user interaction with the page;
 *     modern browsers allow it once the user has clicked anywhere.
 *   - Recipient-side close-tab-mid-ring → no follow-up; the
 *     caller-side timeout still cleans up the call_session.
 */

interface IncomingCall {
  callId: string;
  callerName: string;
  circleName: string;
  familyCircleId: string;
}

export function IncomingCallWatcher() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [call, setCall] = useState<IncomingCall | null>(null);
  const [busy, setBusy] = useState<"none" | "answering" | "declining">("none");

  // Audio nodes — kept in refs so we can stop the ring on
  // accept/decline/timeout.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRing = useCallback(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
      } catch {
        /* already stopped */
      }
      oscRef.current.disconnect();
      oscRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  const startRing = useCallback(() => {
    try {
      // Browsers require autoplay gesture or muted audio; AudioContext
      // works after any user interaction (which the user almost
      // certainly had to sign in). If suspended, resume on first ring.
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 480; // classic phone-ring tone B
      osc.connect(gain);
      osc.start();
      oscRef.current = osc;

      // Ring pattern: 1.0s on / 1.6s off, repeating for up to 30s.
      const pulse = () => {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
        gain.gain.setValueAtTime(0.18, now + 0.95);
        gain.gain.linearRampToValueAtTime(0, now + 1.0);
      };
      pulse();
      ringIntervalRef.current = setInterval(pulse, 2600);
    } catch {
      // Audio failed (suspended context, no user gesture, etc.) —
      // fall back to silent modal. Better than nothing.
    }
  }, []);

  // Auth bootstrap.
  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(Boolean(data.user));
      setViewerId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setSignedIn(Boolean(session?.user));
      setViewerId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Realtime subscription. Listens for new is_ring call_sessions, then
  // checks via REST whether the viewer is a participant — Realtime
  // can't filter on the cross-table join, so we do it client-side.
  useEffect(() => {
    if (!signedIn || !viewerId) return;
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("incoming-call-watcher")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
          filter: "is_ring=eq.true",
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            family_circle_id: string;
            title: string | null;
            created_by: string;
          };
          if (row.created_by === viewerId) return; // I initiated this ring

          // Race window: the ring API route inserts call_sessions and
          // call_participants in two separate transactions. The Realtime
          // INSERT for call_sessions can land before the participants
          // have committed, so verify-then-bail returns false on the
          // first read. Retry up to ~1s before giving up.
          type ParticipantRow = {
            membership_id: string;
            family_memberships:
              | { user_id: string | null; display_name: string }[]
              | { user_id: string | null; display_name: string }
              | null;
          };
          let parts: ParticipantRow[] = [];
          for (let attempt = 0; attempt < 6; attempt++) {
            const partsResp = await supabase
              .from("call_participants")
              .select(
                "membership_id, family_memberships(user_id, display_name)"
              )
              .eq("call_session_id", row.id);
            parts = (partsResp.data ?? []) as ParticipantRow[];
            if (parts.length > 0) break;
            await new Promise((r) => setTimeout(r, 200));
          }

          const amParticipant = parts.some((p) => {
            const fm = p.family_memberships;
            const uid = Array.isArray(fm) ? fm[0]?.user_id : fm?.user_id;
            return uid === viewerId;
          });
          if (!amParticipant) return;

          // Caller is the membership whose user_id === created_by.
          const callerEntry = parts.find((p) => {
            const fm = p.family_memberships;
            const uid = Array.isArray(fm) ? fm[0]?.user_id : fm?.user_id;
            return uid === row.created_by;
          });
          const callerFm = callerEntry?.family_memberships;
          const callerName =
            (Array.isArray(callerFm)
              ? callerFm[0]?.display_name
              : callerFm?.display_name) ?? "A family member";

          const circleResp = await supabase
            .from("family_circles")
            .select("name")
            .eq("id", row.family_circle_id)
            .maybeSingle();
          const circleName =
            (circleResp.data as { name: string } | null)?.name ?? "";

          setCall({
            callId: row.id,
            callerName,
            circleName,
            familyCircleId: row.family_circle_id,
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [signedIn, viewerId]);

  // When a call shows, start ringing + auto-dismiss after 30s.
  useEffect(() => {
    if (!call) return;
    startRing();
    dismissTimeoutRef.current = setTimeout(() => {
      stopRing();
      setCall(null);
    }, 30_000);
    return () => stopRing();
  }, [call, startRing, stopRing]);

  const accept = useCallback(async () => {
    if (!call || busy !== "none") return;
    setBusy("answering");
    stopRing();
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch(`/api/native/calls/${call.callId}/answer`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.assign(`/calls/${call.callId}/live`);
    } finally {
      setBusy("none");
    }
  }, [call, busy, stopRing]);

  const decline = useCallback(async () => {
    if (!call || busy !== "none") return;
    setBusy("declining");
    stopRing();
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch(`/api/native/calls/${call.callId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      setBusy("none");
      setCall(null);
    }
  }, [call, busy, stopRing]);

  if (!call) return null;

  return (
    <div className="incoming-call-overlay" role="dialog" aria-modal="true">
      <div className="incoming-call-card">
        <p className="incoming-call-eyebrow">Incoming call</p>
        <p className="incoming-call-name">{call.callerName}</p>
        {call.circleName ? (
          <p className="incoming-call-circle">{call.circleName}</p>
        ) : null}
        <p className="incoming-call-hint">is calling you on Kynfowk…</p>
        <div className="incoming-call-actions">
          <button
            type="button"
            className="incoming-call-decline"
            onClick={decline}
            disabled={busy !== "none"}
            aria-label="Decline"
          >
            ✕
          </button>
          <button
            type="button"
            className="incoming-call-accept"
            onClick={accept}
            disabled={busy !== "none"}
            aria-label="Accept"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}
