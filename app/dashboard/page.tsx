import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { scheduleSuggestedCallAction } from "@/app/actions";
import { AICallSuggestion } from "@/components/ai-call-suggestion";
import { Card } from "@/components/card";
import { CallLinkForm } from "@/components/call-link-form";
import { DashboardHighlights } from "@/components/dashboard-highlights";
import { EmptyState } from "@/components/empty-state";
import { MissedCallRecoveryActions } from "@/components/missed-call-recovery-actions";
import { NotificationInbox } from "@/components/notification-inbox";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { PostCallSummaryForm } from "@/components/post-call-summary-form";
import { StatsGrid } from "@/components/stats-grid";
import { StatusBanner } from "@/components/status-banner";
import { getDashboardData, requireViewer } from "@/lib/data";
import { formatDateTime, formatDateTimeRange } from "@/lib/utils";

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string; recap?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const user = await requireViewer();
  const data = await getDashboardData(user.id);
  const timezone = data.viewerTimezone;

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <StatusBanner code={params?.status} />

        <section className="dashboard-hero">
          <div className="stack-md">
            <span className="eyebrow">{data.circle.name}</span>
            <h1>Keep your family rhythm in view.</h1>
            <p className="lede">
              {data.circle.description ??
                "Track upcoming calls, shared availability, and the Family Connections that are growing week by week."}
            </p>
          </div>

          <Card className="hero-summary-card">
            <p className="stat-label">Family Circle readiness</p>
            <p className="highlight-value">{data.readiness.completionRate}% ready</p>
            <p className="meta">
              {data.readiness.withAvailability} of {data.readiness.activeMembers} active members
              have availability shared. {data.readiness.invitedMembers} invited member
              {data.readiness.invitedMembers === 1 ? "" : "s"} are still pending.
            </p>
            <div className="pill-row compact-pills">
              <span className="pill">{data.upcomingCalls.length} upcoming calls</span>
              <span className="pill">{data.stats.completedCalls} completed calls</span>
            </div>
          </Card>
        </section>

        <StatsGrid stats={data.stats} />
        <DashboardHighlights highlights={data.highlights} />

        <section className="dashboard-grid">
          <div className="dashboard-main">
            <Card>
              <div className="stack-md">
                <div className="section-header-row">
                  <div>
                    <h2>Your availability</h2>
                    <p className="meta">
                      Keep your recurring windows current so Kynfowk can schedule around
                      real life.
                    </p>
                  </div>
                  <Link className="button button-secondary" href={"/availability" as Route}>
                    Manage availability
                  </Link>
                </div>

                {data.viewerAvailability.summary.length ? (
                  <div className="list">
                    {data.viewerAvailability.summary.map((item) => (
                      <div className="list-item" key={item.label}>
                        <div>
                          <p>{item.dayLabel}</p>
                          <p className="meta">{item.label.replace(`${item.dayLabel}: `, "")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Your weekly rhythm is still blank"
                    description="Add the windows you can usually keep so stronger overlap suggestions can start appearing."
                    action={
                      <Link
                        className="button button-secondary"
                        href={"/availability" as Route}
                      >
                        Add availability
                      </Link>
                    }
                  />
                )}
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <div className="section-header-row">
                  <div>
                    <h2>Upcoming calls</h2>
                    <p className="meta">Stay close to what is already on the calendar.</p>
                  </div>
                </div>
                <div className="list">
                  {data.upcomingCalls.length ? (
                    data.upcomingCalls.map((call) => (
                      <div className="list-item call-list-item" key={call.id}>
                        <div className="stack-sm">
                          <Link href={`/calls/${call.id}` as Route}>
                            <p>{call.title}</p>
                          </Link>
                          <p className="meta">
                            {formatDateTime(call.scheduled_start, timezone)} to{" "}
                            {formatDateTime(call.scheduled_end, timezone)}
                          </p>
                          <p className="meta">{call.reminder_label}</p>
                          {call.meeting_url ? (
                            <p className="meta">
                              {call.meeting_provider ?? "Join link"} is ready for the circle.
                            </p>
                          ) : null}
                          {call.needs_join_link_prompt ? (
                            <p className="form-message">
                              This call is coming up soon. Add a join link so everyone knows
                              where to gather.
                            </p>
                          ) : null}
                          {call.show_recovery_prompt ? (
                            <p className="form-message">
                              Did this call happen? Close it out so your Family Connections
                              counters stay honest.
                            </p>
                          ) : null}
                          {call.show_recovery_prompt ? (
                            <div className="recovery-panel">
                              <p>Missed-call recovery</p>
                              <MissedCallRecoveryActions
                                callId={call.id}
                                familyCircleId={data.circle.id}
                                returnPath="/dashboard"
                                suggestedStart={call.suggested_reschedule_start}
                                suggestedEnd={call.suggested_reschedule_end}
                              />
                            </div>
                          ) : null}
                          <CallLinkForm
                            callId={call.id}
                            familyCircleId={data.circle.id}
                            title={call.title}
                            meetingProvider={call.meeting_provider}
                            meetingUrl={call.meeting_url}
                            submitLabel="Quick save"
                          />
                        </div>
                        <div className="call-actions">
                          <span className="badge">
                            {call.show_recovery_prompt
                              ? "Needs follow-up"
                              : call.actual_started_at
                                ? "Call active"
                                : "Scheduled"}
                          </span>
                          {call.meeting_url ? (
                            <Link
                              className="button"
                              href={`/calls/${call.id}/join` as Route}
                              rel="noreferrer noopener"
                              target="_blank"
                            >
                              Join call
                            </Link>
                          ) : (
                            <span className="meta">Add a join link before call time.</span>
                          )}
                          <Link
                            className="button button-secondary"
                            href={`/calls/${call.id}/calendar` as Route}
                          >
                            Add to calendar
                          </Link>
                          <Link
                            className="button button-secondary"
                            href={`/calls/${call.id}` as Route}
                          >
                            Open call
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No call on the books yet"
                      description="Use the overlap suggestions below to protect your next Moment Shared while everyone’s availability is fresh."
                    />
                  )}
                </div>
              </div>
            </Card>

            <Suspense fallback={<div className="ai-suggestion-skeleton" />}>
              <AICallSuggestion
                familyCircleId={data.circle.id}
                suggestions={data.suggestions}
                timezone={data.viewerTimezone}
                userId={user.id}
              />
            </Suspense>

            <Card>
              <div className="stack-md">
                <div className="section-header-row">
                  <div>
                    <h2>Best times to connect</h2>
                    <p className="meta">
                      We found the strongest upcoming shared windows for the next 7 days.
                    </p>
                  </div>
                </div>
                <div className="list">
                  {data.suggestions.length ? (
                    data.suggestions.map((suggestion) => (
                      <div className="list-item suggestion-item" key={suggestion.start_at}>
                        <div className="stack-sm">
                          <div className="suggestion-heading">
                            <p>{suggestion.label}</p>
                            <span className="badge">{suggestion.overlap_strength_label}</span>
                          </div>
                          <p className="meta">
                            {formatDateTimeRange(
                              suggestion.start_at,
                              suggestion.end_at,
                              timezone
                            )}
                          </p>
                          <p className="meta">{suggestion.rationale}</p>
                          <p className="meta">
                            Family-ready: {suggestion.participant_names.join(", ")}
                            {suggestion.participant_count > suggestion.participant_names.length
                              ? ` and ${suggestion.participant_count - suggestion.participant_names.length} more`
                              : ""}
                          </p>
                        </div>
                        <form action={scheduleSuggestedCallAction} className="suggestion-form">
                          <input name="familyCircleId" type="hidden" value={data.circle.id} />
                          <input
                            name="scheduledStart"
                            type="hidden"
                            value={suggestion.start_at}
                          />
                          <input name="scheduledEnd" type="hidden" value={suggestion.end_at} />
                          <input
                            className="suggestion-title-input"
                            defaultValue="Family Connections call"
                            name="title"
                            placeholder="Sunday family catch-up"
                          />
                          <button className="button button-secondary" type="submit">
                            Schedule {suggestion.duration_minutes} min
                          </button>
                        </form>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="Moments waiting to happen need a little more overlap"
                      description="Kynfowk needs at least two active family members with shared availability in the next 7 days to surface a family-ready window."
                      action={
                        <Link className="button button-secondary" href={"/availability" as Route}>
                          Update your availability
                        </Link>
                      }
                    />
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <h2>Recently completed calls</h2>
                <div className="list">
                  {data.completedCalls.length ? (
                    data.completedCalls.map((call) => (
                      <div className="list-item" key={call.id}>
                        <div>
                          <Link href={`/calls/${call.id}` as Route}>
                            <p>{call.title}</p>
                          </Link>
                          <p className="meta">
                            {formatDateTime(call.scheduled_start, timezone)} • {call.attended_count} joined
                          </p>
                        </div>
                        <span className="badge">
                          {call.actual_duration_minutes ?? 0} min logged
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No completed calls yet"
                      description="Once your first family call wraps, this area becomes a living memory of Time Together."
                    />
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div className="dashboard-main">
            <Card>
              <div className="stack-md">
                <h2>Pilot support</h2>
                <p className="meta">
                  Need a quick refresher or want to tell us what felt off? Both are one step away.
                </p>
                <div className="call-actions">
                  <a className="button button-secondary" href="/getting-started">
                    Getting started
                  </a>
                  <a className="button button-secondary" href="/feedback?page=%2Fdashboard">
                    Share feedback
                  </a>
                </div>
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <h2>Post-call summary</h2>
                {data.latestRecap ? (
                  <>
                    <div className="recap-header">
                      <div>
                        <p>{data.latestRecap.title}</p>
                        <p className="meta">
                          {formatDateTime(data.latestRecap.scheduledStart, timezone)} •{" "}
                          {data.latestRecap.actualDurationMinutes} minutes
                        </p>
                      </div>
                      {params?.recap === data.latestRecap.callId ? (
                        <span className="badge">Needs recap</span>
                      ) : null}
                    </div>
                    <PostCallSummaryForm
                      familyCircleId={data.circle.id}
                      recap={data.latestRecap}
                    />
                  </>
                ) : (
                  <EmptyState
                    title="Nothing to recap yet"
                    description="After a call is marked complete, this card becomes the place to capture what mattered and what comes next."
                  />
                )}
              </div>
            </Card>

            <Card>
              <NotificationInbox
                notifications={data.inbox.notifications}
                unreadCount={data.inbox.unreadCount}
                timezone={timezone}
              />
            </Card>

            <Card>
              <div className="stack-md">
                <h2>Notification rhythm</h2>
                <p className="meta">
                  Choose how Kynfowk should nudge your family, from inbox notes to quieter
                  email follow-through.
                </p>
                <NotificationPreferencesForm preferences={data.notificationPreferences} />
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <h2>Recent family activity</h2>
                <div className="list">
                  {data.recentActivity.length ? (
                    data.recentActivity.map((activity) => (
                      <div className="list-item" key={activity.id}>
                        <div>
                          <p>{activity.summary}</p>
                          <p className="meta">{formatDateTime(activity.createdAt, timezone)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="Activity will appear here"
                      description="Invites, scheduled calls, and saved recaps will build a clear timeline for the whole Family Circle."
                    />
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <h2>Family members</h2>
                <div className="list">
                  {data.memberships.length ? (
                    data.memberships.map((member) => (
                      <div className="list-item" key={member.id}>
                        <div>
                          <p>{member.display_name}</p>
                          <p className="meta">{member.invite_email ?? "Pending invite details"}</p>
                        </div>
                        <span className="badge">
                          {member.status === "active" ? "Joined" : "Invited"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No family members added yet"
                      description="Add the first few people who should be part of this Family Circle."
                    />
                  )}
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
