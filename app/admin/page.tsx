import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminInviteRescue } from "@/components/admin-invite-rescue";
import { AdminSweepForm } from "@/components/admin-sweep-form";
import { AdminTestingToolkit } from "@/components/admin-testing-toolkit";
import { Card } from "@/components/card";
import { getAdminAnalyticsData, getAdminInviteRescueData, requireViewer } from "@/lib/data";
import { getAdminEmails, hasSupabaseServiceRoleEnv, isAdminEmail } from "@/lib/env";
import { formatDateTime } from "@/lib/utils";

export default async function AdminPage() {
  const user = await requireViewer();

  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  if (!hasSupabaseServiceRoleEnv()) {
    redirect("/settings" as Route);
  }

  const [data, inviteRescueItems] = await Promise.all([
    getAdminAnalyticsData(user.id),
    getAdminInviteRescueData()
  ]);
  const configuredAdmins = getAdminEmails();

  return (
    <main className="page-shell">
      <div className="container stack-lg">
        <section className="dashboard-hero">
          <div className="stack-md">
            <span className="eyebrow">Internal admin</span>
            <h1>See how Kynfowk is holding up before family testing widens.</h1>
            <p className="lede">
              This view is read-only and operator-facing. It is meant to catch adoption,
              follow-through, and reliability signals before the product meets more real families.
            </p>
          </div>

          <Card className="hero-summary-card">
            <p className="stat-label">Access and readiness</p>
            <p className="highlight-value">
              {hasSupabaseServiceRoleEnv() ? "Admin ready" : "Needs service role"}
            </p>
            <p className="meta">
              Signed in as {data.viewerEmail ?? "unknown"}. {configuredAdmins.length} admin
              email{configuredAdmins.length === 1 ? "" : "s"} configured.
            </p>
            <div className="pill-row compact-pills">
              <Link className="button button-secondary" href="/dashboard">
                Back to dashboard
              </Link>
            </div>
          </Card>
        </section>

        <section className="stats-grid">
          <Card className="counter-card">
            <p className="stat-label">Family circles</p>
            <p className="stat-value">{data.snapshot.totalFamilyCircles}</p>
          </Card>
          <Card className="counter-card">
            <p className="stat-label">Active members</p>
            <p className="stat-value">{data.snapshot.activeMembers}</p>
          </Card>
          <Card className="counter-card">
            <p className="stat-label">Pending invites</p>
            <p className="stat-value">{data.snapshot.pendingInvites}</p>
          </Card>
          <Card className="counter-card">
            <p className="stat-label">Scheduled calls</p>
            <p className="stat-value">{data.snapshot.scheduledCalls}</p>
          </Card>
          <Card className="counter-card">
            <p className="stat-label">Completed calls</p>
            <p className="stat-value">{data.snapshot.completedCalls}</p>
          </Card>
          <Card className="counter-card">
            <p className="stat-label">Completion rate</p>
            <p className="stat-value">{data.snapshot.completionRate}%</p>
          </Card>
          <Card className="counter-card">
            <p className="stat-label">Recovery actions</p>
            <p className="stat-value">{data.snapshot.missedCallRecoveryActions}</p>
          </Card>
          <Card className="counter-card">
            <p className="stat-label">Push opt-ins</p>
            <p className="stat-value">{data.snapshot.pushOptIns}</p>
          </Card>
          <Card className="counter-card">
            <p className="stat-label">Email-enabled users</p>
            <p className="stat-value">{data.snapshot.emailEnabledUsers}</p>
          </Card>
          <Card className="counter-card">
            <p className="stat-label">Avg attendees</p>
            <p className="stat-value">{data.snapshot.averageAttendeesPerCompletedCall}</p>
          </Card>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-main">
            <Card>
              <div className="stack-md">
                <h2>Pilot ops</h2>
                <p className="meta">
                  Internal-only tools for running a live pilot without changing the family-facing
                  product.
                </p>
                <AdminSweepForm />
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <h2>Super-admin testing toolkit</h2>
                <p className="meta">
                  Calls the same /api/admin/* endpoints the native app uses. Requires
                  the viewer&apos;s profile to have <code>is_super_admin = true</code>; flip the
                  flag in the Supabase SQL editor to bootstrap.
                </p>
                <AdminTestingToolkit />
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <h2>Invite rescue</h2>
                <p className="meta">
                  Users listed here were invited to a Family Circle but signed up via a different
                  path and were not automatically connected. Rescuing them claims the pending invite
                  for their existing account.
                </p>
                <AdminInviteRescue items={inviteRescueItems} />
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <h2>Pilot funnel</h2>
                <div className="list">
                  {data.funnel.map((item) => (
                    <div className="list-item" key={item.eventName}>
                      <div>
                        <p>{item.eventName.replaceAll("_", " ")}</p>
                      </div>
                      <span className="badge">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="dashboard-main">
            <Card>
              <div className="stack-md">
                <h2>High-priority friction signals</h2>
                <div className="list">
                  {data.frictionSignals.length ? (
                    data.frictionSignals.map((signal) => (
                      <div className="list-item" key={signal.title}>
                        <div>
                          <p>{signal.title}</p>
                          <p className="meta">{signal.detail}</p>
                        </div>
                        <span className="badge">
                          {signal.severity === "warning" ? "Needs review" : "Watch"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="meta">
                      No urgent friction signals are standing out right now.
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <div className="stack-md">
                <h2>Recent pilot feedback</h2>
                <div className="list">
                  {data.recentFeedback.length ? (
                    data.recentFeedback.map((item) => (
                      <div className="list-item" key={item.id}>
                        <div className="stack-sm">
                          <div className="call-actions">
                            <p>{item.category}</p>
                            <span className="badge">{item.pagePath ?? "No page context"}</span>
                          </div>
                          <p className="meta">{item.message}</p>
                          <p className="microcopy">{formatDateTime(item.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="meta">No pilot feedback has been submitted yet.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-main">
            <Card>
              <div className="stack-md">
                <h2>Delivery issues</h2>
                <div className="list">
                  {data.deliveryIssues.length ? (
                    data.deliveryIssues.map((issue) => (
                      <div className="list-item" key={issue.id}>
                        <div className="stack-sm">
                          <div className="call-actions">
                            <p>{issue.notificationTitle ?? "Notification delivery"}</p>
                            <span className="badge">
                              {issue.channel} / {issue.status}
                            </span>
                          </div>
                          <p className="meta">
                            {issue.errorMessage ?? "No provider detail was saved for this delivery."}
                          </p>
                          <p className="microcopy">
                            {issue.recipient ?? "No recipient saved"} /{" "}
                            {formatDateTime(issue.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="meta">No recent failed or skipped deliveries are waiting here.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div className="dashboard-main">
            <Card>
              <div className="stack-md">
                <h2>Common testing scenarios</h2>
                <div className="list">
                  <div className="list-item">
                    <div>
                      <p>New family setup</p>
                      <p className="meta">
                        Use Getting started, Family management, and Availability to walk a fresh
                        pilot family through the first call path.
                      </p>
                    </div>
                    <Link
                      className="button button-secondary"
                      href={"/getting-started" as Route}
                    >
                      Open guide
                    </Link>
                  </div>
                  <div className="list-item">
                    <div>
                      <p>Reminder delivery checks</p>
                      <p className="meta">
                        Trigger the sweep manually here, then inspect failed and skipped deliveries
                        alongside notification preferences.
                      </p>
                    </div>
                    <Link className="button button-secondary" href={"/notifications" as Route}>
                      Open notifications
                    </Link>
                  </div>
                  <div className="list-item">
                    <div>
                      <p>Qualitative pilot feedback</p>
                      <p className="meta">
                        Ask the family to use the in-app feedback flow from the page where they got
                        stuck, then review their note here.
                      </p>
                    </div>
                    <Link
                      className="button button-secondary"
                      href={{ pathname: "/feedback", query: { page: "/admin" } }}
                    >
                      Open feedback form
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <Card>
          <div className="stack-md">
            <div className="section-header-row">
              <div>
                <h2>Pilot circle checklist</h2>
                <p className="meta">
                  A simple operator view of which circles have crossed the key early milestones.
                </p>
              </div>
            </div>
            <div className="list">
              {data.circleSummaries.length ? (
                data.circleSummaries.map((circle) => (
                  <div className="list-item" key={circle.id}>
                    <div className="stack-sm admin-circle-summary">
                      <div className="section-header-row">
                        <div>
                          <p>{circle.name}</p>
                          <p className="meta">
                            {circle.activeMembers} active / {circle.pendingInvites} pending /{" "}
                            {circle.availabilityMembers} with availability / {circle.pushEnabledMembers} with push
                          </p>
                        </div>
                        <span className="badge">
                          {circle.completedCalls} completed / {circle.scheduledCalls} upcoming
                        </span>
                      </div>
                      <div className="metric-row">
                        <span className="pill">
                          {circle.checklist.onboardingComplete ? "Onboarding" : "Needs onboarding"}
                        </span>
                        <span className="pill">
                          {circle.checklist.inviteClaimed ? "Invite claimed" : "Invite pending"}
                        </span>
                        <span className="pill">
                          {circle.checklist.availabilitySet ? "Availability set" : "Need availability"}
                        </span>
                        <span className="pill">
                          {circle.checklist.firstCallScheduled ? "Call scheduled" : "No call yet"}
                        </span>
                        <span className="pill">
                          {circle.checklist.firstCallCompleted ? "Call completed" : "Awaiting completion"}
                        </span>
                        <span className="pill">
                          {circle.checklist.pushEnabled ? "Push enabled" : "No push yet"}
                        </span>
                        <span className="pill">
                          {circle.checklist.feedbackReceived ? "Feedback received" : "No feedback yet"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="meta">No family circles have been created yet.</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
