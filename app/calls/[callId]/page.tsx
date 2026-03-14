import type { Route } from "next";
import Link from "next/link";

import { markCallReminderSentAction } from "@/app/actions";
import { Card } from "@/components/card";
import { CallLinkForm } from "@/components/call-link-form";
import { CompleteCallForm } from "@/components/complete-call-form";
import { EmptyState } from "@/components/empty-state";
import { MissedCallRecoveryActions } from "@/components/missed-call-recovery-actions";
import { PostCallSummaryForm } from "@/components/post-call-summary-form";
import { StatusBanner } from "@/components/status-banner";
import { getCallDetailData, requireViewer } from "@/lib/data";
import { formatDateTimeRange, formatDateTimeInputValue } from "@/lib/utils";

export default async function CallDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ callId: string }>;
  searchParams?: Promise<{ status?: string }>;
}) {
  const { callId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await requireViewer();
  const data = await getCallDetailData(user.id, callId);
  const attendeeCount = data.participants.filter((participant) => participant.attended === true).length;
  const isManageableCall = data.call.status === "scheduled" || data.call.status === "live";
  const isCompletedCall = data.call.status === "completed";

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <StatusBanner code={resolvedSearchParams?.status} />

        <section className="dashboard-hero">
          <div className="stack-md">
            <span className="eyebrow">{data.circle.name}</span>
            <h1>{data.call.title}</h1>
            <p className="lede">
              {isManageableCall
                ? "Everything your family needs for this upcoming moment lives here: the time, the join link, and the final step to close the loop."
                : isCompletedCall
                  ? "This page holds the shared details from a family call that already happened, from who joined to what mattered most."
                  : "This page keeps the record of a family call that is no longer active, along with the details your circle planned around."}
            </p>
          </div>

          <Card className="hero-summary-card">
            <p className="stat-label">Call snapshot</p>
            <p className="highlight-value">
              {isManageableCall
                ? data.call.actual_started_at
                  ? "Active now"
                  : "Scheduled"
                : isCompletedCall
                  ? "Completed"
                  : "Canceled"}
            </p>
            <p className="meta">
              {formatDateTimeRange(
                data.call.scheduled_start,
                data.call.scheduled_end,
                data.viewerTimezone
              )}{" "}
              • {data.viewerTimezoneLabel}
            </p>
            <div className="pill-row compact-pills">
              <Link className="button button-secondary" href={"/dashboard" as Route}>
                Back to dashboard
              </Link>
              {(data.call.status === "scheduled" || data.call.status === "live") ? (
                <Link
                  className="button button-secondary"
                  href={`/calls/${data.call.id}/calendar` as Route}
                >
                  Add to calendar
                </Link>
              ) : null}
              {data.call.meeting_url ? (
                <Link
                  className="button"
                  href={`/calls/${data.call.id}/join` as Route}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Join call
                </Link>
              ) : null}
            </div>
          </Card>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-main">
            <Card>
              <div className="stack-md">
                <h2>Call details</h2>
                <div className="list">
                  <div className="list-item">
                    <div>
                      <p>Status</p>
                      <p className="meta">
                        {data.call.status === "scheduled" || data.call.status === "live"
                          ? data.call.actual_started_at
                            ? "Call active"
                            : "Scheduled"
                          : data.call.status === "canceled"
                            ? "Canceled"
                            : "Completed"}
                      </p>
                    </div>
                  </div>
                  <div className="list-item">
                    <div>
                      <p>Join space</p>
                      <p className="meta">
                        {data.call.meeting_url
                          ? `${data.call.meeting_provider ?? "Join link"} is ready`
                          : "No join link has been added yet"}
                      </p>
                    </div>
                  </div>
                  <div className="list-item">
                    <div>
                      <p>Reminder</p>
                      <p className="meta">{data.call.reminder_label}</p>
                    </div>
                  </div>
                  {isCompletedCall ? (
                    <div className="list-item">
                      <div>
                        <p>Time Together</p>
                        <p className="meta">
                          {data.call.actual_duration_minutes ?? 0} minutes with {attendeeCount} family
                          member{attendeeCount === 1 ? "" : "s"} present
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <h2>Family members for this call</h2>
                <div className="list">
                  {data.participants.length ? (
                    data.participants.map((participant) => (
                      <div className="list-item" key={participant.membershipId}>
                        <div>
                          <p>{participant.displayName}</p>
                          <p className="meta">
                            {isCompletedCall
                              ? participant.attended
                                ? "Joined this call"
                                : "Scheduled, but missed it"
                              : "Scheduled to join"}
                          </p>
                        </div>
                        <span className="badge">
                          {isCompletedCall
                            ? participant.attended
                              ? "Present"
                              : "Absent"
                            : "Invited"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No family members attached"
                      description="Once a call is scheduled from overlap, the Family Circle members who can make it appear here."
                    />
                  )}
                </div>
              </div>
            </Card>

            {data.call.needs_join_link_prompt ? (
              <Card className="soft-callout warning-callout">
                <div className="stack-sm">
                  <h2>Join link still missing</h2>
                  <p className="meta">
                    This family moment is coming up soon. Add a join link so nobody is left
                    wondering where to meet.
                  </p>
                </div>
              </Card>
            ) : null}

            {data.call.show_recovery_prompt ? (
              <Card className="soft-callout warning-callout">
                <div className="stack-sm">
                  <h2>Did this call happen?</h2>
                  <p className="meta">
                    If your circle already connected, mark it complete here so the recap and
                    Family Connections counters stay current.
                  </p>
                  <MissedCallRecoveryActions
                    callId={data.call.id}
                    familyCircleId={data.circle.id}
                    returnPath={`/calls/${data.call.id}`}
                    suggestedStart={data.call.suggested_reschedule_start}
                    suggestedEnd={data.call.suggested_reschedule_end}
                    showCompleteLink={false}
                  />
                </div>
              </Card>
            ) : null}
          </div>

          <div className="dashboard-main">
            {isManageableCall ? (
              <>
                <Card>
                  <div className="stack-md">
                <h2>Manage this scheduled call</h2>
                    <p className="meta">
                      Times below use {data.viewerTimezoneLabel}. Daylight saving time shifts
                      follow that timezone automatically, and reminder timing will be recalculated
                      when you save.
                    </p>
                    <CallLinkForm
                      callId={data.call.id}
                      familyCircleId={data.circle.id}
                      includeRescheduleFields={data.call.can_reschedule}
                      meetingProvider={data.call.meeting_provider}
                      meetingUrl={data.call.meeting_url}
                      scheduledEndLocal={formatDateTimeInputValue(
                        data.call.scheduled_end,
                        data.viewerTimezone
                      )}
                      scheduledStartLocal={formatDateTimeInputValue(
                        data.call.scheduled_start,
                        data.viewerTimezone
                      )}
                      title={data.call.title}
                      submitLabel="Save call details"
                      viewerTimezone={data.viewerTimezone}
                    />
                  </div>
                </Card>

                <Card>
                  <div className="stack-md">
                    <h2>Reminder readiness</h2>
                    <p className="meta">
                      {data.call.reminder_status === "sent"
                        ? "A gentle nudge has already been marked as sent for this family call."
                        : "Kynfowk is ready to track reminders here even before full delivery is wired up."}
                    </p>

                    {data.call.reminder_status === "pending" ? (
                      <form action={markCallReminderSentAction} className="stack-sm">
                        <input name="callId" type="hidden" value={data.call.id} />
                        <input name="familyCircleId" type="hidden" value={data.circle.id} />
                        <input
                          name="returnPath"
                          type="hidden"
                          value={`/calls/${data.call.id}`}
                        />
                        <button className="button button-secondary" type="submit">
                          Mark reminder sent
                        </button>
                      </form>
                    ) : (
                      <p className="meta">{data.call.reminder_label}</p>
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="stack-md">
                    <h2>Pilot support</h2>
                    <p className="meta">
                      If anything about this call felt confusing, the pilot team can review a
                      short note with this call already attached.
                    </p>
                    <div className="call-actions">
                      <Link
                        className="button button-secondary"
                        href={`/feedback?page=%2Fcalls%2F${data.call.id}&callId=${data.call.id}` as Route}
                      >
                        Share feedback
                      </Link>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="stack-md">
                    <h2>Complete this call</h2>
                    <CompleteCallForm
                      callId={data.call.id}
                      familyCircleId={data.circle.id}
                      participants={data.participants.map((participant) => ({
                        membershipId: participant.membershipId,
                        displayName: participant.displayName,
                        attended: participant.attended ?? true
                      }))}
                    />
                  </div>
                </Card>
              </>
            ) : isCompletedCall ? (
              <>
                <Card>
                  <div className="stack-md">
                    <h2>Attendance summary</h2>
                    {attendeeCount ? (
                      <p className="meta">
                        This week, your circle made time for each other. {attendeeCount} family
                        member{attendeeCount === 1 ? "" : "s"} joined and {data.call.actual_duration_minutes ?? 0}{" "}
                        minutes were shared.
                      </p>
                    ) : (
                      <EmptyState
                        title="No attendance was marked"
                        description="If this call was completed outside the normal flow, attendance may still need to be reflected in the next update."
                      />
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="stack-md">
                    <h2>Post-call recap</h2>
                    {data.recap ? (
                      <PostCallSummaryForm familyCircleId={data.circle.id} recap={data.recap} />
                    ) : (
                      <EmptyState
                        title="No recap yet"
                        description="Capture the highlight and next step so this family moment stays easy to revisit."
                      />
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card>
                <div className="stack-md">
                  <h2>This call is no longer active</h2>
                  <p className="meta">
                    No reminder is needed here anymore. You can still review the scheduled
                    details and keep the Family Circle moving with the next call.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
