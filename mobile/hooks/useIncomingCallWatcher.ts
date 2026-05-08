import { useEffect, useRef } from "react";
import { router } from "expo-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * M100 — Mobile foreground listener for incoming "ring now" calls.
 *
 * Mirrors components/incoming-call-watcher.tsx on the web. Subscribes
 * via Supabase Realtime to INSERTs on call_sessions where is_ring=true,
 * confirms the viewer is a participant, then navigates to the existing
 * ring screen. Required because:
 *   - Push (M99) covers background/locked-screen delivery
 *   - This covers the foreground case where two devices are actively
 *     testing a call together — push banners can be slow / suppressed
 *     when the app is open
 *
 * V1 limitations:
 *   - Only fires while the app is in foreground (Realtime drops the
 *     websocket on background). Background relies on M99 push.
 *   - The 8-attempt retry mirrors the web watcher's race-window fix —
 *     ring/route.ts inserts call_sessions and call_participants in
 *     separate statements and the postgres_changes INSERT can land
 *     before participants are queryable.
 */
export function useIncomingCallWatcher() {
  const seenCallIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    let viewerId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const teardown = () => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };

    const setup = (session: Session | null) => {
      if (!active) return;
      teardown();

      const nextViewerId = session?.user?.id ?? null;
      viewerId = nextViewerId;
      if (!nextViewerId) return;

      type ParticipantRow = {
        membership_id: string;
        family_memberships:
          | { user_id: string | null; display_name: string }[]
          | { user_id: string | null; display_name: string }
          | null;
      };

      channel = supabase
        .channel("mobile-incoming-call-watcher")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "call_sessions",
            filter: "is_ring=eq.true",
          },
          async (payload) => {
            if (!active) return;
            const row = payload.new as {
              id: string;
              family_circle_id: string;
              created_by: string;
            };

            if (!viewerId || row.created_by === viewerId) return;
            if (seenCallIdsRef.current.has(row.id)) return;

            let parts: ParticipantRow[] = [];
            for (let attempt = 0; attempt < 8; attempt++) {
              const partsResp = await supabase
                .from("call_participants")
                .select(
                  "membership_id, family_memberships(user_id, display_name)",
                )
                .eq("call_session_id", row.id);
              parts = (partsResp.data ?? []) as ParticipantRow[];
              if (parts.length > 0) break;
              await new Promise((r) => setTimeout(r, 200));
            }

            if (!active) return;

            const amParticipant = parts.some((p) => {
              const fm = p.family_memberships;
              const uid = Array.isArray(fm) ? fm[0]?.user_id : fm?.user_id;
              return uid === viewerId;
            });
            if (!amParticipant) return;

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

            seenCallIdsRef.current.add(row.id);

            const params = new URLSearchParams();
            if (callerName) params.set("callerName", callerName);
            if (circleName) params.set("circleName", circleName);
            const qs = params.toString() ? `?${params.toString()}` : "";
            router.push(`/calls/${row.id}/ring${qs}`);
          },
        )
        .subscribe();
    };

    void supabase.auth.getSession().then(({ data }) => setup(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => setup(session),
    );

    return () => {
      active = false;
      teardown();
      sub.subscription.unsubscribe();
    };
  }, []);
}
