"use client";

import Link from "next/link";

import { Card } from "@/components/card";
import { MissedCallRecoveryActions } from "@/components/missed-call-recovery-actions";
import { RingMemberButton } from "@/components/ring-member-button";
import { formatDateTime } from "@/lib/utils";

export interface ConnectPanelMember {
  id: string;
  displayName: string;
  status: "active" | "invited";
}

export interface ConnectPanelUpcomingCall {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  show_recovery_prompt: boolean;
  suggested_reschedule_start: string | null;
  suggested_reschedule_end: string | null;
}

export interface ConnectPanelProps {
  firstName: string;
  circleName: string;
  circleId: string;
  readiness: {
    completionRate: number;
    activeMembers: number;
    invitedMembers: number;
  };
  stats: {
    completedCalls: number;
  };
  upcomingCalls: ConnectPanelUpcomingCall[];
  members: ConnectPanelMember[];
  timezone: string;
  /** Called when the user taps "Schedule a call" — should swipe to Plan. */
  onSchedule?: () => void;
}

export function ConnectPanel({
  firstName,
  circleName,
  circleId,
  readiness,
  stats,
  upcomingCalls,
  members,
  timezone,
  onSchedule,
}: ConnectPanelProps) {
  const ringableMembers = members
    .filter((m) => m.status === "active")
    .slice(0, 3);
  const nextCall = upcomingCalls[0] ?? null;
  const recoveryCall = upcomingCalls.find((c) => c.show_recovery_prompt) ?? null;

  return (
    <>
      <header className="connect-greeting">
        <span className="eyebrow">{circleName}</span>
        <h1>Hey {firstName} — what&apos;s next?</h1>
        <p className="meta">
          {readiness.completionRate}% ready · {upcomingCalls.length} upcoming · {stats.completedCalls} done
        </p>
      </header>

      <Card>
        <div className="stack-md">
          <h2>Ring now</h2>
          {ringableMembers.length ? (
            <div className="action-bar">
              {ringableMembers.map((m) => (
                <RingMemberButton
                  key={m.id}
                  membershipId={m.id}
                  displayName={m.displayName}
                />
              ))}
            </div>
          ) : (
            <p className="meta">
              Add active family members and you&apos;ll be able to ring them from here.
            </p>
          )}
          {members.filter((m) => m.status === "active").length > 3 ? (
            <p className="meta">
              <a href="#family" onClick={(e) => { e.preventDefault(); document.getElementById("family")?.scrollIntoView({ behavior: "smooth", inline: "start" }); }}>
                See everyone in Family →
              </a>
            </p>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="stack-md">
          <h2>Schedule</h2>
          {nextCall ? (
            <div className="next-call-pill">
              <span>Next:</span>
              <strong>{nextCall.title}</strong>
              <span className="pill-meta">
                {formatDateTime(nextCall.scheduled_start, timezone)}
              </span>
              <Link className="button button-primary" href={`/calls/${nextCall.id}/live`}>
                Join
              </Link>
            </div>
          ) : (
            <p className="meta">No call on the books yet.</p>
          )}
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              if (onSchedule) onSchedule();
              else document.getElementById("plan")?.scrollIntoView({ behavior: "smooth", inline: "start" });
            }}
          >
            Find a time to schedule
          </button>
        </div>
      </Card>

      {recoveryCall ? (
        <Card>
          <div className="stack-md">
            <h2>Did this call happen?</h2>
            <p className="meta">{recoveryCall.title}</p>
            <MissedCallRecoveryActions
              callId={recoveryCall.id}
              familyCircleId={circleId}
              returnPath="/dashboard#connect"
              suggestedStart={recoveryCall.suggested_reschedule_start}
              suggestedEnd={recoveryCall.suggested_reschedule_end}
            />
          </div>
        </Card>
      ) : null}
    </>
  );
}
