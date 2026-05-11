/**
 * Shared dedupe state for incoming-call routing.
 *
 * Both `useIncomingCallWatcher` (foreground Realtime) and `usePushRouting`
 * (notification taps + foreground receive) can route to /calls/<id>/ring
 * for the same call. Without a shared seen-set the user can land on two
 * stacked ring screens for one incoming call.
 *
 * Module scope is deliberate: a process-lifetime cache, not per-component.
 * Call `clearSeenRings()` on sign-out so a new user doesn't inherit the
 * previous session's IDs.
 */

const seen = new Set<string>();

export function hasSeenRing(callId: string): boolean {
  return seen.has(callId);
}

export function markRingSeen(callId: string): void {
  seen.add(callId);
}

export function clearSeenRings(): void {
  seen.clear();
}
