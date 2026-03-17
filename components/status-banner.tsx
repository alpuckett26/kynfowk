const MESSAGES: Record<string, { title: string; body: string; tone: "success" | "warning" }> = {
  "call-scheduled": {
    title: "Call scheduled",
    body: "Your next Family Connections moment is protected on the calendar.",
    tone: "success"
  },
  "call-completed": {
    title: "Call completed",
    body: "Nice work. Your connections counter is updated, and the recap is ready while the call is still fresh.",
    tone: "success"
  },
  "call-canceled": {
    title: "Call canceled",
    body: "That call has been removed from your upcoming schedule. Schedule a new one any time.",
    tone: "warning"
  },
  "joined-circle": {
    title: "You joined your Family Circle",
    body: "Your invite was matched to this account, and your dashboard is ready.",
    tone: "success"
  },
  "schedule-error": {
    title: "Could not schedule that call",
    body: "Please try again. If it keeps happening, check your Supabase connection and RLS policies.",
    tone: "warning"
  },
  "schedule-stale": {
    title: "That family-ready window changed",
    body: "Please choose one of the current best times to connect and try again.",
    tone: "warning"
  },
  "schedule-forbidden": {
    title: "You cannot schedule for that circle",
    body: "Only active family members can create calls for their own Family Circle.",
    tone: "warning"
  },
  "join-link-missing": {
    title: "No join link yet",
    body: "Add a meeting link to the scheduled call first so everyone has a place to gather.",
    tone: "warning"
  },
  "completion-error": {
    title: "Could not mark the call complete",
    body: "Please try again. The dashboard will refresh once the update succeeds.",
    tone: "warning"
  },
  "schedule-missing": {
    title: "Missing call details",
    body: "That scheduling request was incomplete.",
    tone: "warning"
  },
  "completion-missing": {
    title: "Missing completion details",
    body: "That completion update was incomplete.",
    tone: "warning"
  },
  "reminder-sent": {
    title: "Reminder tracked",
    body: "Kynfowk marked that gentle nudge as sent, so this family moment stays on track.",
    tone: "success"
  },
  "reminder-error": {
    title: "Could not update the reminder",
    body: "Please try again. The call details will refresh once that reminder state is saved.",
    tone: "warning"
  },
  "recovery-rescheduled": {
    title: "Fresh time scheduled",
    body: "Kynfowk put a similar call back on the calendar so your circle has another chance to connect.",
    tone: "success"
  },
  "recovery-dismissed": {
    title: "Recovery prompt dismissed",
    body: "That missed-call nudge is tucked away for now. You can still revisit the call details any time.",
    tone: "success"
  },
  "recovery-error": {
    title: "Could not update that missed call",
    body: "Please try again. If the call is already resolved, refreshing the dashboard should show the latest state.",
    tone: "warning"
  },
  "notifications-read": {
    title: "Inbox caught up",
    body: "Those updates are marked read, and your Family Circle dashboard can stay focused on what is next.",
    tone: "success"
  },
  "family-member-saved": {
    title: "Family details updated",
    body: "That family member's details are current again.",
    tone: "success"
  },
  "family-invite-resent": {
    title: "Invite sent again",
    body: "A fresh Kynfowk invite is on its way to that family member.",
    tone: "success"
  },
  "family-member-removed": {
    title: "Member removed",
    body: "That person was removed from the Family Circle without disturbing existing call history.",
    tone: "success"
  },
  "family-member-remove-blocked": {
    title: "That member cannot be removed yet",
    body: "Kynfowk protects owners and anyone already tied to availability or call history from being removed outright.",
    tone: "warning"
  },
  "family-member-forbidden": {
    title: "You cannot manage this Family Circle",
    body: "Only the circle owner can change membership details in this MVP.",
    tone: "warning"
  },
  "family-member-error": {
    title: "Could not update that family member",
    body: "Please try again. If the problem persists, refresh the page and confirm the member still belongs to this circle.",
    tone: "warning"
  },
  "family-invite-error": {
    title: "Could not resend that invite",
    body: "Please try again after checking the pending member details, your email setup, and the Supabase invite configuration.",
    tone: "warning"
  },
  "family-invite-unavailable": {
    title: "Invite resend needs service-role setup",
    body: "Add the Supabase service role environment variables first so Kynfowk can send a fresh auth invite email.",
    tone: "warning"
  },
  "family-invite-already-claimed": {
    title: "That invite may already be claimed",
    body: "Kynfowk could not send a fresh invite because this email may already belong to an account. Ask them to sign in with the invited email instead.",
    tone: "warning"
  },
  "family-member-blocked": {
    title: "Member blocked",
    body: "That person has been blocked. They are excluded from calls, scheduling, and family activity until you unblock them.",
    tone: "success"
  },
  "family-member-unblocked": {
    title: "Member unblocked",
    body: "That person has been restored to invited status and can rejoin the Family Circle.",
    tone: "success"
  },
  "family-member-block-self": {
    title: "Cannot block that member",
    body: "The circle owner and your own account cannot be blocked.",
    tone: "warning"
  },
  "family-member-already-blocked": {
    title: "Already blocked",
    body: "That member is already on the blocked list.",
    tone: "warning"
  },
  "member-invited": {
    title: "Invite sent",
    body: "A Kynfowk invite is on its way. They will appear in your Family Circle once they accept.",
    tone: "success"
  }
};

export function StatusBanner({ code }: { code?: string }) {
  if (!code || !MESSAGES[code]) {
    return null;
  }

  const message = MESSAGES[code];

  return (
    <div className={`status-banner ${message.tone === "warning" ? "status-warning" : ""}`}>
      <strong>{message.title}</strong>
      <p>{message.body}</p>
    </div>
  );
}
