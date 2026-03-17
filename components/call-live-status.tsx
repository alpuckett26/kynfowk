"use client";

/**
 * CallLiveStatus — shown on the call detail page when a call is "live".
 * Subscribes to the Supabase Presence channel for the call and shows
 * who is currently in the room in real time, plus a "Pop in" button.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface Participant {
  membershipId: string;
  displayName: string;
}

interface CallLiveStatusProps {
  callId: string;
  /** The current viewer's membership id — used to avoid showing "Pop in"
   *  when they are already in the room. */
  viewerMembershipId: string;
}

export function CallLiveStatus({ callId, viewerMembershipId }: CallLiveStatusProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`call:${callId}`, {
      config: { presence: { key: "observer" } }
    });

    function syncPresence() {
      const state = channel.presenceState<{ membership_id: string; display_name: string }>();
      const list: Participant[] = [];
      for (const key of Object.keys(state)) {
        for (const p of state[key]) {
          // Skip our own observer key and entries without a membership_id
          if (!p.membership_id || p.membership_id === "observer") continue;
          if (!list.find((x) => x.membershipId === p.membership_id)) {
            list.push({ membershipId: p.membership_id, displayName: p.display_name ?? "Family member" });
          }
        }
      }
      setParticipants(list);
    }

    channel.on("presence", { event: "sync" }, syncPresence);
    channel.on("presence", { event: "join" }, syncPresence);
    channel.on("presence", { event: "leave" }, syncPresence);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        syncPresence();
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [callId]);

  const viewerIsInRoom = participants.some((p) => p.membershipId === viewerMembershipId);

  return (
    <div className="call-live-status">
      <div className="call-live-status-header">
        <span className="call-live-dot" aria-hidden />
        <span className="call-live-label">
          {connected
            ? participants.length > 0
              ? `${participants.length} in the room now`
              : "Room is empty"
            : "Checking room…"}
        </span>
      </div>

      {participants.length > 0 && (
        <div className="call-live-avatars">
          {participants.map((p) => (
            <div key={p.membershipId} className="call-live-avatar" title={p.displayName}>
              <span>{p.displayName.charAt(0).toUpperCase()}</span>
            </div>
          ))}
          <div className="call-live-names">
            {participants.map((p, i) => (
              <span key={p.membershipId}>
                {p.displayName}
                {i < participants.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {!viewerIsInRoom && (
        <Link
          className="button call-live-popin-button"
          href={`/calls/${callId}/live` as Route}
        >
          {participants.length > 0 ? "Pop in" : "Start the call"}
        </Link>
      )}

      {viewerIsInRoom && (
        <Link
          className="button button-secondary call-live-popin-button"
          href={`/calls/${callId}/live` as Route}
        >
          Rejoin call
        </Link>
      )}
    </div>
  );
}
