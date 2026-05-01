/**
 * push-notifications.ts
 * Shared types and a small routing helper used by PushNotificationHandler
 * and any server-side code that constructs notification payloads.
 */

// ---------------------------------------------------------------------------
// Notification types — include in every push payload as `data.type`
// ---------------------------------------------------------------------------

export type NotificationType =
  | "call_invite"          // someone scheduled a call with you
  | "call_starting_soon"   // a call you're in starts in N minutes
  | "missed_family_call"   // you were absent from a completed call
  | "circle_message"       // a message posted to your circle
  | "birthday_reminder"    // a family member's birthday is coming up
  | "care_checkin"         // periodic "how are you?" prompt
  | "memory_prompt"        // "share a memory with the family"
  | "incoming_call"        // M42 — spontaneous "ring now" — open ring screen
  | "call_declined"        // M42 — recipient declined a ring
  | "call_missed";         // M42 — ring went unanswered for 30s

// Every push notification payload should include these fields in `data`.
// Additional type-specific keys are allowed.
export interface PushData {
  type: NotificationType;
  /** kynfowk:// deep-link to open on tap, e.g. "kynfowk://calls/456" */
  deepLink?: string;
  [key: string]: string | undefined;
}

// ---------------------------------------------------------------------------
// Route a deep-link from a notification tap into the WebView
// ---------------------------------------------------------------------------

export function routeNotificationDeepLink(deepLink: string): void {
  if (!deepLink) return;
  // "kynfowk://calls/456" → "/calls/456"
  const path = "/" + deepLink.replace(/^kynfowk:\/\//, "");
  if (path && path !== "/") {
    window.location.assign(path);
  }
}
