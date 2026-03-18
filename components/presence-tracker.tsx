"use client";

import { useEffect } from "react";

import { updatePresenceAction } from "@/app/actions";

/** Silently stamps last_seen_at when the user visits any page. */
export function PresenceTracker() {
  useEffect(() => {
    updatePresenceAction().catch(() => {});
  }, []);
  return null;
}
